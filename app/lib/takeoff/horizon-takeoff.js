/* eslint-disable no-undef */
/// <reference path="./types.d.ts" />

const wallHeight = getVariable('wallHeight', 8)
const studsPerFoot = getVariable('studsPerFoot', 1)
const floorThickness = getVariable('floorThickness', 1)
const roofRisePerFoot = getVariable('roofRisePerFoot', 1)
const floorJoistsOC = getVariable('floorJoistsOC', 16 / 12)
const trussesOC = getVariable('trussesOC', 24 / 12)
const soffitOverhangWidth = getVariable('soffitOverhangWidth', 1)

insertHeading('House Dimensions', 'Enter the dimensions of the house')

const width = getUserInput('width', 20)
const length = getUserInput('length', 50)
const totalInteriorWallsLength = getUserInput('interiorWallLength', 100)

insertHeading('General Information', 'Enter the general information')

const country = getUserInput('country', 'USA', {
	label: 'Destination Country',
	component: 'SegmentedControl',
	props: {
		data: ['USA', 'Mexico'],
	},
})
const roofingMaterial = getUserInput('roofingMaterial', 'shingles', {
	label: 'Roofing Material',
	component: 'SegmentedControl',
	props: {
		data: [
			{ label: 'Shingles', value: 'shingles' },
			{ label: 'Lamina', value: 'lamina' },
		],
	},
})

const bd = new BuildingDimensions({
	width,
	length,
	wallHeight,
	floorThickness,
	totalInteriorWallsLength,
	roofRisePerFoot,
	soffitOverhangWidth,
})

const foundationSection = createSection('Foundation')
const iBeamsQuantity = Math.ceil(bd.length / 20)

foundationSection.addPart({
	name: 'I-Beams',
	qty: iBeamsQuantity,
	priceLookupKey: bd.length < 50 ? 'viga ipr 10x4' : 'viga ipr 12x4',
})

foundationSection.addPart({
	name: 'Cross Members',
	qty: bd.length < 50 ? 2 : 3,
	priceLookupKey: 'ptr 3x2',
})

const floorJoistsQuantity = Math.ceil(bd.length / floorJoistsOC) + 1

// Each piece is 20" long
const joistSupportsQuantity = floorJoistsQuantity * 2

foundationSection.addPart({
	name: 'Joist Supports',
	qty: Math.ceil((joistSupportsQuantity * 20) / 12) / 20,
	priceLookupKey: 'angulo metalico 3/16 x 21/2',
})

foundationSection.addPart({
	name: 'Welding Rods',
	// 1.5kg per 10ft
	qty: (bd.length / 10) * 1.5,
	priceLookupKey: 'soldadura infra 6011',
})

foundationSection.addPart({
	name: 'Carriage Bolts',
	qty: joistSupportsQuantity * 2.5,
	priceLookupKey: 'tornillo coche 3/8" x 21/2"',
})

foundationSection.addPart({
	name: 'Nuts',
	qty: joistSupportsQuantity * 2.5,
	priceLookupKey: 'tuerca hexagonal',
})

foundationSection.addPart({
	name: 'Liquid Nails',
	// 1 tube per 70 sqft
	qty: Math.ceil(bd.floorSurfaceArea / 70),
	priceLookupKey: 'adhesivo liquido nails',
})

const lumberSection = createSection('Lumber')

// Rim joists are doubled up
const headerJoistsQuantity = Math.ceil((bd.length * 4) / 20)
let joistMaterialType = ''

switch (true) {
	case bd.length < 16:
		joistMaterialType = '2x6x20'
		break
	case bd.length < 18:
		joistMaterialType = '2x8x20'
		break
	default:
		joistMaterialType = '2x10x20'
}

lumberSection.addPart({
	name: 'Floor Joists',
	qty: floorJoistsQuantity + 2 + headerJoistsQuantity,
	priceLookupKey: joistMaterialType,
})

const trussesQuantity = Math.ceil(bd.width / trussesOC) + 1

lumberSection.addPart({
	name: 'Bottom Chords and Webbing',
	qty: trussesQuantity * 2,
	priceLookupKey: '2x4x20',
})

lumberSection.addPart({
	name: 'Top Chords',
	qty: trussesQuantity * 2,
	priceLookupKey: '2x4x14',
})

lumberSection.addPart({
	name: 'Gussets',
	qty: trussesQuantity / 2,
	priceLookupKey: '7/16" OSB',
})

