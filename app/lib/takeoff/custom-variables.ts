import { type Prisma } from '@prisma/client'
import { prisma } from '#app/utils/db.server.js'
import { type LookupTable } from './lookup-table'
import { coerce } from './utils'

export type TakeoffCustomVariable = Prisma.CustomVariableGetPayload<{
	select: {
		id: true
		name: true
		description: true
		value: true
		type: true
	}
}>

export type CustomVariableOptions = {
	name: string
	defaultValue: any
	type?: 'number' | 'string' | 'boolean'
	description?: string
}

export class CustomVariableLookupTable
	implements LookupTable<CustomVariableCreateBody>
{
	table = new Map<string, TakeoffCustomVariable>()
	lookupHistory: CustomVariableCreateBody[] = []

	constructor(variables: TakeoffCustomVariable[]) {
		variables.forEach(variable => {
			this.table.set(variable.name, variable)
		})
	}

	get<T>(
		name: string,
		defaultValue: T,
		options?: Omit<CustomVariableOptions, 'name' | 'defaultValue'>,
	) {
		const variable = this.table.get(name)

		this.addToLookupHistory({
			id: variable?.id ?? '__new__',
			name,
			value: variable?.value ?? defaultValue,
			...options,
		})

		if (!variable) {
			return defaultValue
		}

		return coerce(variable.value, variable.type) as T
	}

	addToLookupHistory(entry: {
		id: string
		name: string
		value: any
		type?: string
        description?: string
	}) {
		const type = entry.type ?? typeof entry.value
		const value =
			type === 'object' ? JSON.stringify(entry.value) : entry.value.toString()
		this.lookupHistory.push({
			id: entry.id,
			name: entry.name,
			description: entry.description,
			value: value,
			type: entry.type ?? typeof entry.value,
		})
	}

	getLookupHistory() {
		return this.lookupHistory
	}
}

type CustomVariableCreateBody = Omit<
	Prisma.CustomVariableCreateArgs['data'],
	'takeoffModel'
>

export async function upsertCustomVariable(
	takeoffModelId: string,
	variables: CustomVariableCreateBody[],
) {
	await prisma.takeoffModel.update({
		where: {
			id: takeoffModelId,
		},
		data: {
			variables: {
				upsert: variables.map(variable => ({
					where: { name: variable.name, id: takeoffModelId },
					update: variable,
					create: variable,
				})),
				deleteMany: {
					name: {
						notIn: variables.map(variable => variable.name),
					},
				},
			},
		},
	})
}
