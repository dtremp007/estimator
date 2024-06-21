import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { requireUserWithRole } from '#app/utils/permissions.server.js'

export const handle = {
	breadcrumb: 'Admin',
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	return json({})
}

export default function Layout() {
	return (
		<div className="main-container ">
			<Outlet />
		</div>
	)
}
