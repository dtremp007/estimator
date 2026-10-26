import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BuildingDimensions } from './building-dimensions.class'
import { CustomInputLookupTable } from './custom-user-input'
import { CustomVariableLookupTable } from './custom-variables'
import { executeTakeoffCode } from './execute.server'
import { PriceLookupTable } from './pricelist.class'
import { TakeOffApi } from './takeoff-api'

function fixture() {
	const prices = new PriceLookupTable(
		[
			['shingles', 3.25, 'roof'],
			['nails', 0.5, 'roof'],
			['siding', 2.75, 'walls'],
		].map(([name, pricePerUnit, category]) => ({
			name: String(name),
			pricePerUnit: Number(pricePerUnit),
			category: String(category),
			unitType: 'each',
			currency: 'USD',
		})),
	)
	const variables = new CustomVariableLookupTable([
		{
			id: 'factor-id',
			name: 'factor',
			description: '',
			value: '2',
			type: 'number',
		},
	])
	const inputs = new CustomInputLookupTable([
		{
			id: 'extra-id',
			name: 'extra',
			label: 'Extra',
			description: '',
			defaultValue: '11',
			type: 'number',
			props: '{}',
		},
	])
	const form = new FormData()
	form.set('extra', '13')
	inputs.addFormData(form)
	return new TakeOffApi({
		id: 'test',
		bd: new BuildingDimensions(17, 9, 31, 43, 5, 2),
		prices,
		variables,
		inputs,
	})
}

