import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { json, useLoaderData } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { runAndSaveTakeoffModel } from '#app/utils/takeoff-model.server.js'
import { createToastHeaders } from '#app/utils/toast.server.js'
import { ModelCodeEditor } from './__editor'

export const handle = {
	breadcrumb: 'Edit Code',
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	await requireUserId(request)
	const takeoffModel = await prisma.takeoffModel.findFirst({
		select: {
			id: true,
			name: true,
			code: true,
		},
		where: {
			id: params.takeoffModelId,
		},
	})
	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	return json({ takeoffModel: takeoffModel })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const id = params.takeoffModelId

	invariantResponse(id, 'Not found', { status: 404 })

	const formData = await request.formData()
	const code = formData.get('code')

	if (typeof code !== 'string') {
		return json(
			{
				error: ['Code is required'],
			},
			{
				status: 400,
			},
		)
	}

	let takeoffModel = await prisma.takeoffModel.findUnique({
		where: { id, ownerId: userId },
		include: {
			variables: true,
			inputs: true,
		},
	})

	invariantResponse(takeoffModel, 'Not found', { status: 404 })

	const { logs } = await runAndSaveTakeoffModel(
		{ ...takeoffModel, code },
		[] as any,
	)

	return json(
		{
			error: logs,
		},
		{
			headers: await createToastHeaders({
				description: 'Code saved successfully',
				type: 'success',
			}),
		},
	)
}

export default function Edit() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="main w-full">
			<ModelCodeEditor model={data.takeoffModel} />
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
