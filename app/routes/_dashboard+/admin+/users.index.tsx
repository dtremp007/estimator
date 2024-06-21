import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { DynamicTable } from '#app/components/dynamic-table.js'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import { prisma } from '#app/utils/db.server.ts'
import { formatListTimeAgo } from '#app/utils/misc.js'
import { requireAdmin } from '#app/utils/permissions.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireAdmin(request)

	const users = await prisma.user.findMany({
		include: {
			roles: true,
		},
	})

	return json({
		users: formatListTimeAgo(users),
	})
}

export default function Users() {
    const { users } = useLoaderData<typeof loader>()

	return (
		<Card>
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card Description</CardDescription>
			</CardHeader>
			<CardContent>
				<DynamicTable
					data={users}
					columns={[
						{
							key: 'name',
							extract: user => <Link to={user.id}>{user.name}</Link>,
						},
						{
                            key: 'createdAt',
                            label: 'Created',
                            format: (value) => `${value} ago`,
                        },
                        {
                            key: 'roles',
                            label: 'Roles',
                            format: (value) => value.map(role => role.name).join(', '),
                        }
					]}
				/>
			</CardContent>
		</Card>
	)
}
