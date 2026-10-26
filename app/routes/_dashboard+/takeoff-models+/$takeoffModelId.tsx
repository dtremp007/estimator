import { Outlet } from '@remix-run/react'

export const handle = {
	breadcrumb: 'Model',
}

export default function TakeoffModelLayout() {
	return (
		<div className="main-container">
			<Outlet />
		</div>
	)
}
