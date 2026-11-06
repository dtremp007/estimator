import { invariantResponse } from '@epic-web/invariant'
import { Plus } from 'lucide-react'
import { type editor as MonacoEditor } from 'monaco-editor'
import React from 'react'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	data,
	useLoaderData,
	useSearchParams,
	useSubmit,
} from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.js'
import { SidebarLayout } from '#app/components/sidebar-layout.js'
import { Button } from '#app/components/ui/button.js'
import { NativeSelect } from '#app/components/ui/native-select.js'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '#app/components/ui/tabs.js'
import { takeoffFunctionReference } from '#app/lib/takeoff/function-reference.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { listPricelists } from '#app/utils/entities.server.js'
import { runAndSaveTakeoffModel } from '#app/utils/takeoff-model.server.js'
import { createToastHeaders } from '#app/utils/toast.server.js'
import { ModelCodeEditor } from './__editor'

export const handle = {
	breadcrumb: 'Edit Code',
}

/** Loads a price list's items, only if the user owns it or it is shared with them. */
async function getAccessiblePricelist(userId: string, pricelistId: string) {
	const pricelists = await listPricelists(userId)
	if (!pricelists.some(pricelist => pricelist.id === pricelistId)) return null

	return prisma.pricelist.findUnique({
		where: { id: pricelistId },
		select: {
			id: true,
			items: {
				select: {
					id: true,
					name: true,
					category: true,
					unitType: true,
					pricePerUnit: true,
					currency: true,
				},
				orderBy: { name: 'asc' },
			},
		},
	})
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const takeoffModel = await prisma.takeoffModel.findFirst({
		select: {
			id: true,
			name: true,
			code: true,
		},
		where: {
			id: params.takeoffModelId,
		},
	})
	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	const pricelists = await listPricelists(userId)
	const pricelistId = new URL(request.url).searchParams.get('pricelistId')
	const selectedPricelist = pricelists.find(
		pricelist => pricelist.id === pricelistId,
	)

	const items = selectedPricelist
		? await prisma.pricelistItem.findMany({
				where: { pricelistId: selectedPricelist.id },
				select: { name: true, category: true },
				orderBy: { name: 'asc' },
			})
		: []

	return data({
		takeoffModel,
		pricelists,
		selectedPricelistId: selectedPricelist?.id ?? null,
		priceKeys: items.map(item => item.name),
		categories: Array.from(new Set(items.map(item => item.category))).sort(),
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const id = params.takeoffModelId

	invariantResponse(id, 'Not found', { status: 404 })

	const formData = await request.formData()
	const code = formData.get('code')
	const pricelistId = formData.get('pricelistId')

	if (typeof code !== 'string') {
		return data(
			{
				error: ['Code is required'],
				missingPrices: [] as string[],
			},
			{
				status: 400,
			},
		)
	}

	let takeoffModel = await prisma.takeoffModel.findUnique({
		where: { id, ownerId: userId },
		include: {
			variables: true,
			inputs: true,
		},
	})

	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	// Run against the price list picked in the sidebar, so missing keys can be reported
	const pricelist =
		typeof pricelistId === 'string' && pricelistId
			? await getAccessiblePricelist(userId, pricelistId)
			: null

	const { logs, missingPrices } = await runAndSaveTakeoffModel(
		{ ...takeoffModel, code },
		pricelist ? [pricelist] : [],
	)

	return data(
		{
			error: logs,
			missingPrices: pricelist ? missingPrices : [],
		},
		{
			headers: await createToastHeaders({
				description: 'Code saved successfully',
				type: 'success',
			}),
		},
	)
}

function storageKey(takeoffModelId: string) {
	return `takeoff-editor-pricelist:${takeoffModelId}`
}

export default function Edit() {
	const data = useLoaderData<typeof loader>()
	const editorRef =
		React.useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
	const submit = useSubmit()
	const [searchParams, setSearchParams] = useSearchParams()
	const modelId = data.takeoffModel.id

	const selectPricelist = React.useCallback(
		(pricelistId: string) => {
			try {
				if (pricelistId) {
					localStorage.setItem(storageKey(modelId), pricelistId)
				} else {
					localStorage.removeItem(storageKey(modelId))
				}
			} catch {}
			setSearchParams(
				prev => {
					const next = new URLSearchParams(prev)
					if (pricelistId) next.set('pricelistId', pricelistId)
					else next.delete('pricelistId')
					return next
				},
				{ replace: true, preventScrollReset: true },
			)
		},
		[modelId, setSearchParams],
	)

	// Restore the price list last used with this model in this browser
	React.useEffect(() => {
		if (searchParams.has('pricelistId')) return
		let stored: string | null = null
		try {
			stored = localStorage.getItem(storageKey(modelId))
		} catch {}
		if (stored && data.pricelists.some(p => p.id === stored)) {
			selectPricelist(stored)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [modelId])

	function handleSave(code: string) {
		const formData = new FormData()
		formData.append('code', code)
		if (data.selectedPricelistId) {
			formData.append('pricelistId', data.selectedPricelistId)
		}
		submit(formData, { method: 'post' })
	}

	function insertCode(text: string) {
		const editor = editorRef.current
		if (!editor) return
		const selection = editor.getSelection()
		if (!selection) return
		editor.executeEdits('function-reference', [
			{ range: selection, text, forceMoveMarkers: true },
		])
		editor.focus()
	}

	return (
		<SidebarLayout
			title="Editor tools"
			description="Pick a price list for suggestions and browse the functions you can use."
			// min-w-0 lets the editor shrink when the sidebar opens
			className="min-w-0"
			scrollable={false}
			sidebarContent={
				<Tabs defaultValue="pricelist" className="pb-4 pr-4">
					<TabsList>
						<TabsTrigger value="pricelist">Price list</TabsTrigger>
						<TabsTrigger value="functions">Functions</TabsTrigger>
					</TabsList>
					<TabsContent value="pricelist" className="space-y-4 px-1">
						<NativeSelect
							aria-label="Price list"
							value={data.selectedPricelistId ?? ''}
							onChange={e => selectPricelist(e.currentTarget.value)}
						>
							<option value="">No price list</option>
							{data.pricelists.map(pricelist => (
								<option key={pricelist.id} value={pricelist.id}>
									{pricelist.name}
									{pricelist.supplier ? ` (${pricelist.supplier})` : ''}
								</option>
							))}
						</NativeSelect>
						{data.selectedPricelistId ? (
							<>
								<p className="text-sm text-muted-foreground">
									{data.priceKeys.length} items are suggested for{' '}
									<code>priceLookupKey</code>, <code>getPrice</code> and{' '}
									<code>getCategoryItems</code>. Saving checks the code
									against this price list.
								</p>
								<ul className="scrollbar-subtle -mx-1 max-h-[50vh] space-y-0.5 overflow-y-auto text-sm">
									{data.priceKeys.map(key => (
										<li key={key}>
											<button
												type="button"
												className="w-full rounded px-2 py-1 text-left hover:bg-muted"
												title="Insert at cursor"
												onClick={() => insertCode(JSON.stringify(key))}
											>
												{key}
											</button>
										</li>
									))}
								</ul>
							</>
						) : (
							<p className="text-sm text-muted-foreground">
								Pick a price list to get its item names suggested while you
								type.
							</p>
						)}
					</TabsContent>
					<TabsContent value="functions" className="space-y-3 px-1">
						{takeoffFunctionReference.map(fn => (
							<div
								key={fn.name}
								className="rounded-lg border border-border p-3 text-sm"
							>
								<div className="flex items-start justify-between gap-2">
									<code className="font-semibold">{fn.signature}</code>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 shrink-0 px-2"
										title="Insert example at cursor"
										onClick={() => insertCode(fn.example)}
									>
										<Plus size={14} />
									</Button>
								</div>
								<p className="mt-1 text-muted-foreground">{fn.description}</p>
							</div>
						))}
					</TabsContent>
				</Tabs>
			}
		>
			<ModelCodeEditor
				model={data.takeoffModel}
				priceKeys={data.priceKeys}
				categories={data.categories}
				editorRef={editorRef}
				onSave={handleSave}
			/>
		</SidebarLayout>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
