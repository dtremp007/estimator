import * as ccase from 'change-case'
import * as csv from 'fast-csv'

export function parseCSV(text: string) {
	return new Promise((resolve, reject) => {
		const rows: any[] = []
		csv
			.parseString(text, {
				headers: headers => headers.map(h => ccase.camelCase(h || '')),
			})
			.on('error', error => reject(error))
			.on('data', row => rows.push(row))
			.on('end', () => resolve(rows))
	})
}
