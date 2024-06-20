import React from 'react'
import _ from 'underscore'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'

interface Column<
	T extends Record<string, any>,
	K extends keyof T = Extract<keyof T, string>,
> extends React.TdHTMLAttributes<HTMLTableCellElement> {
	key: K
	label?: React.ReactNode
	format?: (value: T[K]) => React.ReactNode
	extract?: (row: T) => any
}

type ExtractedColumn<T extends Record<string, any>> = {
	[K in Extract<keyof T, string>]: Column<T, K>
}[Extract<keyof T, string>]

interface DynamicTableProps<
	T extends Record<string, any>[],
	U extends T[number] = T[number],
> {
	data?: T
	columns: (ExtractedColumn<U> | Extract<keyof U, string>)[]
	formatLabel?: (key: string) => React.ReactNode
}

export function DynamicTable<T extends Record<string, any>[]>({
	data,
	columns,
	formatLabel: labelFormatter,
}: DynamicTableProps<T>) {
	const _columns = React.useMemo(
		() =>
			columns.map(column => {
				if (typeof column === 'string') {
					return {
						key: column,
						label: labelFormatter ? labelFormatter(column) : column,
					} as Column<T[number]>
				}

				if (!column.label) {
					column.label = labelFormatter
						? labelFormatter(column.key)
						: column.key
				}

				return column
			}),
		[columns, labelFormatter],
	)

	const Header = React.useMemo(() => {
		return (
			<TableHeader>
				<TableRow>
					{_columns
						.map(obj => _.omit(obj, 'extract', 'format'))
						.map(({ key, label, ...props }) => (
							<TableHead key={key} {...props}>
								{label}
							</TableHead>
						))}
				</TableRow>
			</TableHeader>
		)
	}, [_columns])

	const Body = React.useMemo(() => {
		if (!data || data.length === 0) return null

		return (
			<TableBody>
				{data.map((row, i) => (
					<TableRow key={i}>
						{_columns.map(({ key, format, extract, ...props }) => (
							<TableCell key={key} {...props}>
								{format
									? format(extract ? extract(row) : row[key])
									: extract
										? extract(row)
										: row[key]}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		)
	}, [data, _columns])

	return (
		<Table>
			{Header}
			{Body}
		</Table>
	)
}
