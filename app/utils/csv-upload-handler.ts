import {
	json,
	MaxPartSizeExceededError,
	NodeOnDiskFile,
	unstable_composeUploadHandlers,
	unstable_createFileUploadHandler,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node'
import { PricelistSchema } from '#app/lib/takeoff/pricelist.class.js'
import { parseCSVFromFile } from './csv-parser.js'

export function isUploadedFile(file: unknown): file is NodeOnDiskFile {
	return file instanceof NodeOnDiskFile && file.type === 'text/csv'
}

// Both upload routes use the same parsing, validation, and disk-file lifecycle.
// Non-multipart forms are also supported for the index route's delete action.
export async function parsePricelistFormData(request: Request) {
	const files: NodeOnDiskFile[] = []
	try {
		const uploadHandler = unstable_composeUploadHandlers(
			unstable_createFileUploadHandler({
				maxPartSize: 5_000_000,
				filter: ({ name, contentType }) =>
					name === 'pricelist' && contentType === 'text/csv',
			}),
			unstable_createMemoryUploadHandler(),
		)
		const contentType = request.headers.get('Content-Type') ?? ''
		const formData = /^multipart\/form-data(?:;|$)/i.test(contentType)
			? await unstable_parseMultipartFormData(request, async part => {
					const value = await uploadHandler(part)
					if (value instanceof NodeOnDiskFile) files.push(value)
					return value
				})
			: await request.formData()

		const file = formData.get('pricelist')
		if (!isUploadedFile(file)) {
			return {
				formData,
				result: {
					success: false as const,
					error: { message: 'A CSV file is required' },
				},
			}
		}

		let rows: unknown
		try {
			rows = await parseCSVFromFile(file.getFilePath())
		} catch {
			return {
				formData,
				result: {
					success: false as const,
					error: { message: 'Invalid CSV file' },
				},
			}
		}
		return { formData, result: PricelistSchema.safeParse(rows) }
	} catch (error) {
		throw json(
			{ error: { message: 'Invalid upload form' } },
			{ status: error instanceof MaxPartSizeExceededError ? 413 : 400 },
		)
	} finally {
		// Includes duplicate file fields and files written before a parse failure.
		await Promise.all(files.map(file => file.remove()))
	}
}
