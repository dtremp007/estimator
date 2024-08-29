import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	Link,
	redirect,
	useFetcher,
	useLoaderData,
	useNavigate,
	useSearchParams,
} from '@remix-run/react'
import { ArrowLeft, Check, LoaderCircle, PlusCircle } from 'lucide-react'
import React from 'react'
import { useSpinDelay } from 'spin-delay'
import BasicTable from '#app/components/basic-table.js'
import { DeleteEntityBtn } from '#app/components/delete-entity-btn.js'
import { GeneralErrorBoundary } from '#app/components/error-boundary.js'
import { Button } from '#app/components/ui/button.js'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import { Input } from '#app/components/ui/input.js'
import { TableCell, TableRow } from '#app/components/ui/table'
import { prisma } from '#app/utils/db.server.js'
import 'highlight.js/styles/a11y-dark.css'
import { formatListTimeAgo } from '#app/utils/misc.js'
import { nameTheThing } from '#app/utils/naming.server.js'
import {
	assignPermissionsToEntity,
	requireUserWithPermission,
} from '#app/utils/permissions.server.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const takeoffModelId = params.takeoffModelId

	invariantResponse(takeoffModelId, 'Not found', { status: 404 })

	let _takeoffModel = await prisma.takeoffModel.findFirst({
		where: {
			id: params.takeoffModelId,
		},
		include: {
			variables: true,
			inputs: {
				orderBy: {
					order: 'asc',
				},
			},
		},
	})

	if (!_takeoffModel) {
		const userId = await requireUserWithPermission(
			request,
			'create:takeoffModel:own',
		)
		const name = await nameTheThing(userId, 'New Takeoff Model', 'takeoffModel')

		_takeoffModel = await prisma.takeoffModel.create({
			data: {
				name,
				code: startingCode,
				ownerId: userId,
				variables: {
					create: [
						{
							name: 'wallHeight',
							value: '8',
							type: 'number',
						},
						{
							name: 'studsPerFoot',
							value: '1',
							type: 'number',
						},
						{
							name: 'floorThickness',
							value: '1',
							type: 'number',
						},
						{
							name: 'roofRisePerFoot',
							value: '1',
							type: 'number',
						},
						{
							name: 'soffitOverhangWidth',
							value: '1',
							type: 'number',
						},
					],
				},
				inputs: {
					create: [
						{
							name: 'width',
							defaultValue: '25',
							type: 'number',
							label: 'Width',
							props: '{}',
							order: 0,
						},
						{
							name: 'length',
							defaultValue: '50',
							type: 'number',
							label: 'Length',
							props: '{}',
							order: 1,
						},
						{
							name: 'interiorWallLength',
							defaultValue: '100',
							type: 'number',
							label: 'Interior Wall Length',
							props: '{}',
							order: 2,
						},
					],
				},
			},
			include: {
				variables: true,
				inputs: true,
				printTemplates: true,
			},
		})
		const requestUrl = new URL(request.url)

		return redirect(`/takeoff-models/${_takeoffModel.id}${requestUrl.search}`)
	}

	const printTemplates = await prisma.printTemplate.findMany({
		where: {
			takeoffModelId: takeoffModelId,
		},
		select: {
			id: true,
			name: true,
			updatedAt: true,
			createdAt: true,
		},
	})

	const permissions = await requireUserWithPermission(
		request,
		'read:takeoffModel',
		_takeoffModel,
	)

	const takeoffModel = assignPermissionsToEntity(_takeoffModel, permissions)

	return json({
		takeoffModel,
        printTemplates: formatListTimeAgo(printTemplates),
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')
	const takeoffModelId = params.takeoffModelId

	invariantResponse(takeoffModelId, 'Not found', { status: 404 })

	switch (intent) {
		case 'update-name':
			return updateTakeoffModelName(takeoffModelId, formData)
		case 'update-inputs-order':
			return updateInputsOrder(takeoffModelId, formData)
		case 'printTemplate.delete':
			return deletePrintTemplate(takeoffModelId, formData)
	}

	return null
}

export default function TakeoffModelIndex() {
	const data = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	return (
		<div className="main-container space-y-4">
			{searchParams.has('goBackButton') && (
				<Button
					onClick={() => navigate(-1)}
					className="flex items-center gap-3"
				>
					<ArrowLeft size={16} />
					{searchParams.get('goBackButton')}
				</Button>
			)}
			<TakeoffModelNameForm />
			<BasicTable
				title="Variables"
				headers={['Name', 'Value']}
				description="A list of variables in the takeoff model."
				actionButton={
					<Button asChild className="text-nowrap">
						<Link to={'new'}>New Variable</Link>
					</Button>
				}
			>
				{data.takeoffModel.variables
					.sort((a, b) => a.name.length - b.name.length)
					.map(variable => (
						<TableRow key={variable.id}>
							<TableCell>
								<Link to={variable.id} className="hover:underline">
									{variable.name}
								</Link>
							</TableCell>
							<TableCell>{variable.value}</TableCell>
						</TableRow>
					))}
			</BasicTable>
			{/* <SortInputs /> */}
			<Card>
				<CardHeader>
					<CardTitle>Code</CardTitle>
					<CardDescription>
						This is the code responsible for the takeoff.
					</CardDescription>
				</CardHeader>
				<CardFooter className="flex justify-end">
					<Button asChild>
						<Link to="code">Edit Code</Link>
					</Button>
				</CardFooter>
			</Card>
			<BasicTable
				title="Print Templates"
				headers={['Name', 'Updated', 'Delete']}
				description="Manage print templates for this takeoff model."
				actionButton={
					<Button asChild className="text-nowrap">
						<Link to="templates/new">
							<PlusCircle className="mr-2 h-4 w-4" />
							New Template
						</Link>
					</Button>
				}
			>
				{data.printTemplates.map(template => (
					<TableRow key={template.id}>
						<TableCell className="font-medium">
							<Link to={`templates/${template.id}`} className="hover:underline">
								{template.name}
							</Link>
						</TableCell>
						<TableCell>{template.updatedAt} ago</TableCell>
						<TableCell>
							<DeleteEntityBtn
								entityId={template.id}
								entityType="printTemplate"
							/>
						</TableCell>
					</TableRow>
				))}
			</BasicTable>
		</div>
	)
}

async function deletePrintTemplate(takeoffModelId: string, formData: FormData) {
	const printTemplateId = formData.get('id') as string
	await prisma.printTemplate.delete({
		where: { id: printTemplateId, takeoffModelId },
	})

	return null
}

async function updateTakeoffModelName(
	takeoffModelId: string,
	formData: FormData,
) {
	const name = formData.get('name') as string
	await prisma.takeoffModel.update({
		where: { id: takeoffModelId },
		data: { name },
	})

	return null
}

function TakeoffModelNameForm() {
	const data = useLoaderData<typeof loader>()
	const name = data.takeoffModel.name
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
			<div className="flex">
				<Input
					ref={inputRef}
					name="name"
					defaultValue={name}
					className="border-none text-2xl font-bold"
				/>
				{isSaving && <LoaderCircle className="animate-spin" />}
			</div>
		</fetcher.Form>
	)
}

