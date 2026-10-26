import { type ActionFunctionArgs } from '@remix-run/node'
import { expect, test } from 'vitest'
import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { createUser } from '#tests/db-utils.ts'
import {
	action as estimateAction,
	loader as estimateLoader,
} from './estimates+/$estimateId.edit.tsx'
import { action as deletePricelist } from './pricelists+/$pricelistId_.delete.tsx'
import {
	action as variableAction,
	loader as variableLoader,
} from './takeoff-models+/$takeoffModelId.$variableId.tsx'
import {
	action as modelAction,
	loader as modelLoader,
} from './takeoff-models+/$takeoffModelId.index.tsx'
import { action as codeAction } from './takeoff-models+/__editor.server.tsx'

async function userSession() {
	const user = await prisma.user.create({ data: createUser() })
	const session = await prisma.session.create({
		data: { userId: user.id, expirationDate: getSessionExpirationDate() },
	})
	const auth = await authSessionStorage.getSession()
	auth.set(sessionKey, session.id)
	const cookie = (await authSessionStorage.commitSession(auth)).split(';')[0]
	return { user, cookie }
}

function args(
	cookie: string,
	params: Record<string, string>,
	form?: Record<string, string>,
): ActionFunctionArgs {
	return {
		request: new Request('http://localhost/', {
			method: form ? 'POST' : 'GET',
			headers: { cookie },
			body: form ? new URLSearchParams(form) : undefined,
		}),
		params,
		context: {},
	}
}

test('anonymous and other-user writes cannot rename estimates/models or delete variables', async () => {
	const owner = await userSession()
	const stranger = await userSession()
	const model = await prisma.takeoffModel.create({
		data: {
			ownerId: owner.user.id,
			name: 'Private model',
			code: '',
			variables: {
				create: { name: 'Private variable', type: 'number', value: '5' },
			},
		},
		include: { variables: true },
	})
	const estimate = await prisma.estimate.create({
		data: { ownerId: owner.user.id, name: 'Private estimate', status: 'draft' },
	})
	const cases = [
		[
			estimateAction,
			{ estimateId: estimate.id },
			{ intent: 'update-name', name: 'Intrusion' },
		],
		[
			modelAction,
			{ takeoffModelId: model.id },
			{ intent: 'update-name', name: 'Intrusion' },
		],
		[
			variableAction,
			{ takeoffModelId: model.id, variableId: model.variables[0].id },
			{ intent: 'delete', id: model.variables[0].id },
		],
	] as const
	for (const [action, params, form] of cases) {
		await expect(action(args('', params, form))).rejects.toMatchObject({
			status: 302,
		})
		await expect(
			action(args(stranger.cookie, params, form)),
		).rejects.toMatchObject({ status: 404 })
	}
	await expect(
		estimateAction(
			args(
				owner.cookie,
				{ estimateId: estimate.id },
				{
					intent: 'update-name',
					name: 'Owned rename',
				},
			),
		),
	).resolves.toBeNull()
	expect(
		(await prisma.estimate.findUniqueOrThrow({ where: { id: estimate.id } }))
			.name,
	).toBe('Owned rename')
	expect(
		(await prisma.takeoffModel.findUniqueOrThrow({ where: { id: model.id } }))
			.name,
	).toBe('Private model')
	expect(
		await prisma.customVariable.count({ where: { id: model.variables[0].id } }),
	).toBe(1)

	await expect(
		estimateLoader(args(stranger.cookie, { estimateId: estimate.id })),
	).rejects.toMatchObject({ status: 404 })
	await expect(
		modelLoader(args(stranger.cookie, { takeoffModelId: model.id })),
	).rejects.toMatchObject({ status: 404 })
	await expect(
		variableLoader(
			args('', { takeoffModelId: model.id, variableId: model.variables[0].id }),
		),
	).rejects.toMatchObject({ status: 302 })
})

test('variable mutations use the URL variable within its owned model, not an unrelated form ID', async () => {
	const owner = await userSession()
	const stranger = await userSession()
	const models = await Promise.all(
		[owner, stranger].map(({ user }, index) =>
			prisma.takeoffModel.create({
				data: {
					ownerId: user.id,
					name: `Model ${index}`,
					code: '',
					variables: {
						create: { name: 'Quantity', type: 'number', value: '13' },
					},
				},
				include: { variables: true },
			}),
		),
	)
	const ownVariable = models[0].variables[0]
	const foreignVariable = models[1].variables[0]
	await expect(
		variableAction(
			args(
				owner.cookie,
				{
					takeoffModelId: models[0].id,
					variableId: foreignVariable.id,
				},
				{ intent: 'delete', id: foreignVariable.id },
			),
		),
	).rejects.toMatchObject({ status: 404 })
	await variableAction(
		args(
			owner.cookie,
			{
				takeoffModelId: models[0].id,
				variableId: ownVariable.id,
			},
			{ intent: 'delete', id: foreignVariable.id },
		),
	)
	expect(
		await prisma.customVariable.findUnique({ where: { id: ownVariable.id } }),
	).toBeNull()
	expect(
		(
			await prisma.customVariable.findUniqueOrThrow({
				where: { id: foreignVariable.id },
			})
		).value,
	).toBe('13')
})

