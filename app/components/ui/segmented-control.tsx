import React from 'react'

/*
 * Read the blog post here:
 * https://letsbuildui.dev/articles/building-a-segmented-control-component
 */
export function SegmentedControl({
	name,
	data,
	label,
	defaultValue,
}: {
	name: string
	data: ({ label: string; value: string } | string)[]
	label: string
	defaultValue?: string
}) {
	const _data = data.map(item => {
		if (typeof item === 'string') {
			return {
				label: item,
				value: item,
			}
		}
		return item
	})

	const [value, setValue] = React.useState(defaultValue || _data[0].value)
	const onInputChange = (value: string, index: number) => {
		setValue(value)
	}

	return (
		<div className="">
			<h3 className="text-sm font-medium">{label}</h3>
			<div className="flex max-w-md gap-2 rounded bg-muted p-1">
				{_data?.map((item, i) => (
					<label key={item.value} className='w-full'>
						<input
							type="radio"
							value={item.value}
							id={item.label}
							name={name}
							className="peer sr-only"
							onChange={() => onInputChange(item.value, i)}
							checked={value === item.value}
						/>
						<div className="cursor-pointer rounded px-2 py-2 text-center text-nowrap text-sm text-secondary-foreground/80 peer-checked:bg-background peer-checked:text-foreground peer-checked:font-bold peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring">
							{item.label}
						</div>
					</label>
				))}
			</div>
		</div>
	)
}
