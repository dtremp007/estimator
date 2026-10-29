import { redirect, type LoaderFunctionArgs } from 'react-router'
import { requireUserId, logout } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getRequestPath } from '#app/utils/misc.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({ where: { id: userId } })
	if (!user) {
		const loginParams = new URLSearchParams([
			['redirectTo', getRequestPath(request)],
		])
		const redirectTo = `/login?${loginParams}`
		await logout({ request, redirectTo })
		return redirect(redirectTo)
	}
	return redirect(`/users/${user.username}`)
}