const wallsTotalLineOurFeet =
	bd.exteriorWallsLinearFeet + bd.interiorWallsLinearFeet

lumberSection.addPart({
	name: 'Studs',
	qty: studsPerFoot * wallsTotalLineOurFeet,
	priceLookupKey: '2x4x8',
})

lumberSection.addPart({
	name: 'Plates',
	// 3.5 ft of plate for foot of wall
	qty: wallsTotalLineOurFeet * 3.5,
	priceLookupKey: '2x4x20',
})

lumberSection.addPart({
	name: 'Floor Sheathing',
	qty: Math.ceil(bd.floorSurfaceArea / 32),
	priceLookupKey: '3/4" OSB',
})

lumberSection.addPart({
	name: 'Roof & Wall Sheathing',
	qty:
		Math.ceil(bd.roofSurfaceArea / 32) +
		Math.ceil(bd.exteriorWallSurfaceArea / 32),
	priceLookupKey: '7/16" OSB',
})

lumberSection.addPart({
	name: 'Siding',
	qty: Math.ceil(bd.exteriorWallSurfaceArea / 32),
	priceLookupKey: '4x8 siding',
})

const roofingSection = createSection('Roofing')

if (roofingMaterial === 'shingles') {
	roofingSection.addPart({
		name: 'Shingles',
		qty: Math.ceil(bd.roofSurfaceArea) * 1.1,
		priceLookupKey: 'shingles',
	})
} else {
	roofingSection.addPart({
		name: 'Lamina',
		qty: Math.ceil(bd.roofSurfaceArea / 3),
		priceLookupKey: 'lamina',
	})
}

roofingSection.addPart({
	name: 'Soffit and Fascia',
	qty: bd.roofPerimeter + 2.5, // for bird boxes
	priceLookupKey: 'soffit and fascia',
})

const plumbingSection = createSection('Plumbing')

insertHeading('House Layout', 'Rooms and Fixtures')

const kitchenCabinets = getUserInput('kitchenCabinets(m)', 10)
const rooms = getCount('Number of Rooms')
const bathrooms = getCount('Number of Bathrooms')
const bathroomItems = getCategoryItems('bathroom')

for (const item of bathroomItems) {
	plumbingSection.addPart({
		name: item.name,
		qty: bathrooms,
		priceLookupKey: item.name,
	})
}

const electricalSection = createSection('Electrical')
const gangBoxesQuantity = Math.ceil(bd.floorSurfaceArea / 24)

electricalSection.addPart({
	name: 'Gang Boxes',
	qty: gangBoxesQuantity,
	priceLookupKey: '1 gang box',
})

electricalSection.addPart({
	name: 'Switches',
	qty: rooms, // 1 per room
	priceLookupKey: 'light switch single',
})

electricalSection.addPart({
	name: 'Switch Lids',
	qty: rooms, // 1 per room
	priceLookupKey: 'light switch single lid',
})

electricalSection.addPart({
	name: 'Outlets',
	qty: gangBoxesQuantity - rooms,
	priceLookupKey: '110v outlet',
})

electricalSection.addPart({
	name: 'Outlet Covers',
	qty: gangBoxesQuantity - rooms,
	priceLookupKey: '110v outlet cover',
})

// Wire comes in 250ft rolls
// 1 roll per 250 sqft
electricalSection.addPart({
	name: 'Wire',
	qty: Math.ceil(bd.floorSurfaceArea / 500),
	priceLookupKey: '12/2 wire',
})

// 10/2 wire, half a roll per house
electricalSection.addPart({
	name: 'Range Wire',
	qty: 1,
	priceLookupKey: '10/2 wire',
})

// 14/2 wire, 1.5 rolls per house if built for USA
if (country === 'USA') {
	electricalSection.addPart({
		name: 'Lighting Wire',
		qty: 1.5,
		priceLookupKey: '14/2 wire',
	})
}

// 3x8 wire, 7m per house
electricalSection.addPart({
	name: 'Range Wire',
	qty: 7,
	priceLookupKey: '3x8 wire',
})

// 18 gauge wire, 1 roll per house
electricalSection.addPart({
	name: '18 Gauge Wire',
	qty: 1,
	priceLookupKey: '18 gauge wire',
})

const closets = getCount('Number of Closets')
const bedrooms = getCount('Number of Bedrooms')
const pantries = getCount('Number of Pantries')

