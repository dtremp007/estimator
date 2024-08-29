import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	redirect,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { Calculator, EditIcon, LoaderCircle, Users } from 'lucide-react'
import React from 'react'
import { useSpinDelay } from 'spin-delay'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { SidebarLayout } from '#app/components/sidebar-layout.js'
import { Button } from '#app/components/ui/button.js'
import { Checkbox } from '#app/components/ui/checkbox.js'
import { ScrollArea } from '#app/components/ui/scroll-area.js'
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from '#app/components/ui/tabs'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	listPricelists,
	listTakeoffModels,
	logUserAction,
} from '#app/utils/entities.server.js'
import { requireUserWithPermission } from '#app/utils/permissions.server.js'
import {
	runAndSaveTakeoffModel,
	runTakeoffModelSaveResults,
} from '#app/utils/takeoff-model.server.js'
import { RenderInput } from './__render-input'

export const handle = {
	breadcrumb: 'Edit',
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const estimate = await prisma.estimate.findFirst({
		select: {
			name: true,
			formData: true,
			model: {
				select: {
					id: true,
					code: true,
					inputs: true,
					variables: true,
				},
			},
			prices: {
				select: {
					id: true,
					items: {
						select: {
							id: true,
							name: true,
							unitType: true,
							category: true,
							currency: true,
							pricePerUnit: true,
						},
					},
				},
			},
		},
		where: {
			id: params.estimateId,
		},
	})

	invariantResponse(estimate, 'Not found', { status: 404 })

	const [models, pricelists] = await Promise.all([
		listTakeoffModels(userId),
		listPricelists(userId),
	])

	if (!estimate.model) {
		return json({
			estimate: {
				...estimate,
				model: null,
			},
			models,
			pricelists,
		})
	}

	const { takeoffModel, logs } = await runAndSaveTakeoffModel(
		estimate.model,
		estimate.prices,
		estimate.formData.reduce((acc, input) => {
			acc.set(input.name, input.value)
			return acc
		}, new FormData()),
	)

	return json({
		estimate: {
			name: estimate.name,
			model: takeoffModel,
			prices: estimate.prices,
		},
		models,
		pricelists,
		logs,
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()
	const estimateId = params.estimateId
	invariantResponse(estimateId, 'Not found', { status: 404 })

	const intent = formData.get('intent') as string

	switch (intent) {
		case 'submit-takeoff-values':
			return submitTakeoffValues(request, estimateId, formData)
		case 'update-name':
			return updateTakeoffModelName(estimateId, formData)
		case 'apply-takeoff-configurations':
			return applyConfigurations(estimateId, formData)
		default:
			return null
	}
}

async function submitTakeoffValues(
	request: Request,
	estimateId: string,
	formData: FormData,
) {
	const start = performance.now()
	const estimate = await prisma.estimate.findFirst({
		select: {
			id: true,
			model: {
				select: {
					id: true,
					code: true,
					inputs: true,
					variables: true,
				},
			},
			prices: {
				select: {
					id: true,
					items: {
						select: {
							id: true,
							name: true,
							unitType: true,
							category: true,
							currency: true,
							pricePerUnit: true,
						},
					},
				},
			},
		},
		where: {
			id: estimateId,
		},
	})
	invariantResponse(estimate, 'Not found', { status: 404 })
	const { userId } = await requireUserWithPermission(
		request,
		'write:estimate',
		estimate,
	)

	const takeoffModel = estimate?.model
	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	await runTakeoffModelSaveResults(
		estimateId,
		takeoffModel,
		estimate.prices,
		formData,
	)

	logUserAction({
		userId,
		action: 'submit-takeoff-values',
		entityId: estimateId,
		entity: 'estimate',
		duration: performance.now() - start,
	})

	return redirect(`/estimates/${estimateId}`)
}

export default function TakeoffInputSheet() {
	const data = useLoaderData<typeof loader>()

	const MissingTakeoffModel = () => {
		return (
			<div className="flex flex-col items-center gap-4">
				<div className="text-center">No takeoff model found</div>
				<Button className="m-auto" asChild>
					<Link to="/takeoff-models/new">Setup one up</Link>
				</Button>
			</div>
		)
	}

	return (
		<SidebarLayout
			title="Configuration"
			description="Configure the takeoff model."
			sidebarContent={<SidebarContent />}
		>
			<div className="m-auto mb-20 mt-16 max-w-2xl px-4">
				<EditName name={data.estimate?.name} />
				{!data.estimate.model ? (
					<MissingTakeoffModel />
				) : (
					<Form method="post">
						<div className="space-y-4">
							{data.estimate.model.inputs.map(input => (
								<RenderInput key={input.id} input={input} />
							))}
							<div className="flex w-full justify-end">
								<Button
									name="intent"
									value="submit-takeoff-values"
									className="flex items-center gap-3"
								>
									Calculate
									<Calculator size={16} />
								</Button>
							</div>
						</div>
					</Form>
				)}
			</div>
		</SidebarLayout>
	)
}

async function updateTakeoffModelName(estimateId: string, formData: FormData) {
	const name = formData.get('name') as string
	await prisma.estimate.update({
		where: { id: estimateId },
		data: { name },
	})

	return null
}

function EditName({ name }: { name?: string }) {
	const fetcher = useFetcher()
	const isSaving = useSpinDelay(fetcher.state === 'submitting', {
		minDuration: 300,
		delay: 0,
	})
	const [searchParams] = useSearchParams()

	const inputRef = React.useRef<HTMLInputElement>(null)

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault()

		// Blur the input element when the form is submitted
		inputRef.current?.blur()

		// Submit the form
		fetcher.submit(event.currentTarget as HTMLFormElement)
	}

	return (
		<fetcher.Form
			method="post"
			onSubmit={handleSubmit}
			className="m-auto flex max-w-2xl items-center justify-between"
		>
			<input type="hidden" name="intent" value="update-name" />
			<input
				ref={inputRef}
				name="name"
				defaultValue={name}
				autoComplete="off"
				autoFocus={searchParams.has('focusNameInput')}
				className="border-none bg-transparent px-0 text-2xl font-bold focus:outline-none focus:ring-0"
			/>
			{isSaving && <LoaderCircle className="mr-4 animate-spin" />}
		</fetcher.Form>
	)
}

async function applyConfigurations(estimateId: string, formData: FormData) {
	const takeoffModelId = formData.get('takeoffModelId') as string
	const pricelistIds = formData.getAll('pricelistId') as string[]

	await prisma.estimate.update({
		where: { id: estimateId },
		data: {
			takeoffModelId,
			prices: {
				set: [],
				connect: pricelistIds.map(pricelistId => ({ id: pricelistId })),
			},
		},
	})

	return redirect(`/estimates/${estimateId}/edit`)
}

function SidebarContent() {
	const data = useLoaderData<typeof loader>()
	const fetcher = useFetcher()
	const isSaving = useSpinDelay(fetcher.state === 'submitting', {
		minDuration: 300,
		delay: 0,
	})

	return (
		<ScrollArea className="pb-4 pr-4 md:h-[calc(100vh-152px)]">
			<fetcher.Form method="post" className="space-y-4">
				<Tabs defaultValue="takeoff-models">
					<TabsList>
						<TabsTrigger value="takeoff-models">Takeoff Models</TabsTrigger>
						<TabsTrigger value="pricelists">Pricelists</TabsTrigger>
					</TabsList>
					<TabsContent value="takeoff-models">
						<div className="mt-4 flex flex-col gap-4 px-2">
							{data.models.map(model => (
								<div
									key={model.id}
									className="pointer-events-auto max-w-sm cursor-pointer rounded-lg border border-border bg-background p-4 pt-2 text-[0.8125rem] leading-5 ring-ring transition-colors duration-100 ease-out hover:bg-muted/20 has-[:checked]:ring-2"
									onClick={e =>
										(
											e.currentTarget?.querySelector(
												`#${model.id}`,
											) as HTMLInputElement
										)?.click()
									}
								>
									<div className="flex items-center justify-between">
										<div className="font-medium text-foreground">
											{model.name}
										</div>
										<input
											id={model.id}
											type="radio"
											name="takeoffModelId"
											value={model.id}
											className="peer sr-only"
											defaultChecked={data.estimate?.model?.id === model.id}
										/>

										<svg
											className="ml-auto h-5 w-5 flex-none opacity-0 transition-opacity duration-300 ease-out peer-checked:opacity-100"
											fill="none"
										>
											<path
												fill-rule="evenodd"
												clip-rule="evenodd"
												d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z"
												fill="currentColor"
											></path>
										</svg>
									</div>
									<p className="text-muted-foreground">{`Created by ${model.ownerName}`}</p>
								</div>
							))}
							<Button asChild variant="secondary">
								<Link
									to={{
										pathname: `/takeoff-models/${data.estimate.model?.id}/code`,
										search: new URLSearchParams({
											goBackButton: 'Go back to estimate',
										}).toString(),
									}}
								>
									Edit Code
									<EditIcon size={16} className="ml-3 inline-block" />
								</Link>
							</Button>
						</div>
					</TabsContent>
					<TabsContent value="pricelists">
						<div className="space-y-4">
							{data.pricelists.map(pricelist => (
								<div className="flex space-x-3" key={pricelist.id}>
									<div className="flex h-6 items-center">
										<Checkbox
											id={pricelist.id}
											name="pricelistId"
											value={pricelist.id}
											defaultChecked={data.estimate.prices.some(
												price => price.id === pricelist.id,
											)}
										/>
									</div>
									<div>
										<label
											htmlFor={pricelist.id}
											className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											{pricelist.name}
											{pricelist.isShared && (
												<Users size={16} className="ml-3 inline-block" />
											)}
											<p className="text-sm font-medium leading-none text-muted-foreground">
												{pricelist.supplier}
											</p>
										</label>
									</div>
								</div>
							))}
						</div>
					</TabsContent>
				</Tabs>
				<div className="flex w-full justify-end pb-4">
					<Button
						name="intent"
						value="apply-takeoff-configurations"
						disabled={isSaving}
						className="flex items-center gap-2"
					>
						Apply
						{isSaving && <LoaderCircle className="animate-spin" />}
					</Button>
				</div>
			</fetcher.Form>
		</ScrollArea>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
