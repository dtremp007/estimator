import { data, type LoaderFunctionArgs, Outlet } from 'react-router'
import { requireUserWithRole } from '#app/utils/permissions.server.js'

export const handle = {
	breadcrumb: 'Admin',
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'admin')

	return data({})
}

export default function Layout() {
	return (
		<div className="main-container ">
			<Outlet />
		</div>
	)
}
