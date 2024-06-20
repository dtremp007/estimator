import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Form, Link, redirect, useLoaderData } from '@remix-run/react'
import { ArrowRight, Plus, Users } from 'lucide-react'
import { Button } from '#app/components/ui/button.js'
import { Checkbox } from '#app/components/ui/checkbox.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import {
	listPricelists,
	listTakeoffModels,
} from '#app/utils/entities.server.js'
import { nameTheThing } from '#app/utils/naming.server.js'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const [models, pricelists] = await Promise.all([
		listTakeoffModels(userId),
		listPricelists(userId),
	])

	return json({
		models,
		pricelists,
	})
}

export async function action({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()

	const takeoffModelId = formData.get('takeoffModelId')
	const pricelistIds = formData.getAll('pricelistId')

	if (!takeoffModelId || pricelistIds.length === 0) {
		return new Response('Bad Request', { status: 400 })
	}

	const name = await nameTheThing(userId, 'New Estimate', 'estimate')

	const newEstimate = await prisma.estimate.create({
		data: {
			ownerId: userId,
			name,
			status: 'draft',
			takeoffModelId: takeoffModelId as string,
			prices: {
				connect: pricelistIds.map(id => ({ id: id as string })),
			},
		},
	})

    const searchParams = new URLSearchParams({
        focusNameInput: 'true',
    })

    return redirect(`/estimates/${newEstimate.id}/edit?${searchParams.toString()}`)
}

export default function Onboarding() {
	const data = useLoaderData<typeof loader>()

	return (
		<Form
			method="post"
			className="main-container grid max-w-[60ch] auto-rows-min justify-items-start gap-4"
		>
			<h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
				Takeoff Models
			</h2>
			<p className="mb-4 text-sm text-muted-foreground">
				Select a takeoff model to start estimating. This consists of a script
				and variables that will be used to calculate the cost of your project.
			</p>
			{data.models.map((model, index) => (
				<div
					key={model.id}
					className="pointer-events-auto w-full max-w-sm cursor-pointer justify-self-center rounded-lg border border-border bg-background p-4 text-[0.8125rem] leading-5 ring-ring transition-colors duration-100 ease-out hover:bg-muted/20 has-[:checked]:ring-2"
					onClick={e =>
						(
							e.currentTarget?.querySelector(`#${model.id}`) as HTMLInputElement
						)?.click()
					}
				>
					<div className="flex justify-between">
						<div className="font-medium text-foreground">{model.name}</div>
						<input
							id={model.id}
							type="radio"
							name="takeoffModelId"
							value={model.id}
							className="peer sr-only"
							defaultChecked={index === 0}
						/>
						<svg
							className="h-5 w-5 flex-none opacity-0 transition-opacity duration-300 ease-out peer-checked:opacity-100"
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
			<div className="flex w-full max-w-sm justify-end justify-self-center">
				<Button asChild variant="secondary">
					<Link
						to={{
							pathname: '/takeoff-models/new',
							search: new URLSearchParams({
								goBackButton: 'Go back to estimate',
							}).toString(),
						}}
						className="flex items-center gap-4 pr-6"
					>
						<Plus size={18} />
						Create one
					</Link>
				</Button>
			</div>
			<h2 className="mt-9 text-lg font-semibold leading-none tracking-tight text-foreground">
				Pricelist
			</h2>
			<p className="mb-4 text-sm text-muted-foreground">
				Select a pricelist to use for your project. This will be used to
				calculate the cost of your project.
			</p>
			<div className="space-y-6">
				{data.pricelists.map(pricelist => (
					<div className="flex items-center space-x-3" key={pricelist.id}>
						<Checkbox
							id={pricelist.id}
							name="pricelistId"
							value={pricelist.id}
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
			</div>
			<Button
				type="submit"
				className="mt-8 flex items-center gap-3 justify-self-end"
			>
				Continue
				<ArrowRight size={16} />
			</Button>
		</Form>
	)
}
