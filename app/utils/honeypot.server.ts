import { Honeypot, SpamError } from 'remix-utils/honeypot/server'

const nameFieldName = 'name__confirm'

export const honeypot = new Honeypot({
	nameFieldName,
	validFromFieldName: process.env.NODE_ENV === 'test' ? null : undefined,
	encryptionSeed: process.env.HONEYPOT_SECRET,
})

export async function checkHoneypot(formData: FormData) {
	try {
		// remix-utils skips the check when no honeypot fields are present at all,
		// so require the input to keep rejecting forms that leave it out.
		if (!formData.has(nameFieldName))
			throw new SpamError('Missing honeypot input')
		await honeypot.check(formData)
	} catch (error) {
		if (error instanceof SpamError) {
			throw new Response('Form not submitted properly', { status: 400 })
		}
		throw error
	}
}
