import { useHotkeys, useUncontrolled } from '@mantine/hooks'
import { PanelRight } from 'lucide-react'
import { cn } from '#app/utils/misc.js'
import Sidebar from './sidebar'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip'

type SidebarLayoutProps = {
	children: React.ReactNode
	title: string
	description: string
	open?: boolean
	className?: string
	onOpenChange?: (open: boolean) => void
	sidebarContent: React.ReactNode
}

export function SidebarLayout(props: SidebarLayoutProps) {
	const [open, setOpen] = useUncontrolled({
		value: props.open,
		defaultValue: false,
		finalValue: props.open,
		onChange: props.onOpenChange,
	})

	// @ts-expect-error - Mantine doesn't have types for useHotkeys
	useHotkeys([['mod+J', () => setOpen(pre => !pre)]])

	return (
		<>
			<Sidebar
				title={props.title}
				description={props.description}
				open={open}
				onOpenChange={setOpen}
			>
				{props.sidebarContent}
			</Sidebar>
			<div
				className={cn(
					'main relative md:h-[calc(100vh-100px)]',
					props.className,
				)}
			>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								className="absolute -top-10 right-1"
								onClick={() => setOpen(!open)}
							>
								<PanelRight />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>Toggle sidebar (⌘+J)</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<ScrollArea className="h-full">{props.children}</ScrollArea>
			</div>
		</>
	)
}
