import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { NodeOnDiskFile } from '@remix-run/node'
import { describe, expect, test, vi } from 'vitest'
import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { action as indexAction } from './index.tsx'
import { action as newAction } from './new.tsx'

const csv =
	'Name,Unit Type,Price Per Unit,Currency,Category\nStud,each,4.25,USD,Lumber\nBoard,foot,2.5,CAD,Lumber\n'

async function setupUser(access?: 'own' | 'any') {
	const unique = randomUUID()
	const user = await prisma.user.create({
		data: {
			email: `${unique}@example.com`,
			username: unique,
			roles: access
				? {
						create: {
							name: unique,
							permissions: {
								connectOrCreate: {
									where: {
										action_entity_access: {
											action: 'delete',
											entity: 'pricelist',
											access,
										},
									},
									create: { action: 'delete', entity: 'pricelist', access },
								},
							},
						},
					}
				: undefined,
		},
	})
	const session = await prisma.session.create({
		data: { userId: user.id, expirationDate: getSessionExpirationDate() },
	})
	const authSession = await authSessionStorage.getSession()
	authSession.set(sessionKey, session.id)
	const cookie = (await authSessionStorage.commitSession(authSession)).split(
		';',
	)[0]
	return { user, cookie }
}

function uploadRequest(
	cookie: string,
	value: string | File = new File([csv], 'prices.csv', { type: 'text/csv' }),
) {
	const body = new FormData()
	body.set('intent', 'upload')
	body.set('name', 'Supplier Prices')
	body.set('pricelist', value)
	return new Request('http://localhost/pricelists', {
		method: 'POST',
		headers: { cookie },
		body,
	})
}

function deleteRequest(cookie: string, id?: string) {
	const body = new URLSearchParams({ intent: 'delete' })
	if (id) body.set('id', id)
	return new Request('http://localhost/pricelists', {
		method: 'POST',
		headers: { cookie },
		body,
	})
}

// Observe real removal without replacing its implementation or assuming call order.
function observeUploads() {
	const paths: string[] = []
	const remove = NodeOnDiskFile.prototype.remove
	vi.spyOn(NodeOnDiskFile.prototype, 'remove').mockImplementation(
		async function (this: NodeOnDiskFile) {
			paths.push(this.getFilePath())
			return remove.call(this)
		},
	)
	return paths
}

describe.each([
	['index', indexAction],
	['new', newAction],
] as const)('%s upload action (real Prisma)', (route, action) => {
	test('persists the authenticated owner and every CSV row before redirecting, and removes its upload', async () => {
		const { user, cookie } = await setupUser()
		const paths = observeUploads()
		const response = await action({
			request: uploadRequest(cookie),
			params: {},
			context: {},
		})
		expect(response?.status).toBe(302)
		const location = response?.headers.get('Location')
		expect(location).toMatch(/^\/pricelists\/[^/]+$/)
		const list = await prisma.pricelist.findUniqueOrThrow({
			where: { id: location!.split('/').pop() },
			include: { items: { orderBy: { name: 'asc' } } },
		})
		expect(list.ownerId).toBe(user.id)
		expect(list.name).toBe(
			route === 'index' ? 'Supplier Prices' : 'New Pricelist ',
		)
		expect(
			list.items.map(
				({ name, unitType, pricePerUnit, currency, category }) => ({
					name,
					unitType,
					pricePerUnit,
					currency,
					category,
				}),
			),
		).toEqual([
			{
				name: 'Board',
				unitType: 'foot',
				pricePerUnit: 2.5,
				currency: 'CAD',
				category: 'Lumber',
			},
			{
				name: 'Stud',
				unitType: 'each',
				pricePerUnit: 4.25,
				currency: 'USD',
				category: 'Lumber',
			},
		])
		expect(paths).toHaveLength(1)
		expect(paths.every(path => !existsSync(path))).toBe(true)
	})

	test.each([
		['text field', 'not a file', 0],
		[
			'unsupported MIME',
			new File([csv], 'prices.txt', { type: 'text/plain' }),
			0,
		],
		[
			'malformed CSV',
			new File(['Name\n"unterminated'], 'prices.csv', { type: 'text/csv' }),
			1,
		],
		[
			'invalid row',
			new File(['Name,Price Per Unit\nStud,nope'], 'prices.csv', {
				type: 'text/csv',
			}),
			1,
		],
	] as const)(
		'rejects %s without persisting a partial list',
		async (_label, value, removedFiles) => {
			const { cookie } = await setupUser()
			const paths = observeUploads()
			const response = await action({
				request: uploadRequest(cookie, value),
				params: {},
				context: {},
			})
			expect(response?.status).toBe(400)
			expect(await prisma.pricelist.count()).toBe(0)
			expect(await prisma.pricelistItem.count()).toBe(0)
			expect(paths).toHaveLength(removedFiles)
			expect(paths.every(path => !existsSync(path))).toBe(true)
		},
	)

	test('rejects unauthenticated uploads without persisting data', async () => {
		await expect(
			action({ request: uploadRequest(''), params: {}, context: {} }),
		).rejects.toMatchObject({ status: 302 })
		expect(await prisma.pricelist.count()).toBe(0)
	})
})

test('index rejects an empty name and cleans every duplicate uploaded file', async () => {
	const { cookie } = await setupUser()
	const request = uploadRequest(cookie)
	const body = await request.formData()
	body.set('name', '')
	body.append(
		'pricelist',
		new File([csv], 'duplicate.csv', { type: 'text/csv' }),
	)
	const paths = observeUploads()
	const response = await indexAction({
		request: new Request(request.url, {
			method: 'POST',
			headers: { cookie },
			body,
		}),
		params: {},
		context: {},
	})
	expect(response?.status).toBe(400)
	expect(await prisma.pricelist.count()).toBe(0)
	expect(paths).toHaveLength(2)
	expect(paths.every(path => !existsSync(path))).toBe(true)
})

test.each([
	['owner with own permission', 'own', true, true],
	['owner without delete permission', undefined, true, false],
	['other user with only own permission', 'own', false, false],
	['other user with any permission', 'any', false, true],
] as const)(
	'URL-encoded index deletion: %s',
	async (_label, access, isOwner, allowed) => {
		const { user, cookie } = await setupUser(access)
		const owner = isOwner ? user : (await setupUser()).user
		const list = await prisma.pricelist.create({
			data: {
				ownerId: owner.id,
				name: 'Delete me',
				items: {
					create: {
						name: 'Stud',
						unitType: 'each',
						pricePerUnit: 1,
						currency: 'USD',
						category: 'Lumber',
					},
				},
			},
		})
		const result = indexAction({
			request: deleteRequest(cookie, list.id),
			params: {},
			context: {},
		})
		if (allowed) {
			expect(await result).toBeNull()
		} else {
			await expect(result).rejects.toMatchObject({ status: 403 })
		}
		expect(await prisma.pricelist.count({ where: { id: list.id } })).toBe(
			allowed ? 0 : 1,
		)
		expect(
			await prisma.pricelistItem.count({ where: { pricelistId: list.id } }),
		).toBe(allowed ? 0 : 1)
	},
)

test('deletion rejects a missing ID instead of selecting the first list', async () => {
	const { cookie } = await setupUser('any')
	await expect(
		indexAction({ request: deleteRequest(cookie), params: {}, context: {} }),
	).rejects.toMatchObject({ status: 400 })
})