async function updateInputsOrder(takeoffModelId: string, formData: FormData) {
	const inputs = formData.getAll('inputs[]') as string[]
	await prisma.takeoffModel.update({
		where: { id: takeoffModelId },
		data: {
			inputs: {
				updateMany: inputs.map((name, index) => ({
					where: { name },
					data: { order: index },
				})),
			},
		},
	})

	return null
}

export function SortInputs() {
	// const inputs = useLoaderData<typeof loader>().takeoffModel.inputs
	const fetcher = useFetcher()
	const isSaving = useSpinDelay(fetcher.state === 'submitting', {
		minDuration: 300,
		delay: 0,
	})

	return (
		<Card>
			<CardHeader className="mt-0 flex flex-row items-start space-y-0">
				<div className="grid gap-2">
					<CardTitle>Inputs</CardTitle>
					<CardDescription>
						Reorder the inputs to change the order in which they appear in the
						takeoff.
					</CardDescription>
				</div>
				<div className="ml-auto text-foreground/60">
					{isSaving ? <LoaderCircle className="animate-spin" /> : <Check />}
				</div>
			</CardHeader>
			<CardContent>
				<fetcher.Form method="post">
					<input type="hidden" name="intent" value="update-inputs-order" />
				</fetcher.Form>
			</CardContent>
		</Card>
	)
}

const startingCode = `
const wallHeight = getVariable('wallHeight', 8)
const studsPerFoot = getVariable('studsPerFoot', 1)
const floorThickness = getVariable('floorThickness', 1)
const roofRisePerFoot = getVariable('roofRisePerFoot', 1)
const soffitOverhangWidth = getVariable('soffitOverhangWidth', 1)

insertHeading('House Dimensions', 'Enter the dimensions of the house')

const width = getUserInput('width', 20)
const length = getUserInput('length', 50)
const totalInteriorWallsLength = getUserInput('interiorWallLength', 100)

const bd = new BuildingDimensions({
	width,
	length,
	wallHeight,
	floorThickness,
	totalInteriorWallsLength,
	roofRisePerFoot,
	soffitOverhangWidth,
})

const lumberSection = createSection('Lumber')

lumberSection.addPart({
	name: 'Studs',
	qty: studsPerFoot * bd.exteriorWallsLinearFeet + bd.interiorWallsLinearFeet,
	priceLookupKey: '2x4x8',
})

lumberSection.addPart({
	name: 'Sheathing',
	qty: Math.ceil(bd.floorSurfaceArea / 32),
	priceLookupKey: '7/16" OSB',
})

insertHeading('Bathroom Fixtures', 'Select the number of each item you need')

const plumbingSection = createSection('Plumbing')
const bathroomItems = getCategoryItems('bathroom').slice(0, 5)
for (const item of bathroomItems) {
	plumbingSection.addPart({
		name: item.name,
		qty: getCount(item.name),
		priceLookupKey: item.name,
	})
}
`

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>Unauthorized</p>,
				404: ({ params }) => <p>No pricelist exists</p>,
			}}
		/>
	)
}