describe('executeTakeoffCode (real QuickJS)', () => {
	it('calculates asymmetric dimensions and preserves real lookup histories', async () => {
		const api = fixture()
		await executeTakeoffCode(
			`
			const factor = getVariable('factor', 1, { type: 'number', description: 'Waste' });
			const extra = getUserInput('extra', 4, {
				type: 'number', label: 'Extras', description: 'Allowance',
				componentProps: { min: 0 }
			});
			if (getVariable('missing', 7) !== 7) throw Error('variable default');
			if (getUserInput('missing', 5) !== 5) throw Error('input default');
			if (getPrice('shingles').value !== 3.25) throw Error('price');
			if (getPrice('missing').value !== 0) throw Error('missing price');
			const items = getCategoryItems('roof');
			if (items.length !== 2 || items[1].name !== 'nails') throw Error('category');
			items[0].pricePerUnit = 999; // Must be a copy, not a host price-list item.
			if (getCategoryItems('absent').length !== 0) throw Error('missing category');
			const floors = createSection('Floors');
			if (floors.addPart({ name: 'Floor', qty: bd.floorSurfaceArea * factor + extra,
				priceLookupKey: 'shingles' }) !== floors) throw Error('fluent return');
			floors.addPart({ name: 'Nails', qty: 7, priceLookupKey: 'nails' });
			if (floors.name !== 'Floors' || floors.parts.length !== 2 ||
				floors.serialize().parts[0].total !== 3467.75) throw Error('section');
			createSection('Walls').addPart({ name: 'Siding',
				qty: bd.exteriorWallSurfaceArea, priceLookupKey: 'siding' });
			const expected = {
				width: 17, length: 31, wallHeight: 9, totalInteriorWallsLength: 43,
				roofRisePerFoot: 5, soffitOverhangWidth: 2,
				floorSurfaceArea: 527, exteriorWallSurfaceArea: 864,
				interiorWallSurfaceArea: 774, exteriorWallLinearFeet: 96,
				interiorWallLinearFeet: 43, roofBaseLength: 35, roofBaseWidth: 21,
				slopeFactor: Math.sqrt(29) / 12, roofSurfaceArea: 35 * 21 * Math.sqrt(29) / 12
			};
			for (const [key, value] of Object.entries(expected)) {
				if (Math.abs(bd[key] - value) > 1e-9) throw Error('dimension ' + key);
			}
			`,
			api,
		)
		expect(api.getSections()).toEqual([
			{
				name: 'Floors',
				parts: [
					{
						name: 'Floor',
						qty: 1067,
						priceLookupKey: 'shingles',
						pricePerUnit: 3.25,
						total: 3467.75,
						currency: 'USD',
					},
					{
						name: 'Nails',
						qty: 7,
						priceLookupKey: 'nails',
						pricePerUnit: 0.5,
						total: 3.5,
						currency: 'USD',
					},
				],
			},
			{
				name: 'Walls',
				parts: [
					{
						name: 'Siding',
						qty: 864,
						priceLookupKey: 'siding',
						pricePerUnit: 2.75,
						total: 2376,
						currency: 'USD',
					},
				],
			},
		])
		expect(api.prices.getLookupHistory()).toEqual([
			{ name: 'shingles', wasFound: true },
			{ name: 'missing', wasFound: false },
			{ name: 'roof', wasFound: true },
			{ name: 'absent', wasFound: false },
			{ name: 'shingles', wasFound: true },
			{ name: 'nails', wasFound: true },
			{ name: 'siding', wasFound: true },
		])
		expect(api.variables.getLookupHistory()).toEqual([
			{
				id: 'factor-id',
				name: 'factor',
				value: '2',
				type: 'number',
				description: 'Waste',
			},
			{ id: '__new__', name: 'missing', value: '7', type: 'number' },
		])
		expect(api.inputs.getLookupHistory()).toEqual([
			{
				id: 'extra-id',
				name: 'extra',
				defaultValue: '13',
				type: 'number',
				label: 'Extras',
				description: 'Allowance',
				props: '{"min":0}',
				order: 0,
			},
			{
				name: 'missing',
				defaultValue: '5',
				type: 'number',
				label: 'missing',
				props: '{}',
				order: 1,
			},
		])
	})

	it('runs the existing demo calculation unchanged after its import/context preamble', async () => {
		const demo = readFileSync(new URL('./demo.ts', import.meta.url), 'utf8')
		const api = fixture()
		await executeTakeoffCode(
			demo.slice(demo.indexOf("createSection('Roofing')")),
			api,
		)
		expect(
			api.getSections().map(section => ({
				name: section.name,
				totals: section.parts.map(part => part.total),
			})),
		).toEqual([
			{ name: 'Roofing', totals: [65, 0.5] },
			{ name: 'Siding', totals: [27.5, 0.5] },
		])
	})

	it.each([
		`getPrice.constructor('return process')()`,
		`getPrice('shingles').constructor.constructor('return process')()`,
		`bd.constructor.constructor('return process')()`,
		`createSection('x').addPart.constructor('return process')()`,
		`getCategoryItems('roof')[0].constructor.constructor('return process')()`,
		`getVariable('data', {}).constructor.constructor('return process')()`,
		`getUserInput('data', {}).constructor.constructor('return process')()`,
	])('rejects a harmless process escape: %s', async code => {
		await expect(executeTakeoffCode(code, fixture())).rejects.toThrow(
			'Takeoff code failed or exceeded execution limits.',
		)
	})

	it('does not expose host facilities, private section state, or bridge globals', async () => {
		await expect(
			executeTakeoffCode(
				`
			for (const name of ['process', 'require', 'fetch', 'Buffer', '__takeoffBridge']) {
				if (typeof globalThis[name] !== 'undefined') throw Error(name);
			}
			if (createSection('x').prices !== undefined) throw Error('private prices');
		`,
				fixture(),
			),
		).resolves.toBeUndefined()
	})

	it.each([
		'while (true) {}',
		'getVariable("loop", { toJSON() { while (true) {} } })',
		'throw { get message() { while (true) {} }, toString() { while (true) {} } }',
	])(
		'bounds hostile execution without inspecting thrown objects: %s',
		async code => {
			const started = performance.now()
			await expect(executeTakeoffCode(code, fixture())).rejects.toThrow(Error)
			expect(performance.now() - started).toBeLessThan(2000)
			// Failed/disposed runtimes must not affect subsequent executions.
			await expect(
				executeTakeoffCode('getPrice("nails")', fixture()),
			).resolves.toBeUndefined()
		},
	)

	it('bounds guest heap allocation and can execute again after OOM', async () => {
		await expect(
			executeTakeoffCode(
				`
			const allocations = [];
			for (let i = 0; i < 128; i++) allocations.push(new ArrayBuffer(1024 * 1024));
		`,
				fixture(),
			),
		).rejects.toThrow(Error)
		await expect(
			executeTakeoffCode('getPrice("nails")', fixture()),
		).resolves.toBeUndefined()
	})

	it('sanitizes API failures, rejects invalid quantities and oversized code', async () => {
		for (const code of [
			`getPrice({ toString() { return 'shingles' } })`,
			`createSection('x').addPart({ name: 'x', qty: Infinity, priceLookupKey: 'nails' })`,
			`try { getPrice(null) } catch {} // caught bridge failures still fail the run`,
		]) {
			await expect(executeTakeoffCode(code, fixture())).rejects.toThrow(
				'Takeoff code failed or exceeded execution limits.',
			)
		}
		await expect(
			executeTakeoffCode(' '.repeat(1024 * 1024 + 1), fixture()),
		).rejects.toThrow('size limit')
	})

	it('isolates globals and prototypes between executions', async () => {
		await executeTakeoffCode(
			'globalThis.leak = 1; Object.prototype.leak = 1',
			fixture(),
		)
		await expect(
			executeTakeoffCode(
				`
			if (typeof leak !== 'undefined' || ({}).leak !== undefined) throw Error('leak');
		`,
				fixture(),
			),
		).resolves.toBeUndefined()
	})
})
