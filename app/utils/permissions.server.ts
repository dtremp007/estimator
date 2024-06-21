import { Prisma } from '@prisma/client'
import { json } from '@remix-run/node'
import { z } from 'zod'
import { requireUserId } from './auth.server.ts'
import { prisma } from './db.server.ts'
import { type PermissionString, parsePermissionString } from './user.ts'

const PermissionDetailsSchema = z.object({
	userId: z.string(),
	isOwner: z.coerce.boolean(),
	isShared: z.coerce.boolean(),
	accessLevel: z.string().nullable(),
})

type PermissionDetails = z.infer<typeof PermissionDetailsSchema>

type Entity = {
	id: string
	ownerId?: string
}

/**
 * This function first gets the signed-in user.
 * Then it checks if the user owns the entity with the given id.
 * If the user does not own the entity, it checks if the user has collab access to the entity.
 * And finally, if the user does not have collab access, it checks if the user has the given permission.
 * If the user does not have the permission, it throws an error.
 *
 * If no entity is provided, it just checks if the user has the given permission.
 *
 * @returns If entity is provided, it returns an object of userId, isOwner, isShared, and accessLevels.
 */
export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
): Promise<string>

export async function requireUserWithPermission<T extends Entity>(
	request: Request,
	permission: PermissionString,
	entity: T,
): Promise<PermissionDetails>

export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
	entity?: Entity,
): Promise<string | PermissionDetails> {
	const userId = await requireUserId(request)
	const permissionData = parsePermissionString(permission)

	if (!entity) {
		const user = await prisma.user.findFirst({
			select: { id: true },
			where: {
				id: userId,
				roles: {
					some: {
						permissions: {
							some: {
								entity: permissionData.entity,
								action: permissionData.action,
								access: permissionData.access
									? { in: permissionData.access }
									: undefined,
							},
						},
					},
				},
			},
		})

		if (!user) {
			throw json(
				{
					error: 'Unauthorized',
					requiredPermission: permissionData,
					message: `Unauthorized: required permissions: ${permission}`,
				},
				{ status: 403 },
			)
		}

		return userId
	}

	if (!entity.id) {
		throw new Error('entity.id is required')
	}

	if (entity?.ownerId === userId) {
		return {
			userId,
			isOwner: true,
			isShared: false,
			accessLevel: null,
		}
	}

	const rawUser = await prisma.$queryRaw`
        SELECT
            u.id as userId,
            CASE
                WHEN ue.id IS NOT NULL THEN 1
                ELSE 0
            END as isOwner,
            CASE
                WHEN c.id IS NOT NULL THEN 1
                ELSE 0
            END as isShared,
            c.accessLevel
        FROM user u
        LEFT JOIN ${Prisma.raw(permissionData.entity)} ue ON ue.ownerId = u.id AND ue.id = ${entity.id}
        LEFT JOIN collaboration c ON c.userId = u.id AND c.entityId = ${entity.id} AND c.entity = ${permissionData.entity}
        WHERE u.id = ${userId}
        LIMIT 1;
` as unknown[]

	try {
		const user = PermissionDetailsSchema.parse(rawUser[0])
		return user
	} catch (error) {
		throw json(
			{
				error: 'Unauthorized',
				requiredPermission: permissionData,
				message: `Unauthorized: required permissions: ${permission}`,
			},
			{ status: 403 },
		)
	}
}

export function assignPermissionsToEntity<T extends Entity>(
    entity: T,
    details: Omit<PermissionDetails, 'userId'> & { userId?: string },
) {
    delete details.userId
    return Object.assign(entity, details) as T & Omit<PermissionDetails, 'userId'>
}


export async function requireUserWithRole(request: Request, name: string) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: { id: userId, roles: { some: { name } } },
	})
	if (!user) {
		throw json(
			{
				error: 'Unauthorized',
				requiredRole: name,
				message: `Unauthorized: required role: ${name}`,
			},
			{ status: 403 },
		)
	}
	return user.id
}

export async function isUserAdmin(userId: string) {
	const user = await prisma.user.findFirst({
		where: {
			id: userId,
			roles: {
				some: {
					name: 'admin',
				},
			},
		},
	})
	return !!user
}

export async function requireAdmin(request: Request) {
    return requireUserWithRole(request, 'admin')
}
