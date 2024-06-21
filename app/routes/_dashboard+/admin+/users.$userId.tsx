import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { DynamicTable } from '#app/components/dynamic-table.js'
import { Button } from '#app/components/ui/button.js'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import { prisma } from '#app/utils/db.server.js'
import { requireAdmin } from '#app/utils/permissions.server.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireAdmin(request)
	const userId = params.userId

	const user = await prisma.user.findFirst({
		where: {
			id: userId,
		},
	})

	invariantResponse(user, 'Not found', { status: 404 })

	return json({ user })
}

export default function User() {
	const data = useLoaderData<typeof loader>()
	const userInformation = Object.entries(data.user).map(([key, value]) => ({ key, value }))

	return (
		<Card>
			<CardHeader className="flex flex-row items-center">
				<div className="grid gap-2">
					<CardTitle>{data.user.name}</CardTitle>
					<CardDescription>{data.user.email}</CardDescription>
				</div>
				<div className="ml-auto">
					<Form method="post" action="/impersonate" className="flex">
						<input type="hidden" name="intent" value="start" />
						<input type="hidden" name="userId" value={data.user.id} />
						<Button type="submit">Impersonate</Button>
					</Form>
				</div>
			</CardHeader>
			<CardContent>
				<DynamicTable data={userInformation} columns={['key', 'value']} />
			</CardContent>
		</Card>
	)
}
