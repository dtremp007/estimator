import { type LoaderFunctionArgs, json, redirect } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { DollarSign } from 'lucide-react'
import React from 'react'
import _ from 'underscore'
import { Button } from '#app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from '#app/components/ui/tabs'
import { type CalculatedItem } from '#app/lib/takeoff/takeoff-api.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { nameTheThing } from '#app/utils/naming.server.js'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const estimate = await prisma.estimate.findFirst({
		where: {
			id: params.estimateId,
			ownerId: userId,
		},
		include: {
			results: true,
		},
	})

	if (!estimate) {
		const name = await nameTheThing(userId, 'New Estimate', 'estimate')
		const takeoffModel = await prisma.takeoffModel.findFirst({
            select: {
                id: true,
            },
			where: {
				ownerId: userId,
			},
			orderBy: {
				updatedAt: 'desc',
			},
		})

		const newEstimate = await prisma.estimate.create({
			data: {
				ownerId: userId,
				name,
				status: 'draft',
				takeoffModelId: takeoffModel?.id
			},
		})

		return redirect(`/estimates/${newEstimate.id}/edit`)
	}

	return json({ estimate })
}

export default function Estimate() {
	const data = useLoaderData<typeof loader>()

	if (data.estimate.results.length === 0) {
		return (
			<div className="main-container">
				<Card>
					<CardHeader className="flex flex-row items-center">
						<div className="grid gap-2">
							<CardTitle>{data.estimate.name}</CardTitle>
							<CardDescription>
								This estimate is empty. Please add some items to it.
							</CardDescription>
						</div>
						<Button asChild className="ml-auto text-nowrap">
							<Link to="edit">Add Items</Link>
						</Button>
					</CardHeader>
				</Card>
			</div>
		)
	}

	return (
		<div className="main-container">
			<Card className="">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Total Cost</CardTitle>
					<DollarSign className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						{data.estimate.results
							.reduce((acc, part) => acc + part.total, 0)
							.toLocaleString('en-US', {
								style: 'currency',
								currency: 'USD',
							})}
					</div>
					<p className="text-xs text-muted-foreground"></p>
				</CardContent>
			</Card>
			<Tabs defaultValue="detail" className="mt-8">
				<div className="flex">
					<TabsList>
						<TabsTrigger value="detail">Sections</TabsTrigger>
						<TabsTrigger value="materials">Concise</TabsTrigger>
					</TabsList>
					<Button asChild className="ml-auto">
						<Link to="edit">Edit</Link>
					</Button>
				</div>
				<TabsContent value="detail">
					{_.pairs(_.groupBy(data.estimate.results, 'section')).map(
						([sectionName, parts]) => (
							<EstimateSectionTable
								key={sectionName}
								section={{ name: sectionName, parts }}
							/>
						),
					)}
				</TabsContent>
				<TabsContent value="materials">
					<EstimateSectionTable
						section={{ name: 'All', parts: data.estimate.results }}
					/>
				</TabsContent>
			</Tabs>
		</div>
	)
}

type EstimateSectionTableProps = {
	section: {
		name: string
		parts: CalculatedItem[]
	}
}

function EstimateSectionTable({ section }: EstimateSectionTableProps) {
	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>{section.name}</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Item</TableHead>
							<TableHead>Material</TableHead>
							<TableHead>Quantity</TableHead>
							<TableHead className="text-right max-sm:hidden">
								Unit Price
							</TableHead>
							<TableHead className="text-right">Price</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{section.parts.map(part => (
							<CalculatedItemRow key={part.name} part={part} />
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}

type CalculatedItemRowProps = {
	part: CalculatedItem
}

function CalculatedItemRow({ part }: CalculatedItemRowProps) {
	return (
		<TableRow>
			<TableCell>{part.name}</TableCell>
			<TableCell>{part.priceLookupKey}</TableCell>
			<TableCell>{part.qty}</TableCell>
			<TableCell className="text-right max-sm:hidden">
				{part.pricePerUnit.toLocaleString('en-US', {
					style: 'currency',
					currency: 'USD',
				})}
			</TableCell>
			<TableCell className="text-right">
				{part.total.toLocaleString('en-US', {
					style: 'currency',
					currency: 'USD',
				})}
			</TableCell>
		</TableRow>
	)
}