test('calculations use the selected owned model and reject another user’s model assignment', async () => {
	const stranger = await userSession()
	const owner = await userSession()
	const foreignModel = await prisma.takeoffModel.create({
		data: {
			ownerId: stranger.user.id,
			name: 'Wrong first model',
			code: 'throw Error("Wrong model executed")',
		},
	})
	const model = await prisma.takeoffModel.create({
		data: {
			ownerId: owner.user.id,
			name: 'Selected model',
			code: 'createSection("Selected").addPart({name:"Panel", qty:getUserInput("Count",7), priceLookupKey:"panel"})',
			inputs: {
				create: {
					name: 'Count',
					label: 'Count',
					type: 'number',
					defaultValue: '7',
					props: '{}',
					order: 0,
				},
			},
		},
	})
	const estimate = await prisma.estimate.create({
		data: {
			ownerId: owner.user.id,
			name: 'Estimate',
			status: 'draft',
			takeoffModelId: model.id,
		},
	})
	await expect(
		estimateAction(
			args(
				owner.cookie,
				{ estimateId: estimate.id },
				{
					intent: 'update-takeoff-model',
					takeoffModelId: foreignModel.id,
				},
			),
		),
	).rejects.toMatchObject({ status: 404 })
	const response = await estimateAction(
		args(
			owner.cookie,
			{ estimateId: estimate.id },
			{
				intent: 'submit-takeoff-values',
				Count: '11',
			},
		),
	)
	expect(response?.status).toBe(302)
	const saved = await prisma.estimate.findUniqueOrThrow({
		where: { id: estimate.id },
		include: { results: true, formData: true },
	})
	expect(saved.takeoffModelId).toBe(model.id)
	expect(saved.results).toMatchObject([
		{ name: 'Panel', qty: 11, section: 'Selected' },
	])
	expect(saved.formData).toMatchObject([
		{ name: 'Count', value: '11', type: 'number' },
	])
	expect(
		(await estimateLoader(args(owner.cookie, { estimateId: estimate.id }))).status,
	).toBe(200)
	// Legacy rows may already contain assignments made before owner validation.
	await prisma.estimate.update({
		where: { id: estimate.id },
		data: { takeoffModelId: foreignModel.id },
	})
	await expect(
		estimateLoader(args(owner.cookie, { estimateId: estimate.id })),
	).rejects.toMatchObject({ status: 404 })
})

test('alternate pricelist delete route cannot bypass own/any permissions', async () => {
	const owner = await userSession()
	const stranger = await userSession()
	const role = await prisma.role.create({
		data: {
			name: 'Pricelist owner',
			permissions: {
				create: { action: 'delete', entity: 'pricelist', access: 'own' },
			},
		},
	})
	await prisma.user.update({
		where: { id: stranger.user.id },
		data: { roles: { connect: { id: role.id } } },
	})
	const list = await prisma.pricelist.create({
		data: { ownerId: owner.user.id, name: 'Private prices' },
	})
	await expect(
		deletePricelist(args(stranger.cookie, { pricelistId: list.id }, {})),
	).rejects.toMatchObject({ status: 403 })
	expect(await prisma.pricelist.count({ where: { id: list.id } })).toBe(1)
	await prisma.user.update({
		where: { id: owner.user.id },
		data: { roles: { connect: { id: role.id } } },
	})
	expect(
		(await deletePricelist(args(owner.cookie, { pricelistId: list.id }, {})))
			.status,
	).toBe(302)
	expect(await prisma.pricelist.count({ where: { id: list.id } })).toBe(0)
})

test('rejected sandbox escape does not overwrite code or delete existing model inputs', async () => {
	const owner = await userSession()
	const model = await prisma.takeoffModel.create({
		data: {
			ownerId: owner.user.id,
			name: 'Safe model',
			code: 'getUserInput("Count",7)',
			inputs: {
				create: {
					name: 'Count',
					label: 'Count',
					type: 'number',
					defaultValue: '7',
					props: '{}',
					order: 0,
				},
			},
		},
	})
	const response = await codeAction(
		args(
			owner.cookie,
			{ takeoffModelId: model.id },
			{
				id: model.id,
				code: 'throw new Error(getPrice.constructor("return process")().version)',
			},
		),
	)
	expect(response.status).toBe(400)
	const saved = await prisma.takeoffModel.findUniqueOrThrow({
		where: { id: model.id },
		include: { inputs: true },
	})
	expect(saved.code).toBe('getUserInput("Count",7)')
	expect(saved.inputs).toMatchObject([{ name: 'Count', defaultValue: '7' }])
})
