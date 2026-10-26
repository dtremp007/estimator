import { Outlet } from "@remix-run/react";

export const handle = {
	breadcrumb: 'Models',
}

export default function TakeoffModelsLayout() {
    return (
            <Outlet />
    )
}
