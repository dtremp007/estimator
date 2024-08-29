import { useMediaQuery } from '@mantine/hooks'
import { Link, useLocation, useMatches } from '@remix-run/react'
import {
	Box,
	Calculator,
	Home,
	ListChecks,
	MenuIcon,
    Users,
} from 'lucide-react'
import React from 'react'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '#app/components/ui/drawer'
import { cn } from '#app/utils/misc.js'
import { useUser } from '#app/utils/user.js'
import { Button } from './ui/button'

const navItems = [
	{
		icon: Home,
		label: 'Dashboard',
		href: '/dashboard',
        role: 'user'
	},
	{
		icon: Calculator,
		label: 'Estimations',
		href: '/estimates',
        role: 'user'
	},
	{
		icon: ListChecks,
		label: 'Prices',
		href: '/pricelists',
        role: 'user'
	},
	{
		icon: Box,
		label: 'Models',
		href: '/takeoff-models',
        role: 'user'
	},
    {
        icon: Users,
        label: 'Users',
        href: '/admin/users',
        role: 'admin',
    }
]

interface DashboardProps {
	className?: string
}

export function DashboardNav({ className }: DashboardProps) {
	const [open, setOpen] = React.useState(false)
	const matches = useMatches()
	const isDesktop = useMediaQuery('(min-width: 768px)')
	const location = useLocation()
    const user = useUser()

	React.useEffect(() => {
		if (!open && isDesktop) return

		setOpen(false)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.pathname])

	const Menu = (
		<>
			{navItems
            .filter(item => user.roles.some(role => role.name === item.role))
            .map((item, index) => (
				<Link
					key={index}
					to={item.href}
					className={cn(
						'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
						{
							'bg-muted text-primary': matches.some(
								m => m.pathname === item.href,
							),
						},
					)}
				>
					<item.icon className="h-4 w-4" />
					{item.label}
				</Link>
			))}
		</>
	)

	if (isDesktop) {
		return (
			<aside
				className={cn(
					'sticky top-14 hidden h-[calc(100vh-56px)] w-[250px] border-r border-border pt-6 sm:block',
					className,
				)}
			>
				<nav className="grid items-start px-4 text-sm font-medium">{Menu}</nav>
			</aside>
		)
	}

	return (
		<>
			<div className="fixed bottom-8 right-8 z-50  ">
				<Button onClick={() => setOpen(true)}>
					<MenuIcon />
				</Button>
			</div>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Menu</DrawerTitle>
						<DrawerClose />
					</DrawerHeader>
					<nav className="grid items-start px-4 text-sm font-medium">
						<Button asChild>
							<Link to="/estimates/new">New Estimate</Link>
						</Button>
						<div className="mt-4">{Menu}</div>
					</nav>
					<DrawerFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Close
						</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</>
	)
}
