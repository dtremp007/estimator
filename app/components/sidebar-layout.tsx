import { useUncontrolled } from '@mantine/hooks'
import { Settings } from 'lucide-react'
import Sidebar from './sidebar'
import { Button } from './ui/button'

type SidebarLayoutProps = {
	children: React.ReactNode
	title: string
	description: string
	open?: boolean
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
			<div className="main relative mb-20 mt-16 px-4">
				<Button
					variant="ghost"
					className="absolute -top-24 right-1"
					onClick={() => setOpen(!open)}
				>
					<Settings />
				</Button>
				{props.children}
			</div>
		</>
	)
}
