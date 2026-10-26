import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { json, useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { ModelCodeEditor } from './__editor'

export const handle = {
	breadcrumb: 'Edit Code',
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const takeoffModel = await prisma.takeoffModel.findFirst({
		select: {
			id: true,
			name: true,
			code: true,
		},
		where: {
			id: params.takeoffModelId,
			ownerId: userId,
		},
	})
	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	return json({ takeoffModel: takeoffModel })
}

export { action } from './__editor.server'

export default function Edit() {
	const data = useLoaderData<typeof loader>()

	return <ModelCodeEditor model={data.takeoffModel} />
}
