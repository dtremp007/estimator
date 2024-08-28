import { invariantResponse } from '@epic-web/invariant'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, Outlet, useMatches } from '@remix-run/react'
import { Fragment } from 'react/jsx-runtime'
import { z } from 'zod'
import { DashboardNav } from '#app/components/dashboard-nav.js'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '#app/components/ui/breadcrumb.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'

export const BreadcrumbHandle = z.object({ breadcrumb: z.any() })
export type BreadcrumbHandle = z.infer<typeof BreadcrumbHandle>

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: 'Dashboard',
	getSitemapEntries: () => null,
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true },
	})
	invariantResponse(user, 'User not found', { status: 404 })
	return json({})
}

const BreadcrumbHandleMatch = z.object({
	handle: BreadcrumbHandle,
})

export default function DashboardRoute() {
	const matches = useMatches()
	const breadcrumbs = matches
		.map(m => {
			const result = BreadcrumbHandleMatch.safeParse(m)
			if (!result.success || !result.data.handle.breadcrumb) return null

			if (m.pathname === '/') {
				return (
					<Link key={m.id} to="/dashboard">
						{result.data.handle.breadcrumb}
					</Link>
				)
			}

			return (
				<Link key={m.id} to={m.pathname}>
					{result.data.handle.breadcrumb}
				</Link>
			)
		})
		.filter(Boolean)

	return (
		<div className="flex min-h-screen border-b print:border-none">
			<DashboardNav />
			<div className="dashboard-content">
				<Breadcrumb className="breadcrumbs ml-4 mt-6  ">
					<BreadcrumbList>
						{breadcrumbs.map((breadcrumb, i, arr) => {
							if (i === arr.length - 1) {
								return <BreadcrumbPage key={i}>{breadcrumb}</BreadcrumbPage>
							}
							return (
								<Fragment key={i}>
									<BreadcrumbItem>
										<BreadcrumbLink asChild>{breadcrumb}</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
								</Fragment>
							)
						})}
					</BreadcrumbList>
				</Breadcrumb>
				<Outlet />
			</div>
		</div>
	)
}
