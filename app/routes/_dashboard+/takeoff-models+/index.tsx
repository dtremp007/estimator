import { invariantResponse } from '@epic-web/invariant'
import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { ListEntitiesPage } from '#app/components/list-entities-page.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server'
import { formatListTimeAgo } from '#app/utils/misc.js'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const models = await prisma.takeoffModel.findMany({
		where: { ownerId: userId },
	})

	invariantResponse(models, 'Not found', { status: 404 })

	return json({ entities: formatListTimeAgo(models) })
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
	}

	return null
}

export default ListEntitiesPage.bind(null, {
	title: 'Models',
	description:
		'These models allow you to define calculations for your takeoffs.',
})
