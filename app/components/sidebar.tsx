import { useMediaQuery } from '@mantine/hooks'
import React from 'react'
import { Button } from '#app/components/ui/button.js'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '#app/components/ui/drawer'
import { cn } from '#app/utils/misc.js'

type SidebarProps = {
	title: string
	description: string
	open: boolean
	onOpenChange: (open: boolean) => void
	children?: React.ReactNode
}

export default function Sidebar({
	open,
	onOpenChange,
	children,
	title,
	description,
}: SidebarProps) {
	const isDesktop = useMediaQuery('(min-width: 768px)')

	if (isDesktop) {
		return (
			<aside
				className={cn(
					'sidebar transition-width z-10 h-full w-0 overflow-y-auto border-l border-border bg-background duration-300 ease-out',
					open ? 'w-96' : 'w-0',
				)}
			>
				<div className="w-80 translate-x-4">
					<div className="grid gap-1.5 py-4 text-left">
						<h2 className="text-lg font-semibold leading-none tracking-tight">
							{title}
						</h2>
						<p className="text-sm text-muted-foreground">{description}</p>
					</div>
					{children}
				</div>
			</aside>
		)
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader className="text-left">
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>{description}</DrawerDescription>
				</DrawerHeader>
                <div className='px-4'>
				{children}
                </div>
				<DrawerFooter className="pt-2">
					<DrawerClose asChild>
						<Button variant="outline">Done</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
