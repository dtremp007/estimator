import vm from 'node:vm'
import { type Prisma } from '@prisma/client'
import {
	createContext,
	CustomInputLookupTable,
	CustomVariableLookupTable,
	PriceLookupTable,
	TakeOffApi,
} from '../lib/takeoff'
import { prisma } from './db.server'

type TakeoffModel = Prisma.TakeoffModelGetPayload<{
	select: {
		id: true
		inputs: true
		variables: true
		code: true
	}
}>

type Pricelist = Prisma.PricelistGetPayload<{
	select: {
		id: true
		items: {
			select: {
				id: true
				name: true
				category: true
				unitType: true
				pricePerUnit: true
				currency: true
			}
		}
	}
}>

export async function runAndSaveTakeoffModel(
	takeoffModel: TakeoffModel,
	pricelists: Pricelist[],
	formData?: FormData,
) {
	const takeoffApi = await runTakeoffModel(takeoffModel, pricelists, formData)

	const inputs = takeoffApi.inputs.getLookupHistory()
	const variables = takeoffApi.variables.getLookupHistory()

	const newTakeoffModel = await prisma.takeoffModel.update({
		where: { id: takeoffModel.id },
		select: {
			id: true,
			inputs: {
				orderBy: {
					order: 'asc',
				},
			},
			variables: true,
		},
		data: {
			code: takeoffModel.code,
			//
			inputs: {
				upsert: inputs.map(input => ({
					where: { name: input.name, id: input.id ?? '__new__' },
					update: {
						label: input.label,
						description: input.description,
						defaultValue: input.defaultValue,
						type: input.type,
						props: input.props,
						order: input.order,
                        component: input.component,
					},
					create: {
						name: input.name,
						label: input.label,
						description: input.description,
						defaultValue: input.defaultValue,
						type: input.type,
						props: input.props,
                        component: input.component,
						order: input.order,
					},
				})),
				deleteMany: {
					name: {
						notIn: inputs.map(input => input.name),
					},
				},
			},
			//
			variables: {
				upsert: variables.map(variable => ({
					where: { name: variable.name, id: variable.id ?? '__new__' },
					update: {
						value: variable.value,
						type: variable.type,
						description: variable.description,
					},
					create: {
						value: variable.value,
						type: variable.type,
						description: variable.description,
						name: variable.name,
					},
				})),
				deleteMany: {
					name: {
						notIn: variables.map(variable => variable.name),
					},
					isManuallyCreated: false,
				},
			},
		},
	})

	return {
		logs: takeoffApi.getLogs(),
		takeoffModel: newTakeoffModel,
	}
}

export async function runTakeoffModelSaveResults(
	estimateId: string,
	takeoffModel: TakeoffModel,
	pricelists: Pricelist[],
	formData?: FormData,
) {
	const takeoffApi = await runTakeoffModel(takeoffModel, pricelists, formData)

	const results = takeoffApi
		.getSections()
		.map(section => {
			return section.parts.map(part => {
				return {
					name: part.name,
					priceLookupKey: part.priceLookupKey,
					qty: part.qty,
					pricePerUnit: part.pricePerUnit,
					total: part.total,
					currency: part.currency,
					section: section.name,
				}
			})
		})
		.flat()

	const updatedFormData = takeoffApi.inputs.getLookupHistory().map(input => {
		return {
			name: input.name,
			value: input.defaultValue,
			type: input.type,
		}
	})

	await prisma.estimate.update({
		where: { id: estimateId },
		data: {
			results: {
				upsert: results.map(result => {
					return {
						where: { estimateId_name: { estimateId, name: result.name } },
						create: result,
						update: result,
					}
				}),
			},
			formData: {
				upsert: updatedFormData.map(input => {
					return {
						where: { estimateId_name: { estimateId, name: input.name } },
						create: input,
						update: input,
					}
				}),
			},
		},
	})
}

export async function runTakeoffModel(
	takeoffModel: TakeoffModel,
	pricelists: Pricelist[],
	formData?: FormData,
) {
	const inputsLookupTable = new CustomInputLookupTable(takeoffModel.inputs)
	if (formData) {
		inputsLookupTable.addFormData(formData)
	}
	const variablesLookupTable = new CustomVariableLookupTable(
		takeoffModel.variables,
	)
	const prices = new PriceLookupTable(
		pricelists.flatMap(pricelist => pricelist.items),
	)

	const takeoffApi = new TakeOffApi({
		id: takeoffModel.id,
		prices,
		inputs: inputsLookupTable,
		variables: variablesLookupTable,
	})

	const vmContext = vm.createContext(createContext(takeoffApi))

	try {
		vm.runInContext(takeoffModel.code, vmContext, {timeout: 2000})
	} catch (error: Error | any) {
		takeoffApi.log(error.message)
        const errors = takeoffApi.getLogs().join('\n')
        throw new Error(errors)
	}

	return takeoffApi
}
