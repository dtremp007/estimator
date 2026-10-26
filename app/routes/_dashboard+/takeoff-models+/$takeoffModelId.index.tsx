import { invariant, invariantResponse } from '@epic-web/invariant'
import { useDragAndDrop } from '@formkit/drag-and-drop/react'
import { useMediaQuery } from '@mantine/hooks'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, redirect, useFetcher, useLoaderData } from '@remix-run/react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import { Check, LoaderCircle } from 'lucide-react'
import React from 'react'
import { useSpinDelay } from 'spin-delay'
import BasicTable from '#app/components/basic-table.js'
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
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { nameTheThing } from '#app/utils/naming.server.js'
import 'highlight.js/styles/a11y-dark.css'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	let takeoffModel = await prisma.takeoffModel.findFirst({
		where: {
			id: params.takeoffModelId,
			ownerId: userId,
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

	if (!takeoffModel) {
		invariantResponse(params.takeoffModelId === 'new', 'Not found', { status: 404 })
		const name = await nameTheThing(userId, 'New Takeoff Model', 'takeoffModel')

		takeoffModel = await prisma.takeoffModel.create({
			data: {
				name,
				code: `// Write your code here`,
				ownerId: userId,
				variables: {
					create: [
						{
							name: 'variable1',
							value: '0',
							type: 'number',
						},
					],
				},
			},
			include: {
				variables: true,
				inputs: true,
			},
		})

		return redirect(`/takeoff-models/${takeoffModel.id}`)
	}

	hljs.registerLanguage('javascript', javascript)
	const code = hljs.highlight(takeoffModel.code, {
		language: 'javascript',
	}).value

	return json({
		takeoffModel: {
			...takeoffModel,
			code,
		},
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	const takeoffModelId = params.takeoffModelId

	invariantResponse(takeoffModelId, 'Not found', { status: 404 })
	const model = await prisma.takeoffModel.findUnique({
		where: { id: takeoffModelId, ownerId: userId },
		select: { id: true },
	})
	invariantResponse(model, 'Not found', { status: 404 })

	switch (intent) {
		case 'update-name':
			return updateTakeoffModelName(takeoffModelId, userId, formData)
		case 'update-inputs-order':
			return updateInputsOrder(takeoffModelId, userId, formData)
	}

	return null
}

export default function TakeoffModelIndex() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="space-y-4">
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
				{data.takeoffModel.variables.map(variable => (
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
			<SortInputs />
			<Card>
				<CardHeader>
					<CardTitle>Code</CardTitle>
					<CardDescription>
						This is the code responsible for the takeoff.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<pre>
						<code
							className="language-javascript"
							dangerouslySetInnerHTML={{ __html: data.takeoffModel.code }}
						/>
					</pre>
				</CardContent>
				<CardFooter className="flex justify-end">
					<Button asChild>
						<Link to="code">Edit Code</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}

async function updateTakeoffModelName(
	takeoffModelId: string,
	userId: string,
	formData: FormData,
) {
	const name = formData.get('name') as string
	await prisma.takeoffModel.update({
		where: { id: takeoffModelId, ownerId: userId },
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

async function updateInputsOrder(takeoffModelId: string, userId: string, formData: FormData) {
	const inputs = formData.getAll('inputs[]') as string[]
	await prisma.takeoffModel.update({
		where: { id: takeoffModelId, ownerId: userId },
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
	const inputs = useLoaderData<typeof loader>().takeoffModel.inputs
	const fetcher = useFetcher()
	const isSaving = useSpinDelay(fetcher.state === 'submitting', {
		minDuration: 300,
		delay: 0,
	})
	const isMobile = useMediaQuery('(max-width: 768px)')
	const [parent, items] = useDragAndDrop<HTMLDivElement, string>(
		inputs.map(input => input.name),
		{
			handleEnd: data => {
				const form = data.targetData.parent.el.parentElement as HTMLFormElement
				invariant(form, 'Form not found')
				fetcher.submit(form, {
					method: 'post',
				})
			},
			disabled: isMobile,
		},
	)

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
					<div ref={parent} className="space-y-3">
						{items.map((item, index) => (
							<div
								className="cursor-grab rounded border p-4"
								data-label={item}
								key={item}
							>
								<input type="hidden" name="inputs[]" value={item} />
								{item}
							</div>
						))}
					</div>
				</fetcher.Form>
			</CardContent>
		</Card>
	)
}
