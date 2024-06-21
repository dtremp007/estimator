import { invariant } from "@epic-web/invariant"
import { type LoaderFunctionArgs, redirect, type ActionFunctionArgs } from "@remix-run/node"
import { authenticator, getImpersonator, IMPERSONATOR_SESSION_KEY, sessionKey } from "#app/utils/auth.server.js"
import { prisma } from "#app/utils/db.server.js"
import { requireAdmin } from "#app/utils/permissions.server.js"
import { authSessionStorage } from "#app/utils/session.server.js"

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
    const intent = formData.get('intent') as string

	invariant(intent === 'start' || intent === 'stop', 'invalid intent')

	const cookieSession = await authSessionStorage.getSession(request.headers.get('cookie'))

	if (intent === 'start') {
		const userId = formData.get('userId')?.toString()

		invariant(userId, 'Must provide a userId')

		const adminId = await requireAdmin(request)

		invariant(userId !== adminId, 'Self impersonation not allowed')

		const currentSessionId = cookieSession.get(sessionKey)

		const impersonatorSession = await prisma.session.create({
			data: {
				userId: userId,
				expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			},
		})

		cookieSession.set(IMPERSONATOR_SESSION_KEY, currentSessionId)
		cookieSession.set(sessionKey, impersonatorSession.id)
		const newCookie = await authSessionStorage.commitSession(cookieSession, {
			expires: impersonatorSession.expirationDate,
		})

		return redirect('/dashboard', {
			headers: { 'set-cookie': newCookie },
		})
	}

	if (intent === 'stop') {
		const impersonator = await getImpersonator(request)

		invariant(impersonator, 'Must be impersonating to stop impersonating')

		cookieSession.set(sessionKey, impersonator.session.id)
		cookieSession.unset(IMPERSONATOR_SESSION_KEY)

		const newCookie = await authSessionStorage.commitSession(cookieSession, {
			expires: impersonator.session.expirationDate,
		})

		return redirect('/admin/users', {
			headers: { 'set-cookie': newCookie },
		})
	}
}

export async function loader({ request }: LoaderFunctionArgs) {
	const admin = requireAdmin(request)

	if (!admin) {
		return redirect('/')
	}

	return redirect('/admin/users')
}
