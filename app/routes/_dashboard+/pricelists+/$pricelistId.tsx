import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { Form, json, useLoaderData } from '@remix-run/react'
import BasicTable from '#app/components/basic-table'
import { GeneralErrorBoundary } from '#app/components/error-boundary'
import { Button } from '#app/components/ui/button'
import { Icon } from '#app/components/ui/icon'
import { TableRow, TableCell } from '#app/components/ui/table'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

export const handle = {
	breadcrumb: 'Pricelist',
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const pricelistId = params.pricelistId

	invariantResponse(pricelistId, 'Not found', { status: 404 })

	const pricelist = await prisma.pricelist.findFirst({
		where: {
			id: pricelistId,
			ownerId: userId,
		},
		include: {
			items: true,
		},
	})

	invariantResponse(pricelist, 'Not found', { status: 404 })
	return json({ pricelist })
}

export default function Pricelist() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="main-container">
			<BasicTable
				headers={['Material', 'Category', 'Price']}
				title={data.pricelist.name}
				description="List of materials and prices"
				actionButton={
					<Form
						action={`/pricelists/${data.pricelist.id}/delete`}
						method="post"
					>
						<Button type="submit" variant="destructive" className="flex gap-3">
							Delete
							<Icon name="trash" />
						</Button>
					</Form>
				}
			>
				{data.pricelist.items.map(item => (
					<TableRow key={item.id}>
						<TableCell>{item.name}</TableCell>
						<TableCell>{item.category}</TableCell>
						<TableCell>
							{item.pricePerUnit.toLocaleString('en-US', {
								style: 'currency',
								currency: 'MXN',
							})}
						</TableCell>
					</TableRow>
				))}
			</BasicTable>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => <p>No pricelist exists</p>,
			}}
		/>
	)
}
