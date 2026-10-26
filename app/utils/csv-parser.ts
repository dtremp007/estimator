import fs from 'node:fs'
import * as ccase from 'change-case'
import * as csv from 'fast-csv'

export function parseCSVFromFile(file: string, options?: { deleteFile?: boolean }) {
	return new Promise((resolve, reject) => {
		const rows: any[] = []
		fs.createReadStream(file)
			.pipe(
				csv.parse({
					headers: headers => headers.map(h => ccase.camelCase(h || '')),
				}),
			)
			.on('error', error => reject(error))
			.on('data', row => rows.push(row))
			.on('end', () => {
				if (options?.deleteFile) {
					fs.rmSync(file)
				}
				resolve(rows)
			})
	})
}
