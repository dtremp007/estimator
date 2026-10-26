import { faker } from "@faker-js/faker"

export function coerce(value: string, type?: string) {
    if (type === 'object') {
        return JSON.parse(value)
    }

	if (type === 'number') {
        return +value
    }

    if (type === 'boolean') {
        return value === 'true'
    }

    return value
}

export function createDummyBuildingDimensions() {
    return {
        width: faker.number.int({ min: 12, max: 30 }),
        length: faker.number.int({ min: 20, max: 100 }),
        wallHeight: faker.number.int({ min: 6, max: 10 }),
        totalInteriorWallsLength: faker.number.int({ min: 10, max: 100 }),
        roofRisePerFoot: faker.number.int({ min: 1, max: 12 }),
        soffitOverhangWidth: faker.number.int({ min: 0.5, max: 2 }),
    }
}
