/**
 * The functions available inside a takeoff model's code, shown in the
 * "Functions" tab of the code editor's sidebar. Keep in sync with
 * `createContext` in ./context.ts and the declarations in ./types.d.ts.
 */
export type TakeoffFunctionReference = {
	name: string
	signature: string
	description: string
	example: string
}

export const takeoffFunctionReference: TakeoffFunctionReference[] = [
	{
		name: 'createSection',
		signature: 'createSection(name): EstimateSection',
		description:
			'Creates a section of the estimate, such as "Lumber" or "Plumbing". Add parts to it with addPart.',
		example: "const lumberSection = createSection('Lumber')",
	},
	{
		name: 'section.addPart',
		signature: 'section.addPart({ name, qty, priceLookupKey })',
		description:
			'Adds a part to a section. priceLookupKey is the name of the price list item that prices it; pick a price list in the Price list tab to get suggestions.',
		example: `lumberSection.addPart({
	name: '',
	qty: 1,
	priceLookupKey: '',
})`,
	},
	{
		name: 'getUserInput',
		signature: 'getUserInput(name, defaultValue, options?)',
		description:
			'Adds an input to the estimate form and returns what the user entered, or the default value.',
		example: "const width = getUserInput('Width', 20)",
	},
	{
		name: 'getCount',
		signature: 'getCount(name, defaultValue?, options?): number',
		description:
			'Adds a number input with + and - buttons to the estimate form and returns its value.',
		example: "const windowCount = getCount('Windows', 4)",
	},
	{
		name: 'insertHeading',
		signature: 'insertHeading(name, description?)',
		description:
			'Adds a heading to the estimate form, to group the inputs that follow it.',
		example: "insertHeading('Openings', 'Doors and windows')",
	},
	{
		name: 'getVariable',
		signature: 'getVariable(name, defaultValue, options?)',
		description:
			"Returns a variable for this model. Variables can be changed on the model's page without editing the code, for example waste factors.",
		example: "const wasteFactor = getVariable('Waste factor', 1.1)",
	},
	{
		name: 'getPrice',
		signature: 'getPrice(name): PricelistItem',
		description:
			'Looks up a price list item by name and returns it (pricePerUnit, unitType, currency, …). Returns a $0 item if the name is not found.',
		example: "const plywood = getPrice('')",
	},
	{
		name: 'getCategoryItems',
		signature: 'getCategoryItems(category): PricelistItem[]',
		description: 'Returns every price list item in a category.',
		example: "const bathroomItems = getCategoryItems('')",
	},
	{
		name: 'BuildingDimensions',
		signature: 'new BuildingDimensions({ width, length, wallHeight, … })',
		description:
			'Works out building measurements (floor, wall and roof areas, linear feet of walls) from the basic dimensions.',
		example: `const bd = new BuildingDimensions({
	width,
	length,
	wallHeight,
	floorThickness,
	totalInteriorWallsLength,
	roofRisePerFoot,
	soffitOverhangWidth,
})`,
	},
]
