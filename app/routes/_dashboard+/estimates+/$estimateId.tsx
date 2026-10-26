import { Outlet } from '@remix-run/react'

export const handle = {
	breadcrumb: 'Estimate',
}

export default function EstimationLayout() {
	return <Outlet />
}
