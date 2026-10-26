import {
	newQuickJSWASMModule,
	newVariant,
	RELEASE_SYNC,
	type QuickJSHandle,
} from 'quickjs-emscripten'
import { type EstimateSection, type TakeOffApi } from './takeoff-api'

const TIME_LIMIT_MS = 250
const MEMORY_LIMIT_BYTES = 16 * 1024 * 1024
const MAX_TEXT_LENGTH = 1024 * 1024
const MAX_CALLS = 10_000

/**
 * Execute synchronous calculation code in a fresh, capability-limited WASM realm.
 * Only JSON data crosses the boundary; no host object or function is a guest value.
 * Side effects are immediate (and are not rolled back on failure).
 */
export async function executeTakeoffCode(
	code: string,
	takeoffApi: TakeOffApi,
): Promise<void> {
	if (code.length > MAX_TEXT_LENGTH) {
		throw new Error('Takeoff code exceeds the size limit.')
	}
	// Also bound the actual WASM heap. QuickJS's allocator accounting alone does
	// not bound all allocations in the release build (notably ArrayBuffers).
	const quickjs = await newQuickJSWASMModule(
		newVariant(RELEASE_SYNC, {
			wasmMemory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
		}),
	)
	const runtime = quickjs.newRuntime()
	try {
		runtime.setMemoryLimit(MEMORY_LIMIT_BYTES)
		runtime.setMaxStackSize(256 * 1024)
		const deadline = performance.now() + TIME_LIMIT_MS
		let timedOut = false
		let bridgeFailed = false
		let calls = 0
		runtime.setInterruptHandler(() => {
			timedOut ||= performance.now() > deadline
			return timedOut || bridgeFailed
		})
		const vm = runtime.newContext()
		try {
			const sections: EstimateSection[] = []
			const text = (value: unknown): string => {
				if (typeof value !== 'string') throw new Error('Expected string')
				return value
			}
			const record = (value: unknown): Record<string, unknown> => {
				if (!value || typeof value !== 'object' || Array.isArray(value)) {
					throw new Error('Expected object')
				}
				return value as Record<string, unknown>
			}
			const options = (value: unknown, input: boolean) => {
				if (value == null) return undefined
				const source = record(value)
				// Do not allow options to override lookup identity or values.
				const result: Record<string, unknown> = {}
				for (const key of [
					'type',
					'description',
					...(input ? ['label'] : []),
				]) {
					if (Object.hasOwn(source, key)) result[key] = text(source[key])
				}
				if (input && Object.hasOwn(source, 'componentProps')) {
					result.componentProps = record(source.componentProps)
				}
				return result
			}
			const section = (id: unknown) => {
				if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
					throw new Error('Invalid section')
				}
				const value = sections[id]
				if (!value) throw new Error('Invalid section')
				return value
			}
			const dispatch = (method: string, args: unknown[]): unknown => {
				switch (method) {
					case 'getPrice':
						return takeoffApi.prices.get(text(args[0]))
					case 'getCategoryItems':
						return takeoffApi.prices.getCategoryItems(text(args[0]))
					case 'getVariable':
						return takeoffApi.variables.get(
							text(args[0]),
							args[1],
							options(args[2], false),
						)
					case 'getUserInput':
						return takeoffApi.inputs.get(
							text(args[0]),
							args[1],
							options(args[2], true),
						)
					case 'createSection':
						sections.push(takeoffApi.createSection(text(args[0])))
						return sections.length - 1
					case 'addPart': {
						const part = record(args[1])
						if (typeof part.qty !== 'number' || !Number.isFinite(part.qty)) {
							throw new Error('Expected finite quantity')
						}
						section(args[0]).addPart({
							name: text(part.name),
							qty: part.qty,
							priceLookupKey: text(part.priceLookupKey),
						})
						return null
					}
					case 'serializeSection':
						return section(args[0]).serialize()
					default:
						throw new Error('Unknown API')
				}
			}
			const bridge = vm.newFunction(
				'takeoff',
				(method: QuickJSHandle, payload: QuickJSHandle) => {
					try {
						timedOut ||= performance.now() > deadline
						if (timedOut || bridgeFailed || ++calls > MAX_CALLS) {
							throw new Error('Execution limit')
						}
						if (
							!method ||
							!payload ||
							vm.typeof(method) !== 'string' ||
							vm.typeof(payload) !== 'string'
						) {
							throw new Error('Expected serialized arguments')
						}
						const json = vm.getString(payload)
						if (json.length > MAX_TEXT_LENGTH) throw new Error('Payload limit')
						const args: unknown = JSON.parse(json)
						if (!Array.isArray(args)) throw new Error('Expected arguments')
						const result = JSON.stringify(dispatch(vm.getString(method), args))
						if (result.length > MAX_TEXT_LENGTH) throw new Error('Result limit')
						return vm.newString(result)
					} catch {
						bridgeFailed = true
						// Never copy a host exception, stack, or arbitrary object to the guest.
						return { error: vm.newError('Takeoff API call failed.') }
					}
				},
			)
			try {
				vm.setProp(vm.global, '__takeoffBridge', bridge)
			} finally {
				bridge.dispose()
			}

			// Enumerate data explicitly: prototype traversal must never expand capabilities.
			const bd = takeoffApi.bd
			const dimensions = JSON.stringify({
				width: bd.width,
				wallHeight: bd.wallHeight,
				length: bd.length,
				totalInteriorWallsLength: bd.totalInteriorWallsLength,
				roofRisePerFoot: bd.roofRisePerFoot,
				soffitOverhangWidth: bd.soffitOverhangWidth,
				floorSurfaceArea: bd.floorSurfaceArea,
				exteriorWallSurfaceArea: bd.exteriorWallSurfaceArea,
				interiorWallSurfaceArea: bd.interiorWallSurfaceArea,
				slopeFactor: bd.slopeFactor,
				roofBaseLength: bd.roofBaseLength,
				roofBaseWidth: bd.roofBaseWidth,
				roofSurfaceArea: bd.roofSurfaceArea,
				exteriorWallLinearFeet: bd.exteriorWallLinearFeet,
				interiorWallLinearFeet: bd.interiorWallLinearFeet,
			})
			const evaluate = (source: string) => {
				const result = vm.evalCode(source, 'takeoff.js', { type: 'global' })
				if (result.error) {
					// Do not inspect thrown values: getters/toString may themselves loop.
					result.error.dispose()
					throw new Error('Takeoff code failed.')
				}
				result.value.dispose()
			}
			evaluate(`(() => {
				const bridge = globalThis.__takeoffBridge;
				delete globalThis.__takeoffBridge;
				const parse = JSON.parse, stringify = JSON.stringify;
				const call = (method, args) => parse(bridge(method, stringify(args)));
				globalThis.getPrice = name => call('getPrice', [name]);
				globalThis.getCategoryItems = name => call('getCategoryItems', [name]);
				globalThis.getVariable = (name, value, options) =>
					call('getVariable', [name, value, options]);
				globalThis.getUserInput = (name, value, options) =>
					call('getUserInput', [name, value, options]);
				globalThis.createSection = name => {
					const id = call('createSection', [name]);
					return {
						get name() { return call('serializeSection', [id]).name; },
						get parts() { return call('serializeSection', [id]).parts; },
						addPart(part) { call('addPart', [id, part]); return this; },
						serialize() { return call('serializeSection', [id]); }
					};
				};
				globalThis.bd = Object.freeze(${dimensions});
			})()`)
			evaluate(code)
			if (bridgeFailed || timedOut || performance.now() > deadline) {
				throw new Error('Takeoff execution limit exceeded.')
			}
		} catch {
			throw new Error('Takeoff code failed or exceeded execution limits.')
		} finally {
			vm.dispose()
		}
	} finally {
		runtime.dispose()
	}
}
