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
	useActionData,
	useFetcher,
	useLoaderData,
} from '@remix-run/react'
import { LoaderCircle, Sidebar as SidebarIcon } from 'lucide-react'
import React from 'react'
import { useSpinDelay } from 'spin-delay'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import InputDrag from '#app/components/input-with-drag.js'
import { Button } from '#app/components/ui/button.js'
import { Card } from '#app/components/ui/card.js'
import { Checkbox } from '#app/components/ui/checkbox.js'
import { Input } from '#app/components/ui/input.js'
import { Label } from '#app/components/ui/label.js'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import {
	BuildingDimensions,
	CustomInputLookupTable,
	CustomVariableLookupTable,
	PriceLookupTable,
	TakeOffApi,
	createDummyBuildingDimensions,
} from '#app/lib/takeoff'
import { type TakeoffCustomInput } from '#app/lib/takeoff/custom-user-input.js'
import { executeTakeoffCode } from '#app/lib/takeoff/execute.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import SidebarCompoment from './__sidebar'

// export { action } from './__estimation-editor.server.tsx'

export const handle = {
	breadcrumb: 'Edit',
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	invariantResponse(params.estimateId, 'Not found', { status: 404 })

	const estimate = await prisma.estimate.findFirst({
		select: {
			name: true,
			formData: true,
			model: {
				select: {
					id: true,
					inputs: true,
				},
			},
		},
		where: {
			id: params.estimateId,
			ownerId: userId,
			OR: [{ model: null }, { model: { ownerId: userId } }],
		},
	})

	invariantResponse(estimate, 'Not found', { status: 404 })

	const models = await prisma.takeoffModel.findMany({
		select: {
			id: true,
			name: true,
		},
		where: {
			ownerId: userId,
		},
	})

	if (!estimate.model) {
		return json({ estimate, models })
	}

	if (estimate) {
		const formDefaultsMap = new Map(
			estimate.formData.map(input => [input.name, input.value]),
		)

		estimate.model.inputs = estimate.model.inputs.map(input => {
			const updatedValue = formDefaultsMap.get(input.name)
			if (updatedValue) {
				input.defaultValue = updatedValue
			}
			return input
		})
	}

	return json({ estimate, models })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const estimateId = params.estimateId
	invariantResponse(estimateId, 'Not found', { status: 404 })
	const estimate = await prisma.estimate.findUnique({
		where: { id: estimateId, ownerId: userId },
		select: { id: true, takeoffModelId: true },
	})
	invariantResponse(estimate, 'Not found', { status: 404 })
	const formData = await request.formData()

	const intent = formData.get('intent') as string

	switch (intent) {
		case 'submit-takeoff-values':
			return submitTakeoffValues(estimateId, estimate.takeoffModelId, userId, formData)
		case 'update-name':
			return updateTakeoffModelName(estimateId, userId, formData)
		case 'update-takeoff-model':
			return updateTakeoffModel(estimateId, userId, formData)
		default:
			return null
	}
}

async function submitTakeoffValues(estimateId: string, takeoffModelId: string | null, userId: string, formData: FormData) {
	invariantResponse(takeoffModelId, 'Select a takeoff model', { status: 400 })
	const takeoffModel = await prisma.takeoffModel.findFirst({
		where: { id: takeoffModelId, ownerId: userId },
		include: {
			inputs: true,
			variables: true,
		},
	})

	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	const buildingDimensions = BuildingDimensions.fromObject(
		createDummyBuildingDimensions(),
	)
	const inputsLookupTable = new CustomInputLookupTable(takeoffModel.inputs)
	inputsLookupTable.addFormData(formData)
	const variablesLookupTable = new CustomVariableLookupTable(
		takeoffModel.variables,
	)
	const prices = new PriceLookupTable([] as any)

	const takeoffApi = new TakeOffApi({
		id: takeoffModel.id,
		bd: buildingDimensions,
		prices,
		inputs: inputsLookupTable,
		variables: variablesLookupTable,
	})

	try {
		await executeTakeoffCode(takeoffModel.code, takeoffApi)
	} catch (error) {
		return json({
			result: error instanceof Error ? error.message : 'Calculation failed',
			sections: [],
		})
	}

	const results = takeoffApi
		.getSections()
		.map(section => {
			return section.parts.map(part => {
				return {
					name: part.name,
					priceLookupKey: part.priceLookupKey,
					qty: part.qty,
					pricePerUnit: part.pricePerUnit,
					total: part.total,
					currency: part.currency,
					section: section.name,
				}
			})
		})
		.flat()

	const updatedFormData = takeoffApi.inputs.getLookupHistory().map(input => {
		return {
			name: input.name,
			value: input.defaultValue,
			type: input.type,
		}
	})

	await prisma.estimate.update({
		where: { id: estimateId, ownerId: userId },
		data: {
			results: {
				upsert: results.map(result => {
					return {
						where: { estimateId_name: { estimateId, name: result.name } },
						create: result,
						update: result,
					}
				}),
			},
			formData: {
				upsert: updatedFormData.map(input => {
					return {
						where: { estimateId_name: { estimateId, name: input.name } },
						create: input,
						update: input,
					}
				}),
			},
		},
	})

	return redirect(`/estimates/${estimateId}`)
}

