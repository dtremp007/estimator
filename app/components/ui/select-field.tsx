import { type FieldMetadata, useInputControl } from '@conform-to/react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { Label } from './label'

type SelectFieldProps = {
	// You can use the `FieldMetadata` type to define the `meta` prop
	// And restrict the type of the field it accepts through its generics
	meta: FieldMetadata<string>
	options: Array<{ label: string; value: string }>
	label: string
    placeholder?: string
}

export function SelectField({ meta, options, label, placeholder }: SelectFieldProps) {
	const control = useInputControl(meta)

	return (
		<Select
			name={meta.name}
			value={control.value}
			onValueChange={value => {
				control.change(value)
			}}
			onOpenChange={open => {
				if (!open) {
					control.blur()
				}
			}}
		>
			<Label>{label}</Label>
			<SelectTrigger>
				<SelectValue placeholder={placeholder}/>
			</SelectTrigger>
			<SelectContent>
					{options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
			</SelectContent>
		</Select>
	)
}
