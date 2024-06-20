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
import {
	Calculator,
	EditIcon,
	LoaderCircle,
	Settings,
	Users,
} from 'lucide-react'
import React from 'react'
import { useSpinDelay } from 'spin-delay'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Button } from '#app/components/ui/button.js'
import { Checkbox } from '#app/components/ui/checkbox.js'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	listPricelists,
	listTakeoffModels,
} from '#app/utils/entities.server.js'
import {
	runAndSaveTakeoffModel,
	runTakeoffModelSaveResults,
} from '#app/utils/takeoff-model.server.js'
import { RenderInput } from './__render-input'
import SidebarCompoment from './__sidebar'

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
			return submitTakeoffValues(estimateId, formData)
		case 'update-name':
			return updateTakeoffModelName(estimateId, formData)
		case 'apply-takeoff-configurations':
			return applyConfigurations(estimateId, formData)
		default:
			return null
	}
}

async function submitTakeoffValues(estimateId: string, formData: FormData) {
	const estimate = await prisma.estimate.findFirst({
		select: {
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

	const takeoffModel = estimate?.model

	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	await runTakeoffModelSaveResults(
		estimateId,
		takeoffModel,
		estimate.prices,
		formData,
	)

	return redirect(`/estimates/${estimateId}`)
}

export default function TakeoffInputSheet() {
	const data = useLoaderData<typeof loader>()
	const [open, setOpen] = React.useState(false)

	const Sidebar = (
		<SidebarCompoment
			title="Configuration"
			description="Configure the takeoff model."
			open={open}
			onOpenChange={setOpen}
		>
			<SidebarContent />
		</SidebarCompoment>
	)

	if (!data.estimate?.model) {
		return (
			<>
				<div className="main relative mb-20 mt-16 px-4">
					<Button
						variant="ghost"
						className="absolute -top-24 right-1"
						onClick={() => setOpen(!open)}
					>
						<Settings />
					</Button>
					<div className="space-y-4">
						<EditName name={data.estimate?.name} />
						<div className="flex flex-col items-center gap-4">
							<div className="text-center">No takeoff model found</div>
							<Button className="m-auto" asChild>
								<Link to="/takeoff-models/new">Setup one up</Link>
							</Button>
						</div>
					</div>
				</div>
				{Sidebar}
			</>
		)
	}

	return (
		<>
			<div className="main relative mb-20 mt-16 px-4">
				<Button
					variant="ghost"
					className="absolute -top-24 right-1"
					onClick={() => setOpen(!open)}
				>
					<Settings />
				</Button>
				<EditName name={data.estimate?.name} />
				<Form method="post">
					<div className="m-auto max-w-2xl space-y-4">
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
			</div>
			{Sidebar}
		</>
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
	const pricelists = formData.getAll('pricelist') as string[]
	console.log(pricelists)
	await prisma.estimate.update({
		where: { id: estimateId },
		data: {
			takeoffModelId,
			prices: {
				set: [],
				connect: pricelists.map(pricelist => ({ id: pricelist })),
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
		<div className="">
			<fetcher.Form method="post" className="space-y-4">
				<div className="flex flex-col gap-4">
					{data.models.map(model => (
						<div
							key={model.id}
							className="pointer-events-auto w-full max-w-sm cursor-pointer rounded-lg border border-border bg-background p-4 pt-2 text-[0.8125rem] leading-5 ring-ring transition-colors duration-100 ease-out hover:bg-muted/20 has-[:checked]:ring-2"
							onClick={e =>
								(
									e.currentTarget?.querySelector(
										`#${model.id}`,
									) as HTMLInputElement
								)?.click()
							}
						>
							<div className="flex items-center justify-between">
								<div className="font-medium text-foreground">{model.name}</div>
								<input
									id={model.id}
									type="radio"
									name="takeoffModelId"
									value={model.id}
									className="peer sr-only"
									defaultChecked={data.estimate?.model?.id === model.id}
								/>
								<Button asChild variant="ghost" size="icon">
									<Link
										to={{
											pathname: `/takeoff-models/${model.id}/code`,
											search: new URLSearchParams({
												goBackButton: 'Go back to estimate',
											}).toString(),
										}}
									>
										<EditIcon size={16} className="inline-block" />
									</Link>
								</Button>
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
				</div>
				<h3 className="text-base font-bold">Pricelists</h3>
				{data.pricelists.map(pricelist => (
					<div className="flex items-center space-x-2" key={pricelist.id}>
						<Checkbox
							id={pricelist.id}
							name="pricelist"
							value={pricelist.id}
							defaultChecked={data.estimate?.prices.some(
								price => price.id === pricelist.id,
							)}
						/>
						<label
							htmlFor={pricelist.id}
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							{pricelist.name}
							{pricelist.isShared && (
								<Users size={16} className="ml-3 inline-block" />
							)}
						</label>
					</div>
				))}
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
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
