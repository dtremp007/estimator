import { z } from 'zod'
import { prisma } from './db.server'

const ListTakeoffModelsSchema = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
		ownerName: z.string(),
		isShared: z.coerce.string().transform(value => value === '1'),
	}),
)

export async function listTakeoffModels(userId: string) {
	const modelsRaw = await prisma.$queryRaw`
        SELECT tm.id, tm.name, u.name AS ownerName,
            CASE
                WHEN c.entityId IS NOT NULL THEN 1
                ELSE 0
            END AS isShared
        FROM takeoffModel tm
        LEFT JOIN collaboration c ON tm.id = c.entityId AND c.userId = ${userId} AND c.entity = 'takeoffModel'
        LEFT JOIN user u ON tm.ownerId = u.id OR c.userId = u.id
        WHERE tm.ownerId = ${userId} OR tm.id IN (
            SELECT entityId
            FROM collaboration
            WHERE userId = ${userId} AND entity = 'takeoffModel'
        )
        ORDER BY tm.updatedAt DESC
    `

	return ListTakeoffModelsSchema.parse(modelsRaw)
}

const ListPriclistsSchema = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
        supplier: z.string(),
		isShared: z.coerce.string().transform(value => value === '1'),
	}),
)

export async function listPricelists(userId: string) {
	const pricelistsRaw = await prisma.$queryRaw`
        SELECT p.id, p.name, p.supplier,
            CASE
                WHEN c.entityId IS NOT NULL THEN 1
                ELSE 0
            END AS isShared
        FROM pricelist p
        LEFT JOIN collaboration c ON p.id = c.entityId AND c.userId = ${userId} AND c.entity = 'pricelist'
        WHERE p.ownerId = ${userId} OR p.id IN (
            SELECT entityId
            FROM collaboration
            WHERE userId = ${userId} AND entity = 'pricelist'
        )
    `
	return ListPriclistsSchema.parse(pricelistsRaw)
}

export async function logUserAction({
	userId,
	entity,
	entityId,
	action,
    duration,
	data,
}: {
	userId: string
	entity: string
	entityId: string
	action: string
    duration?: number
	data?: Record<string, any>
}) {
	await prisma.userAction.create({
		data: {
			userId,
			entity,
			entityId,
			action,
            duration,
			data: data ? JSON.stringify(data) : undefined,
		},
	})
}
