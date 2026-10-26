import { type BuildingDimensions } from './building-dimensions.class'
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
		const total = price.value * qty

		this.parts.push({
			name,
			qty,
			priceLookupKey,
			pricePerUnit: price.value,
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
	public bd: BuildingDimensions
	public prices: PriceLookupTable
	public inputs: CustomInputLookupTable
	public variables: CustomVariableLookupTable

	private sections: EstimateSection[] = []

	constructor({
		id,
		bd,
		prices,
		inputs,
		variables,
	}: {
		id: string
		bd: BuildingDimensions
		prices: PriceLookupTable
		inputs: CustomInputLookupTable
		variables: CustomVariableLookupTable
	}) {
		this.id = id
		this.bd = bd
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
}
