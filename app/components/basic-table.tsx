import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'

interface BasicTableProps{
	title: string
	description: string
	headers: string[]
	actionButton?: React.ReactNode
    children: React.ReactNode
}

export default function BasicTable({
	title,
	description,
	headers,
	children,
	actionButton,
}: BasicTableProps) {
	return (
		<Card className="">
			<CardHeader className="flex flex-row items-center">
				<div className="grid gap-2">
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<div className="ml-auto">{actionButton}</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							{headers.map((header, index) => (
								<TableHead key={index}>{header}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
                        {children}
                    </TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
