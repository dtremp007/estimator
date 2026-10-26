import { type Prisma } from '@prisma/client'
import { type LookupTable } from './lookup-table'
import { coerce } from './utils'

export type TakeoffCustomInput = Prisma.CustomInputElementGetPayload<{
	select: {
		id: true
		name: true
		label: true
		description: true
		defaultValue: true
		type: true
		props: true
	}
}>

export type CustomInputElementOptions = {
	name: string
	defaultValue: any
	type?: 'number' | 'string' | 'boolean'
	label?: string
	description?: string
	componentProps?: Record<string, any>
}

export class CustomInputLookupTable
	implements LookupTable<CustomInputCreateBody>
{
	table = new Map<string, TakeoffCustomInput>()
	lookupHistory: CustomInputCreateBody[] = []
	formData?: FormData

	constructor(inputs: TakeoffCustomInput[]) {
		inputs.forEach(input => {
			this.table.set(input.name, input)
		})
	}

	addFormData(formData: FormData) {
		this.formData = formData
	}

	get<T>(
		name: string,
		defaultValue: T,
		options?: Omit<CustomInputElementOptions, 'name' | 'defaultValue'>,
	) {
		let value = defaultValue
		const input = this.table.get(name)
		if (input) {
			const formValue = this.formData?.get(name)
			if (formValue) {
				value = coerce(formValue.toString(), input.type) as T
			} else {
				value = coerce(input.defaultValue, input.type) as T
			}
		}

		this.addToLookupHistory({
			id: input?.id,
			name,
			defaultValue: value,
			...options,
		})

		return value
	}

	addToLookupHistory(entry: {
		id?: string
		name: string
		label?: string
		description?: string
		defaultValue: any
		type?: string
		componentProps?: Record<string, any>
	}) {
		const type = entry.type ?? typeof entry.defaultValue
		const value =
			type === 'object'
				? JSON.stringify(entry.defaultValue)
				: entry.defaultValue.toString()

		this.lookupHistory.push({
			id: entry.id,
			name: entry.name,
			label: entry.label ?? entry.name,
			description: entry.description,
			defaultValue: value,
			type: type,
			props: JSON.stringify(entry.componentProps ?? {}),
			order: this.lookupHistory.length,
		})
	}

	getLookupHistory() {
		return this.lookupHistory
	}
}

type CustomInputCreateBody = Omit<
	Prisma.CustomInputElementCreateArgs['data'],
	'takeoffModel' | 'takeoffModelId'
>
