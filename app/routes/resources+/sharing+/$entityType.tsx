import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { Pen, UserMinus, UserPlus } from 'lucide-react'
import React from 'react'
import { Badge } from '#app/components/ui/badge.js'
import { Button } from '#app/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog'
import { Input } from '#app/components/ui/input.js'
import { Label } from '#app/components/ui/label.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'

type Collaborator = {
	user: {
		id: string
		name: string
		email: string
	}
	accessLevel: string
}

async function getCollaborators(entityId: string, entityType: string) {
	const collaborations = await prisma.collaboration.findMany({
		select: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			accessLevel: true,
		},
		where: {
			entityId,
			entity: entityType,
		},
	})

	return collaborations
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	const url = new URL(request.url)
	const entityId = url.searchParams.get('entityId')
	const entityType = params.entityType

	invariantResponse(entityId, 'Entity not found', { status: 404 })
	invariantResponse(entityType, 'Entity type not found', { status: 404 })

	const collaborations = await getCollaborators(entityId, entityType)

	return json({ collaborations })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	const entityType = params.entityType

	invariantResponse(entityType, 'Entity type not found', { status: 404 })

	switch (intent) {
		case 'share':
			try {
				return await handleEntityShare(formData, entityType)
			} catch (error: Error | any) {
				const entityId = formData.get('entityId') as string

				return json(
					{
						error: { message: error.message },
						collaborations: await getCollaborators(entityId, entityType),
					},
					{ status: 400 },
				)
			}
		case 'removeCollaborator':
			return handleRemoveCollaborator(request, userId, formData, entityType)
	}

	return json({
		collaborations: getCollaborators(formData.get('id') as string, entityType),
	})
}
export function SharingDialog({
	entityId,
	entityType,
	disabled,
}: {
	entityId: string
	entityType: string
	disabled?: boolean
}) {
	const fetcher = useFetcher<typeof action>()
	const collaborations = fetcher.data?.collaborations as Collaborator[]
	const emailInputRef = React.useRef<HTMLInputElement>(null)

	React.useEffect(() => {
		fetcher.load(`/resources/sharing/${entityType}?entityId=${entityId}`)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entityId])

	React.useEffect(() => {
		if (!(fetcher.data as any)?.error?.message) {
			if (!emailInputRef.current) return
			emailInputRef.current.value = ''
		}
	}, [fetcher.data])

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					className="flex items-center gap-1"
					disabled={disabled}
				>
					<UserPlus className="size-4" />
					{!disabled && (
						<span className="text-xs leading-3 text-foreground/60">
							{collaborations?.length || ''}
						</span>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Share Pricelist</DialogTitle>
					<DialogDescription>
						Share this pricelist with another user.
					</DialogDescription>
					<p className="text-red-500">
						{(fetcher.data as any)?.error?.message}
					</p>
				</DialogHeader>
				<div className="">
					{collaborations &&
						collaborations?.map(collaboration => (
							<div
								key={collaboration.user.id}
								className="flex items-center justify-between py-2"
							>
								<div className='w-full pr-4'>
									<div className="flex w-full justify-between">
										<span>{collaboration.user.name}</span>
										<Badge>{collaboration.accessLevel}</Badge>
									</div>
									<div className="flex items-center gap-3">
										<div className="mt-1 text-sm text-foreground/60">
											{collaboration.user.email}
										</div>
										<button
											className="active:translate-y-px"
											onClick={() => {
												if (!emailInputRef.current) return
												emailInputRef.current.value = collaboration.user.email
												emailInputRef.current.focus()
											}}
										>
											<Pen size={14} />
										</button>
									</div>
								</div>
								<div>
									<fetcher.Form
										method="post"
										action={`/resources/sharing/${entityType}`}
									>
										<input type="hidden" name="entityId" value={entityId} />
										<input
											type="hidden"
											name="collaboratorId"
											value={collaboration.user.id}
										/>
										<Button
											variant="ghost"
											type="submit"
											name="intent"
											value="removeCollaborator"
										>
											<UserMinus className="size-4" />
										</Button>
									</fetcher.Form>
								</div>
							</div>
						))}
				</div>
				<fetcher.Form method="post" action={`/resources/sharing/${entityType}`}>
					<input type="hidden" name="intent" value="share" />
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-3 items-center gap-2">
							<input type="hidden" name="entityId" value={entityId} />
							<div className="col-span-2">
								<Label htmlFor="email">Email</Label>
								<Input type="email" name="email" required ref={emailInputRef} />
							</div>
							<div>
								<Label htmlFor="accessLevel">Access Level</Label>
								<select
									name="accessLevel"
									className="flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
									required
								>
									<option value="read">Read</option>
									<option value="read,write">Write</option>
								</select>
							</div>
						</div>
					</div>
					<DialogFooter className="mt-4">
						<Button type="submit" name="intent" value="share">
							Share
						</Button>
					</DialogFooter>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	)
}

async function handleEntityShare(formData: FormData, entityType: string) {
	const entityId = formData.get('entityId') as string
	const email = formData.get('email') as string
	const accessLevel = formData.get('accessLevel') as string

	const entity = await (prisma as any)[entityType].findFirst({
		where: {
			id: entityId,
		},
	})

	invariantResponse(entity, 'Not found', { status: 404 })

	// Find user by email
	const sharedUser = await prisma.user.findFirst({
		select: {
			id: true,
		},
		where: {
			email: email,
		},
	})

	if (!sharedUser) {
		throw new Error('Right now, we only support sharing with existing users.')
	}

	if (sharedUser.id === entity.ownerId) {
		throw new Error('You are trying to share with the owner.')
	}

	const existingCollaborator = await prisma.collaboration.findFirst({
		where: {
			userId: sharedUser.id,
			entityId,
			entity: entityType,
		},
	})

	if (existingCollaborator) {
		// Update access level
		await prisma.collaboration.updateMany({
			where: {
				userId: sharedUser.id,
				entityId,
				entity: entityType,
			},
			data: {
				accessLevel,
			},
		})
	} else {
		await prisma.collaboration.create({
			data: {
				accessLevel,
				entity: entityType,
				entityId: entityId,
				userId: sharedUser.id,
			},
		})
	}

	return json({
		collaborations: await getCollaborators(entityId, entityType),
	})
}

async function handleRemoveCollaborator(
	request: Request,
	userId: string,
	formData: FormData,
	entityType: string,
) {
	const entityId = formData.get('entityId') as string
	const collaboratorId = formData.get('collaboratorId') as string

	const entity = await (prisma as any)[entityType].findFirst({
		where: {
			id: entityId,
		},
	})
	invariantResponse(entity, 'Not found', { status: 404 })

	const isOwner = entity.ownerId === userId
	invariantResponse(isOwner, 'Unauthorized', { status: 403 })

	await prisma.collaboration.deleteMany({
		where: {
			userId: collaboratorId,
			entityId,
			entity: entityType,
		},
	})

	const collaborations = await getCollaborators(entityId, entityType)

	return json({ collaborations })
}
