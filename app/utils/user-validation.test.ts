import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4'
import { expect, test } from 'vitest'
import { z } from 'zod'
import {
	EmailSchema,
	NameSchema,
	PasswordAndConfirmPasswordSchema,
	PasswordSchema,
	UsernameSchema,
} from './user-validation.ts'

test.each([
	['Username', UsernameSchema],
	['Password', PasswordSchema],
	['Name', NameSchema],
	['Email', EmailSchema],
] as const)(
	'%s preserves required errors for missing and empty form fields',
	(name, field) => {
		const schema = z.object({ value: field })
		for (const body of [
			new URLSearchParams(),
			new URLSearchParams({ value: '' }),
		]) {
			const submission = parseWithZod(body, { schema })
			expect(submission.status).toBe('error')
			expect(submission.reply().error?.value).toEqual([`${name} is required`])
		}

		for (const value of [null, 123]) {
			const result = field.safeParse(value)
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0]?.code).toBe('invalid_type')
				expect(result.error.issues[0]?.message).not.toBe(`${name} is required`)
			}
		}
	},
)

test.each([
	[UsernameSchema, 'ab', 'Username is too short'],
	[UsernameSchema, 'a'.repeat(21), 'Username is too long'],
	[
		UsernameSchema,
		'bad-name',
		'Username can only include letters, numbers, and underscores',
	],
	[PasswordSchema, 'short', 'Password is too short'],
	[PasswordSchema, 'a'.repeat(101), 'Password is too long'],
	[NameSchema, 'ab', 'Name is too short'],
	[NameSchema, 'a'.repeat(41), 'Name is too long'],
	[EmailSchema, 'invalid', 'Email is invalid'],
	[EmailSchema, `${'a'.repeat(90)}@example.com`, 'Email is too long'],
] as const)(
	'preserves the custom validation error (case %#)',
	(schema, value, message) => {
		const result = schema.safeParse(value)
		if (result.success) throw new Error('Expected validation to fail')
		expect(result.error.issues.map(issue => issue.message)).toContain(message)
	},
)

test('Conform preserves normalization, optional empty fields, and checkbox coercion', () => {
	const schema = z.object({
		username: UsernameSchema,
		email: EmailSchema,
		password: PasswordSchema,
		remember: z.boolean().optional(),
		redirectTo: z.string().optional(),
	})
	for (const remember of [undefined, 'on']) {
		const body = new URLSearchParams({
			username: 'Mixed_CASE',
			email: 'First.Last+Tag@Example.COM',
			password: 'Secret123',
			redirectTo: '',
		})
		if (remember) body.set('remember', remember)
		const submission = parseWithZod(body, { schema })
		expect(submission.status).toBe('success')
		if (submission.status !== 'success') throw new Error('Expected valid form')
		expect(submission.value).toEqual({
			username: 'mixed_case',
			email: 'first.last+tag@example.com',
			password: 'Secret123',
			remember: remember ? true : undefined,
			redirectTo: undefined,
		})
	}
	expect(getZodConstraint(schema)).toMatchObject({
		username: { required: true, minLength: 3, maxLength: 20 },
		email: { required: true, minLength: 3, maxLength: 100 },
		password: { required: true, minLength: 6, maxLength: 100 },
		remember: { required: false },
	})
})

test('password confirmation retains its field error and matching success', () => {
	for (const confirmPassword of ['Secret123', 'Different123']) {
		const submission = parseWithZod(
			new URLSearchParams({ password: 'Secret123', confirmPassword }),
			{ schema: PasswordAndConfirmPasswordSchema },
		)
		if (confirmPassword === 'Secret123') {
			expect(submission.status).toBe('success')
		} else {
			expect(submission.status).toBe('error')
			expect(submission.reply().error?.confirmPassword).toEqual([
				'The passwords must match',
			])
		}
	}
})
