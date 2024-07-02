import { type CustomInputLookupTable } from './custom-user-input'
import { type CustomVariableLookupTable } from './custom-variables'
import { type PriceLookupTable } from './pricelist.class'

export type CalculatedItem = {
	name: string
	qty: number
	priceLookupKey: string
	pricePerUnit: number
	total: number
	currency: string
}

export class EstimateSection {
	constructor(
		public name: string,
		public parts: CalculatedItem[],
		private prices: PriceLookupTable,
	) {
		this.name = name
		this.parts = parts
		this.prices = prices
	}

	addPart({
		name,
		qty,
		priceLookupKey,
	}: {
		name: string
		qty: number
		priceLookupKey: string
	}) {
		const price = this.prices.get(priceLookupKey)
		const total = price.pricePerUnit * qty

		this.parts.push({
			name,
			qty,
			priceLookupKey,
			pricePerUnit: price.pricePerUnit,
			total,
			currency: price.currency,
		})

		return this
	}

	serialize() {
		return {
			name: this.name,
			parts: this.parts,
		}
	}
}

export class TakeOffApi {
	public id: string
	public prices: PriceLookupTable
	public inputs: CustomInputLookupTable
	public variables: CustomVariableLookupTable

	private sections: EstimateSection[] = []
    private logs: string[] = []

	constructor({
		id,
		prices,
		inputs,
		variables,
	}: {
		id: string
		prices: PriceLookupTable
		inputs: CustomInputLookupTable
		variables: CustomVariableLookupTable
	}) {
		this.id = id
		this.prices = prices
		this.inputs = inputs
		this.variables = variables
	}

	createSection(name: string) {
		const section = new EstimateSection(name, [], this.prices)
		this.sections.push(section)

		return section
	}

	getSections() {
		return this.sections.map(section => section.serialize())
	}

    getLogs() {
        return this.logs
    }

    log(message: string) {
        this.logs.push(message)
    }
}
