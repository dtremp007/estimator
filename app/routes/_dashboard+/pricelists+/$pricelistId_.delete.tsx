import { invariantResponse } from '@epic-web/invariant'
import { type ActionFunctionArgs, redirect } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { requireUserWithPermission } from '#app/utils/permissions.server.js'

export async function action({ params, request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const id = params.pricelistId

	const pricelist = await prisma.pricelist.findFirst({
		where: {
			id: id,
		},
	})

	invariantResponse(pricelist, 'Not found', { status: 404 })

	const isOwner = pricelist.ownerId === userId

	await requireUserWithPermission(
		request,
		isOwner ? `delete:pricelist:own` : `delete:pricelist:any`,
	)

	await prisma.pricelist.delete({
		where: {
			id: id,
		},
	})

	return redirect('/pricelists')
}
