/**
 * Defines the dimensions and characteristics of a building used for various construction calculations.
 */
declare type BuildingDimensionsData = {
	/** The width of the building. */
	width: number
	/** The length of the building. */
	length: number
	/** The height of the walls of the building. */
	wallHeight: number
	/** The thickness of the floor of the building. */
	floorThickness: number
	/** The total length of all interior walls combined. */
	totalInteriorWallsLength: number
	/** The rise of the roof per foot horizontally. */
	roofRisePerFoot: number
	/** The width of the soffit overhang. */
	soffitOverhangWidth: number
}

/**
 * Represents the dimensions of a building, providing various measurements important for construction estimation.
 */
declare class BuildingDimensions {
	/** The width of the building. */
	public width: number
	/** The length of the building. */
	public length: number
	/** The height of the walls of the building. */
	public wallHeight: number
	/** The thickness of the floor of the building. */
	public floorThickness: number
	/** The total length of all interior walls combined. */
	public totalInteriorWallsLength: number
	/** The rise of the roof per foot horizontally. */
	public roofRisePerFoot: number
	/** The width of the soffit overhang. */
	public soffitOverhangWidth: number

	/**
	 * Constructs a new BuildingDimensions instance using specified dimension data.
	 * @param obj The dimension data for the building.
	 */
	constructor(obj: BuildingDimensionsData)

	/** Calculates the surface area of the building's floor. */
	get floorSurfaceArea(): number

	/** Calculates the surface area of the building's exterior walls, including thickness of the floor */
	get exteriorWallSurfaceArea(): number

    /** Calculates the surface area of the building's exterior walls, excluding thickness of the floor */
    get exteriorWallInteriorSurfaceArea(): number

	/** Calculates the surface area of the building's interior walls. */
	get interiorWallSurfaceArea(): number

	/** Calculates the slope factor of the roof based on its rise per foot and soffit overhang. */
	get slopeFactor(): number

	/** Calculates the base length of the roof, accounting for soffit overhang. */
	get roofBaseLength(): number

	/** Calculates the base width of the roof, accounting for soffit overhang. */
	get roofBaseWidth(): number

	/** Calculates the total surface area of the roof. */
	get roofSurfaceArea(): number

	/** Returns the total linear feet of the building's exterior walls. */
	get exteriorWallsLinearFeet(): number

	/** Returns the total linear feet of the building's interior walls. */
	get interiorWallsLinearFeet(): number
}

/**
 * Price list item names, filled in by the code editor from the price list
 * selected in its sidebar. Empty means "no price list selected".
 */
interface PriceLookupKeys {}

/** Price list categories, filled in the same way as `PriceLookupKeys`. */
interface PriceCategories {}

/**
 * The name of an item in the price list. Suggests the selected price list's
 * item names, but any string is allowed.
 */
type PriceLookupKey = [keyof PriceLookupKeys] extends [never]
	? string
	: (keyof PriceLookupKeys & string) | (string & {})

/** A price list category. Suggests the selected price list's categories. */
type PriceCategory = [keyof PriceCategories] extends [never]
	? string
	: (keyof PriceCategories & string) | (string & {})

/** An item from the price list. */
declare type PricelistItem = {
	name: string
	unitType: string
	pricePerUnit: number
	currency: string
	category: string
	width?: number
	height?: number
	length?: number
}

/** A part to add to a section of the estimate. */
declare type Part = {
	/** The name shown on the estimate. */
	name: string
	/** How many units of the part are needed. */
	qty: number
	/** The name of the price list item that prices this part. */
	priceLookupKey: PriceLookupKey
}

/**
 * A section of the estimate, such as "Lumber" or "Plumbing". Create one with `createSection`.
 */
declare class EstimateSection {
	/** The section's name. */
	name: string
	/**
	 * Add a part to the section. Its price comes from the price list item
	 * named by `priceLookupKey`. Returns the section, so calls can be chained.
	 */
	addPart(part: Part): EstimateSection
}

/**
 * Insert a heading into your input form.
 */
declare function insertHeading(name: string, description?: string): void

/**
 * Add a number input (counter) to the form and get its value.
 */
declare function getCount(name: string, defaultValue?: number, options?: Record<string, any>): number

/**
 * Look up a price list item by name. Returns a $0 item if it isn't in the price list.
 */
declare function getPrice(name: PriceLookupKey): PricelistItem

/**
 * Get a variable for this takeoff model. Variables are values you can edit on the model's page without changing the code.
 */
declare function getVariable<T>(
	name: string,
	defaultValue: T,
	options?: Record<string, any>,
): T

/**
 * Add an input to the estimate form and get the value the user entered.
 */
declare function getUserInput<T>(
	name: string,
	defaultValue: T,
	options?: Record<string, any>,
): T

/**
 * Create a section in the estimate, such as "Lumber". Add parts to it with `addPart`.
 */
declare function createSection(name: string): EstimateSection

/**
 * Get all price list items in a category.
 */
declare function getCategoryItems(category: PriceCategory): PricelistItem[]
