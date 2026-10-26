import { Outlet } from '@remix-run/react'

export const handle = {
	breadcrumb: 'Pricelists',
}

export default function PricelistsLayout() {
	return <Outlet />
}