// 6" LEDs
// 2 per bedroom
// 7 in the kitcen
// 1 in the laundry
electricalSection.addPart({
	name: '6" LED',
	qty: bedrooms * 2 + 7 + 1,
	priceLookupKey: '6" LED',
})

// 4" LEDs
// 7 in general
// 1 per closet
// 1 per bathroom
electricalSection.addPart({
	name: '4" LED',
	qty: 7 + closets + bathrooms,
	priceLookupKey: '4" LED',
})

insertHeading('Windows and Doors', 'Enter the number of each type')
const interiorDoors = getCount('Number of Interior Doors')
const windows = getCategoryItems('windows')

const windowsAndDoorsSection = createSection('Windows and Doors')

const exteriorDoors = 1

let windowSqft = 0
let windowEdges = 0
const doorsSqft = (36 * 82 * (interiorDoors + exteriorDoors)) / 144

for (const window of windows) {
	const count = getCount(window.name)
	if (count > 0) {
		const area = window.width * window.height
		if (!isNaN(area)) {
			windowSqft += area * count
			windowEdges += (window.width + window.height) * 2 * count
		}

		windowsAndDoorsSection.addPart({
			name: window.name,
			qty: count,
			priceLookupKey: window.name,
		})
	}
}
windowSqft /= 144
windowEdges /= 12
// const exteriorDoors = getCount('Number of Exterior Doors')

insertHeading('Insulation', 'Enter the insulation type and thickness')
const insulationSection = createSection('Insulation')

const polyurethaneOptions = ['3/4"', '1"', '1 1/2"', '2"', 'None']
const polyurethaneThickness = getUserInput('polyurethaneThickness', '1"', {
	label: 'Polyurethane Thickness',
	component: 'SegmentedControl',
	props: {
		data: polyurethaneOptions,
	},
})

if (polyurethaneThickness !== 'None') {
	// Gets applied on walls, roof, and floor
	insulationSection.addPart({
		name: 'Polyurethane',
		qty: Math.ceil(
			bd.roofSurfaceArea +
				bd.exteriorWallSurfaceArea +
				bd.floorSurfaceArea -
				windowSqft -
				doorsSqft,
		),
		priceLookupKey: polyurethaneThickness + ' polyurethane',
	})
}

const fiberglassOptions = ['R11', 'R13', 'R15', 'R19', 'None']
const fiberglassThickness = getUserInput('fiberglassThickness', 'R11', {
	label: 'Fiberglass Thickness',
	component: 'SegmentedControl',
	props: {
		data: fiberglassOptions,
	},
})

const interiorCorners = getCount('Number of Interior Corners')

if (fiberglassThickness !== 'None') {
	// Gets applied on walls and in ceiling
	insulationSection.addPart({
		name: 'Fiberglass',
		qty: Math.ceil(
			bd.floorSurfaceArea + bd.exteriorWallSurfaceArea - windowSqft - doorsSqft,
		),
		priceLookupKey: fiberglassThickness,
	})
}

const drywallSection = createSection('Drywall')
const drywallSurfaceArea =
	(bd.floorSurfaceArea +
		bd.exteriorWallInteriorSurfaceArea +
		bd.interiorWallSurfaceArea) *
	1.05

drywallSection.addPart({
	name: 'Drywall',
	qty: Math.ceil(drywallSurfaceArea / 32),
	priceLookupKey: '4x12 drywall',
})

// TODO redimix cubeta

drywallSection.addPart({
	name: 'Corner Bead',
	qty: Math.ceil(interiorCorners + windowEdges / 8),
	priceLookupKey: 'esquinero 90°',
})

drywallSection.addPart({
	name: 'Sanding Sponge',
	qty: 4,
	priceLookupKey: 'drywall sanding sponge',
})

drywallSection.addPart({
	name: 'Sanding Paper',
	qty: 8,
	priceLookupKey: 'drywall sanding paper',
})

const paintSection = createSection('Paint')

paintSection.addPart({
	name: '2" Tape',
	qty: 4,
	priceLookupKey: 'painters tape 2"',
})

paintSection.addPart({
	name: '1 1/2" Tape',
	qty: 2,
	priceLookupKey: 'painters tape 1 1/2"',
})

// 1 gallon exterior paint per 200 sqft of house
paintSection.addPart({
	name: 'Exterior Paint',
	qty: Math.ceil(bd.floorSurfaceArea / 200),
	priceLookupKey: 'exterior paint',
})

// TODO: Interior paint

