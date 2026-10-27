import { invariantResponse } from '@epic-web/invariant'
import { Users } from 'lucide-react'
import {
	data,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	Form,
	Link,
	redirect,
	useLoaderData,
} from 'react-router'
import { z } from 'zod'
import { Button } from '#app/components/ui/button.js'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import { Icon } from '#app/components/ui/icon.js'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'
import { SharingDialog } from '#app/routes/resources+/sharing+/$entityType.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server'
import { formatListTimeAgo } from '#app/utils/misc.js'

const DBTakeoffModelSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullish(),
	updatedAt: z.date(),
	createdAt: z.date(),
	isShared: z.coerce.string().transform(value => value === '1'),
	accessLevel: z.string().nullish(),
})

const TakeoffModelQueryResultsSchema = z.array(DBTakeoffModelSchema)

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const rawPrices = await prisma.$queryRaw`
        SELECT tm.*,
               CASE
                   WHEN c.entityId IS NOT NULL THEN 1
                   ELSE 0
               END AS isShared,
               c.accessLevel
        FROM takeoffModel tm
        LEFT JOIN collaboration c ON tm.id = c.entityId AND c.userId = ${userId} AND c.entity = 'takeoffModel'
        WHERE tm.ownerId = ${userId} OR tm.id IN (
            SELECT entityId
            FROM collaboration
            WHERE userId = ${userId} AND entity = 'takeoffModel'
        )
        GROUP BY tm.id
        ORDER BY tm.updatedAt DESC;
    `

	const takeoffModels = TakeoffModelQueryResultsSchema.parse(rawPrices)

	invariantResponse(takeoffModels, 'Not found', { status: 404 })

	return data({ takeoffModels: formatListTimeAgo(takeoffModels) })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'delete') {
		const id = formData.get('id') as string

		await prisma.takeoffModel.deleteMany({
			where: {
				id: id,
				ownerId: userId,
			},
		})

		return redirect('/takeoff-models')
	}

	return null
}

export default function TakeoffModels() {
	const data = useLoaderData<typeof loader>()

	function canShare(pricelist: (typeof data.takeoffModels)[0]) {
		return pricelist.accessLevel === null
			? true
			: pricelist.accessLevel?.includes('write')
	}

	return (
		<div className="main-container">
			<Card>
				<CardHeader className="flex flex-row items-center">
					<div className="grid gap-2">
						<CardTitle>Models</CardTitle>
						<CardDescription>
							List of all models you have created.
						</CardDescription>
					</div>
					<div className="ml-auto">
						<Button asChild className="text-nowrap">
							<Link to="new">New Model</Link>
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Last Updated</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.takeoffModels.map(model => (
								<TableRow key={model.id}>
									<TableCell>
										<div className="flex items-center gap-4 font-medium">
											<Link to={model.id} className="hover:underline">
												{model.name}
											</Link>
											{model.isShared && <Users size={16} />}
										</div>
									</TableCell>
									<TableCell>{model.updatedAt} ago</TableCell>
									<TableCell>
										<div className="flex items-start">
											<SharingDialog
												entityId={model.id}
												entityType="takeoffModel"
												disabled={!canShare(model)}
											/>
											<Form method="post">
												<input type="hidden" name="id" value={model.id} />
												<Button
													type="submit"
													variant="ghost"
													disabled={model.isShared}
													name="intent"
													value="delete"
												>
													<Icon name="trash" />
												</Button>
											</Form>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
