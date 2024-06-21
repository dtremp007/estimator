import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, json, redirect, useLoaderData } from '@remix-run/react'
import { Users } from 'lucide-react'
import React from 'react'
import { GeneralErrorBoundary } from '#app/components/error-boundary'
import { Button } from '#app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import { Icon } from '#app/components/ui/icon'
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'
import { prisma } from '#app/utils/db.server'
import { assignPermissionsToEntity, requireUserWithPermission } from '#app/utils/permissions.server.js'

export const handle = {
	breadcrumb: 'Pricelist',
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const pricelistId = params.pricelistId
	invariantResponse(pricelistId, 'Not found', { status: 404 })

	const _pricelist = await prisma.pricelist.findFirst({
		where: {
			id: pricelistId,
		},
		include: {
			items: true,
		},
	})

	invariantResponse(_pricelist, 'Not found', { status: 404 })

    const permissions = await requireUserWithPermission(
		request,
		'read:pricelist',
		_pricelist,
	)

    const pricelist = assignPermissionsToEntity(_pricelist, permissions)

	return json({ pricelist })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const pricelistId = params.pricelistId
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(pricelistId, 'Not found', { status: 404 })

	switch (intent) {
		case 'delete':
			return deletePricelist(request, pricelistId)
		case 'update-item-price':
			return updateItemPrice(request, pricelistId, formData)
	}

	return null
}

export default function Pricelist() {
	const data = useLoaderData<typeof loader>()

	function canEdit(pricelist: typeof data.pricelist) {
		return pricelist.accessLevel === null
			? true
			: pricelist.accessLevel?.includes('write')
	}

	return (
		<div className="main-container">
			<Card>
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<div className="flex gap-3">
							<CardTitle>{data.pricelist.name}</CardTitle>
							{data.pricelist.isShared && <Users />}
						</div>
						<CardDescription>
							These are the prices used inside your takeoff model.
						</CardDescription>
					</div>
					<div className="ml-auto">
						<Form method="post">
							<Button
								type="submit"
								variant="destructive"
								className="flex gap-3"
								name="intent"
								value="delete"
							>
								Delete
								<Icon name="trash" />
							</Button>
						</Form>
					</div>
				</CardHeader>
				<CardContent>
					<div className="relative w-full">
						<table className="w-full caption-bottom text-sm">
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="hidden md:table-cell">
										Category
									</TableHead>
									<TableHead className="text-right">Price Per Unit</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.pricelist.items.map(item => (
									<TableRow key={item.id}>
										<TableCell>{item.name}</TableCell>
										<TableCell className="hidden md:table-cell">
											{item.category}
										</TableCell>
										<TableCell className="focus-within:ring-primary-500 focus-within:ring-2 focus-within:ring-opacity-50">
											<PriceEditor
												itemId={item.id}
												price={item.pricePerUnit}
												currency={item.currency}
												disabled={!canEdit(data.pricelist)}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

async function deletePricelist(request: Request, pricelistId: string) {
	await requireUserWithPermission(request, 'delete:pricelist', {
		id: pricelistId,
	})

	await prisma.pricelist.delete({
		where: {
			id: pricelistId,
		},
	})

	return redirect('/pricelists')
}

async function updateItemPrice(
	request: Request,
	pricelistId: string,
	formData: FormData,
) {
	await requireUserWithPermission(request, 'write:pricelist', {
		id: pricelistId,
	})

	const itemId = formData.get('itemId')
	const price = formData.get('price')

	invariantResponse(typeof itemId === 'string', 'Not found', { status: 404 })
	invariantResponse(typeof price === 'string', 'Invalid price', { status: 400 })

	await prisma.pricelistItem.update({
		where: {
			id: itemId,
		},
		data: {
			pricePerUnit: parseFloat(price),
		},
	})

	return null
}

function PriceEditor({
	itemId,
	price,
	currency,
	disabled,
}: {
	itemId: string
	price: number
	currency: string
	disabled?: boolean
}) {
	const [value, setValue] = React.useReducer((_: any, value: string) => {
		// Allow only numbers and a single decimal point
		let validValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1')

		// Limit to two decimal places
		const parts = validValue.split('.')
		if (parts.length > 1) {
			parts[1] = parts[1].slice(0, 2)
			validValue = parts.join('.')
		}

		return validValue
	}, price.toString())
	const inputRef = React.useRef<HTMLInputElement>(null)

	return (
		<Form
			method="post"
			className="flex items-end justify-end"
			onSubmit={e => {
				inputRef.current?.blur()
				// go up node tree until you hit a row element
				const nextRow = e.currentTarget.closest('tr')
					?.nextElementSibling as HTMLTableRowElement
				if (nextRow) {
					;(
						nextRow.querySelector('input[name="price"]') as HTMLInputElement
					)?.focus()
				}
			}}
		>
			<input type="hidden" name="intent" value="update-item-price" />
			<input type="hidden" name="itemId" value={itemId} />
			<input
				ref={inputRef}
				type="text"
				disabled={disabled}
				autoComplete="off"
				name="price"
				inputMode="numeric"
				value={value}
				onKeyDown={e => {
					if (e.key === 'Escape') {
						setValue(price.toString())
						e.currentTarget.blur()
					}
				}}
				onChange={e => setValue(e.target.value)}
				className="w-full min-w-0 border-none bg-transparent text-right text-base outline-none"
			/>
			<span className="mb-px ml-1 text-sm text-muted-foreground">
				{currency}
			</span>
		</Form>
	)
}

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
