import { parseWithZod } from '@conform-to/zod/v4'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import {
	BuildingDimensions,
	CustomInputLookupTable,
	CustomVariableLookupTable,
	PriceLookupTable,
	TakeOffApi,
	createDummyBuildingDimensions,
} from '#app/lib/takeoff'
import { executeTakeoffCode } from '#app/lib/takeoff/execute.server.ts'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import {
	createToastHeaders,
	redirectWithToast,
} from '#app/utils/toast.server.js'

const CodeEditorSchema = z.object({
	id: z.string().optional(),
	code: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: CodeEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id, code } = submission.value

	let takeoffModel = await prisma.takeoffModel.findUnique({
		where: { id, ownerId: userId },
		include: {
			variables: true,
			inputs: true,
		},
	})

	if (!takeoffModel) {
		return redirectWithToast('/dashboard/takeoff-models', {
			description: 'Takeoff model not found',
			type: 'error',
		})
	}

	const buildingDimensions = BuildingDimensions.fromObject(
		createDummyBuildingDimensions(),
	)
	const inputsLookupTable = new CustomInputLookupTable(takeoffModel.inputs)
	const variablesLookupTable = new CustomVariableLookupTable(
		takeoffModel.variables,
	)
	const prices = new PriceLookupTable([] as any)

	const takeoffApi = new TakeOffApi({
		id: takeoffModel.id,
		bd: buildingDimensions,
		prices,
		inputs: inputsLookupTable,
		variables: variablesLookupTable,
	})

	try {
		await executeTakeoffCode(code, takeoffApi)
	} catch (error) {
		return json({
			result: submission.reply({
				formErrors: [error instanceof Error ? error.message : 'Calculation failed'],
			}),
		}, { status: 400 })
	}

	const inputs = takeoffApi.inputs.getLookupHistory()
	const variables = takeoffApi.variables.getLookupHistory()

	await prisma.takeoffModel.update({
		where: { id: takeoffModel.id, ownerId: userId },
		data: {
			code,
			//
			inputs: {
				upsert: inputs.map(input => ({
					where: { name: input.name, id: input.id ?? '__new__' },
					update: {
						label: input.label,
						description: input.description,
						defaultValue: input.defaultValue,
						type: input.type,
						props: input.props,
						order: input.order,
					},
					create: {
						name: input.name,
						label: input.label,
						description: input.description,
						defaultValue: input.defaultValue,
						type: input.type,
						props: input.props,
						order: input.order,
					},
				})),
				deleteMany: {
					name: {
						notIn: inputs.map(input => input.name),
					},
				},
			},
			//
			variables: {
				upsert: variables.map(variable => ({
					where: { name: variable.name, id: variable.id ?? '__new__' },
					update: variable,
					create: variable,
				})),
				deleteMany: {
					id: {
						notIn: variables.map(variable => variable.id).filter(Boolean),
					},
					isManuallyCreated: false,
				},
			},
		},
	})

	return json(
		{
			result: submission.reply(),
		},
		{
			headers: await createToastHeaders({
				description: 'Code saved successfully',
				type: 'success',
			}),
		},
	)
}