const flooringSection = createSection('Flooring')

// rug in bedrooms, the rest is SPC
const estimatedBedroomSA = 150

flooringSection.addPart({
	name: 'SPC Flooring',
	qty: Math.ceil(bd.floorSurfaceArea - estimatedBedroomSA * bedrooms),
	priceLookupKey: 'SPC flooring',
})

flooringSection.addPart({
	name: 'Rug',
	qty: Math.ceil(bedrooms * estimatedBedroomSA),
	priceLookupKey: 'rug',
})

const interiorSection = createSection('Interior')

// Add six hinges per closet door
windowsAndDoorsSection.addPart({
	name: 'Hinges',
	qty: interiorDoors * 3 + closets * 6,
	priceLookupKey: 'door hinges',
})

windowsAndDoorsSection.addPart({
	name: 'Knobs',
	qty: interiorDoors,
	priceLookupKey: 'door knobs',
})

interiorSection.addPart({
	name: 'Pericos',
	qty: closets * 2,
	priceLookupKey: 'pericos',
})

interiorSection.addPart({
	name: "6' Shelfs",
	qty: closets,
	priceLookupKey: "6' shelf",
})

if (pantries > 0) {
	interiorSection.addPart({
		name: "8' Shelfs",
		qty: pantries,
		priceLookupKey: "8' shelf",
	})
}

interiorSection.addPart({
	name: 'Base Trim',
	qty: bd.exteriorWallsLinearFeet + bd.interiorWallsLinearFeet * 2,
	priceLookupKey: 'floor trim',
})

interiorSection.addPart({
	name: 'Kitchen Cabinets',
	qty: kitchenCabinets,
	priceLookupKey: 'kitchen cabinets',
})

interiorSection.addPart({
	name: 'Vanities',
	qty: bathrooms,
	priceLookupKey: 'vanities',
})

const adhesivesSection = createSection('Adhesives')

adhesivesSection.addPart({
	name: 'Transparent Silicone',
	// 1.2 tubes per 100 sqft
	qty: Math.ceil(bd.floorSurfaceArea / 100) * 1.2,
	priceLookupKey: 'transparent silicone',
})

adhesivesSection.addPart({
	name: 'Colored Silicone',
	qty: 4,
	priceLookupKey: 'colored silicone',
})

adhesivesSection.addPart({
	name: 'Foam',
	qty: 4,
	priceLookupKey: 'window foam',
})

adhesivesSection.addPart({
	name: 'Acrilastic Silicone',
	qty: 2,
	priceLookupKey: 'acrilastic silicone',
})

adhesivesSection.addPart({
	name: 'Wood Glue',
	// 1 L per 60 sqft
	qty: Math.ceil(bd.floorSurfaceArea / 60),
	priceLookupKey: 'wood glue',
})

const fastenersSection = createSection('Fasteners')

fastenersSection.addPart({
	name: '1 1/2" Staples',
	// 1 box per 300 sqft
	qty: Math.ceil(bd.floorSurfaceArea / 300),
	priceLookupKey: '7/16" x 1 1/2" staples',
})

fastenersSection.addPart({
	name: 'T50 Staples',
	qty: 2,
	priceLookupKey: 'T50 staples',
})

fastenersSection.addPart({
	name: '3 1/4" Nails',
	// 1 box per 700 sqft
	qty: Math.ceil(bd.floorSurfaceArea / 700),
	priceLookupKey: '3 1/4" nails',
})

fastenersSection.addPart({
	name: '3" Nails',
	// 1 box per 700 sqft
	qty: Math.ceil(bd.floorSurfaceArea / 700),
	priceLookupKey: '3" nails',
})

fastenersSection.addPart({
	name: 'Shingle Nails',
	qty: 1,
	priceLookupKey: 'shingle nails',
})

fastenersSection.addPart({
	name: '5" Screws',
	// 4 kg per house
	qty: 4,
	priceLookupKey: '5" screws',
})

fastenersSection.addPart({
	name: '4" Screws',
	// 1 box per house
	qty: 1,
	priceLookupKey: '4" screws',
})

fastenersSection.addPart({
	name: '2 1/2" Screws',
	// 6 kg per house
	qty: 6,
	priceLookupKey: '2 1/2" screws',
})

fastenersSection.addPart({
	name: '1 1/4" Screws',
	// 1 box per house
	qty: 1,
	priceLookupKey: '1 1/4" screws',
})
