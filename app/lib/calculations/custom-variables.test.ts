import { expect, test } from 'vitest'
import { prisma } from '#app/utils/db.server.js'
import { createUser } from '#tests/db-utils.js'
import {
	CustomVariableLookupTable,
	type TakeoffCustomVariable,
} from './custom-variables'


async function setupTakeoffModel() {
	const user = await prisma.user.create({
		select: { id: true, username: true, name: true },
		data: { ...createUser() },
	})

	const takeoffModel = await prisma.takeoffModel.create({
		data: {
			name: 'Test Calculation',
			ownerId: user.id,
		},
	})

	return takeoffModel
}

async function getVariableLookupTable(takeoffModelId: string) {
	const takeoffModel = await prisma.takeoffModel.findUniqueOrThrow({
		where: { id: takeoffModelId },
		include: { variables: true },
	})

	return new CustomVariableLookupTable(takeoffModel.variables)
}

test('Custom inputs get created', async () => {
	const takeoffModel = await setupTakeoffModel()

	const inputsLookupTable = new CustomVariableLookupTable(
		[] as TakeoffCustomVariable[],
	)

	const numberValue = inputsLookupTable.get('testInput1', 1)
	expect(numberValue).toEqual(1)

	const textValue = inputsLookupTable.get('testInput2', 'default')
	expect(textValue).toEqual('default')

	const booleanValue = inputsLookupTable.get('testInput3', true)
	expect(booleanValue).toEqual(true)

	await inputsLookupTable.saveChanges(takeoffModel.id)

	const inputsLookupTableAfterCleanup = await getVariableLookupTable(
		takeoffModel.id,
	)

	const numberValueAfterCleanup = inputsLookupTableAfterCleanup.get(
		'testInput1',
		1,
	)
	expect(numberValueAfterCleanup).toEqual(1)

	const textValueAfterCleanup = inputsLookupTableAfterCleanup.get(
		'testInput2',
		'default',
	)
	expect(textValueAfterCleanup).toEqual('default')

	const booleanValueAfterCleanup = inputsLookupTableAfterCleanup.get(
		'testInput3',
		true,
	)
	expect(booleanValueAfterCleanup).toEqual(true)
})

test('Custom inputs get updated', async () => {
	const takeoffModel = await setupTakeoffModel()

	const inputsLookupTable = new CustomVariableLookupTable(
		[] as TakeoffCustomVariable[],
	)

	inputsLookupTable.get('testInput1', 1)
	inputsLookupTable.get('testInput2', 'default')
	inputsLookupTable.get('testInput3', true)

	await inputsLookupTable.saveChanges(takeoffModel.id)

	let inputsLookupTableAfterCleanup = await getVariableLookupTable(
		takeoffModel.id,
	)

	inputsLookupTableAfterCleanup.get('testInput1', 2)
	inputsLookupTableAfterCleanup.get('testInput2', 'new default')
	inputsLookupTableAfterCleanup.get('testInput3', false)

	await inputsLookupTableAfterCleanup.saveChanges(takeoffModel.id)

	inputsLookupTableAfterCleanup = await getVariableLookupTable(takeoffModel.id)

	const numberValueAfterSecondCleanup = inputsLookupTableAfterCleanup.get(
		'testInput1',
		1,
	)
	expect(numberValueAfterSecondCleanup).toEqual(2)

	const textValueAfterSecondCleanup = inputsLookupTableAfterCleanup.get(
		'testInput2',
		'default',
	)
	expect(textValueAfterSecondCleanup).toEqual('new default')

	const booleanValueAfterSecondCleanup = inputsLookupTableAfterCleanup.get(
		'testInput3',
		true,
	)
	expect(booleanValueAfterSecondCleanup).toEqual(false)
})

test('Custom inputs get deleted', async () => {
	const takeoffModel = await setupTakeoffModel()

	const inputsLookupTable = new CustomVariableLookupTable(
		[] as TakeoffCustomVariable[],
	)

	inputsLookupTable.get('testInput1', 1)
	inputsLookupTable.get('testInput2', 'default')
	inputsLookupTable.get('testInput3', true)

	await inputsLookupTable.saveChanges(takeoffModel.id)

	let inputsLookupTableAfterCleanup = await getVariableLookupTable(
		takeoffModel.id,
	)

	inputsLookupTableAfterCleanup.get('testInput1', 2)
	inputsLookupTableAfterCleanup.get('testInput2', 'new default')
	inputsLookupTableAfterCleanup.get('testInput3', false)

	await inputsLookupTableAfterCleanup.saveChanges(takeoffModel.id)

	inputsLookupTableAfterCleanup = await getVariableLookupTable(takeoffModel.id)

	await inputsLookupTableAfterCleanup.saveChanges(takeoffModel.id)

	inputsLookupTableAfterCleanup = await getVariableLookupTable(takeoffModel.id)

	expect(inputsLookupTableAfterCleanup.table.size).toEqual(0)
})