export default function TakeoffInputSheet() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const [open, setOpen] = React.useState(false)

	const Sidebar = (
		<SidebarCompoment
			title="Configuration"
			description="Configure the takeoff model."
			open={open}
			onOpenChange={setOpen}
		>
			<SidebarContent
				models={data?.models}
				selectedModelId={data.estimate?.model?.id as string}
			/>
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
						<SidebarIcon />
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
					<SidebarIcon />
				</Button>
				<EditName name={data.estimate?.name} />
				<Form method="post">
					<div className="m-auto max-w-2xl space-y-4">
						<div className="text-red-500">{actionData?.result}</div>
						{data.estimate.model.inputs.map(input => (
							<RenderInput key={input.id} input={input} />
						))}
						<Button name="intent" value="submit-takeoff-values">
							Submit
						</Button>
					</div>
				</Form>
			</div>
			{Sidebar}
		</>
	)
}

async function updateTakeoffModelName(estimateId: string, userId: string, formData: FormData) {
	const name = formData.get('name') as string
	await prisma.estimate.update({
		where: { id: estimateId, ownerId: userId },
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

	const inputRef = React.useRef<HTMLInputElement>(null)

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault()

		// Blur the input element when the form is submitted
		inputRef.current?.blur()

		// Submit the form
		fetcher.submit(event.currentTarget as HTMLFormElement)
	}

	return (
		<fetcher.Form method="post" onSubmit={handleSubmit}>
			<input type="hidden" name="intent" value="update-name" />
			<Card className="m-auto flex max-w-2xl items-center justify-between">
				<Input
					ref={inputRef}
					name="name"
					defaultValue={name}
					autoComplete="off"
					className="border-none text-2xl font-bold"
				/>
				{isSaving && <LoaderCircle className="animate-spin" />}
			</Card>
		</fetcher.Form>
	)
}

type RenderInputProps = {
	input: TakeoffCustomInput
}

function RenderInput({ input }: RenderInputProps) {
	const inputType = input.type === 'string' ? 'text' : input.type

	if (input.type === 'boolean') {
		return (
			<div className="flex items-center space-x-2">
				<Checkbox
					id={input.id}
					name={input.name}
					defaultChecked={JSON.parse(input.defaultValue) as boolean}
				/>
				<label
					htmlFor="terms"
					className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					{input.label}
				</label>
			</div>
		)
	}

	if (input.type === 'number') {
		return (
			<InputDrag
				min='0'
				label={input.label}
				name={input.name}
				defaultValue={input.defaultValue}
			/>
		)
	}

	return (
		<div>
			<Label>
				{input.label}
				<Input type={inputType} defaultValue={input.defaultValue} />
			</Label>
		</div>
	)
}

async function updateTakeoffModel(estimateId: string, userId: string, formData: FormData) {
	const takeoffModelId = formData.get('takeoffModelId') as string
	invariantResponse(takeoffModelId, 'Select a takeoff model', { status: 400 })
	const model = await prisma.takeoffModel.findUnique({
		where: { id: takeoffModelId, ownerId: userId },
		select: { id: true },
	})
	invariantResponse(model, 'Not found', { status: 404 })
	await prisma.estimate.update({
		where: { id: estimateId, ownerId: userId },
		data: {
			takeoffModelId,
		},
	})

	return redirect(`/estimates/${estimateId}/edit`)
}

type SidebarContentProps = {
	models: Array<{ id: string; name: string }>
	selectedModelId: string
}

function SidebarContent({ models, selectedModelId }: SidebarContentProps) {
	const [value, setValue] = React.useState(selectedModelId)

	return (
		<Form method="post" className="space-y-4">
			<Select name="takeoffModelId" value={value} onValueChange={setValue}>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Select a model">
						{models.find(model => model.id === value)?.name}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{models.map(model => (
							<SelectItem key={model.id} value={model.id}>
								{model.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<Button name="intent" value="update-takeoff-model">
				Update
			</Button>
		</Form>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No estimate with the id "{params.estimateId}" exists</p>
				),
			}}
		/>
	)
}
