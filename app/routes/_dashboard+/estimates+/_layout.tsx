import { Outlet } from '@remix-run/react'

export const handle = {
	breadcrumb: 'Estimates',
}

export default function EstimatesLayout() {
	return <Outlet />
}
