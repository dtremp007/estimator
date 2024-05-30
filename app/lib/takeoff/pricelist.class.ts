import { z } from "zod"
import { type LookupTable } from "./lookup-table"

export const PricelistItemSchema = z.object({
    name: z.string(),
    unitType: z.string(),
    pricePerUnit: z.coerce.number(),
    currency: z.string(),
    category: z.string(),
})

export type PricelistItem = z.infer<typeof PricelistItemSchema>

export const PricelistSchema = z.array(PricelistItemSchema)

export type Price = {
    value: number,
    currency: string,
}

type PricelistLookupHistoryEntry = {
    name: string,
    wasFound: boolean,
}

export class PriceLookupTable implements LookupTable<PricelistLookupHistoryEntry> {
	private table: Map<string, PricelistItem> = new Map()
    private lookupHistory: PricelistLookupHistoryEntry[] = []

	constructor(pricelist: PricelistItem[]) {
		pricelist.forEach(item => {
			this.table.set(item.name, item)
		})
	}

	get(name: string, defaultValue: Price = { value: 0, currency: '' }) {
		const item = this.table.get(name)

        this.addToLookupHistory({
            name,
            wasFound: Boolean(item),
        })

		if (!item) {
			return defaultValue
		}

		return {
			value: item.pricePerUnit,
			currency: item.currency,
		}
	}

    getCategoryItems(category: string) {
        const items = Array.from(this.table.values()).filter(item => item.category === category)
        this.addToLookupHistory({
            name: category,
            wasFound: items.length > 0,
        })
        return items
    }

    addToLookupHistory(entry: PricelistLookupHistoryEntry) {
        this.lookupHistory.push(entry)
    }

    getLookupHistory() {
        return this.lookupHistory
    }
}
