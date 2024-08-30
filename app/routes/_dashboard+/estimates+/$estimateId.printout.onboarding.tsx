import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { Button } from '#app/components/ui/button.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'

export const handle = {
	breadcrumb: 'Missing Template',
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const estimate = await prisma.estimate.findFirst({
		where: {
			id: params.estimateId,
			ownerId: userId,
		},
		select: {
			model: {
				select: {
					id: true,
				},
			},
		},
	})

	invariantResponse(estimate, 'Estimate not found', { status: 404 })

	return json({
		takeoffModelId: estimate.model?.id,
	})
}

export default function PrintoutOnboarding() {
	const { takeoffModelId } = useLoaderData<typeof loader>()
	return (
		<div className="main-container mx-auto max-w-4xl">
			<div className="flex flex-col items-center gap-4">
				<h1 className="text-2xl font-bold">No Template Found</h1>
				<p>You need to set up a print template for your model.</p>
				<Button asChild>
					<Link to={`/takeoff-models/${takeoffModelId}/templates/new`}>
						Create Print Template
					</Link>
				</Button>
			</div>
		</div>
	)
}
