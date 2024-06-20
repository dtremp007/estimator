import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { Form, redirect, useActionData, useLoaderData } from '@remix-run/react'
import React from 'react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.js'
import { Button } from '#app/components/ui/button.js'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card'
import { SelectField } from '#app/components/ui/select-field.js'
import { prisma } from '#app/utils/db.server.js'

export const handle = {
	breadcrumb: 'Edit Variable',
}

function valueMatchesType(value: string, type: string) {
	switch (type) {
		case 'string':
			return typeof value === 'string'
		case 'number':
			return !isNaN(Number(value))
		case 'boolean':
			return value === 'true' || value === 'false'
		case 'object':
			try {
				JSON.parse(value)
				return true
			} catch {
				return false
			}
	}
}

export async function loader({ params }: LoaderFunctionArgs) {
	const variable = await prisma.customVariable.findFirst({
		where: {
			id: params.variableId,
		},
	})

	return json({ variable })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData()
	const takeoffModelId = params.takeoffModelId

	if (formData.get('intent') === 'delete') {
		const id = formData.get('id')
		await prisma.customVariable.delete({
			where: { id: id as string },
		})
	}

	if (formData.get('intent') === 'update') {
		const submission = parseWithZod(formData, {
			schema: CustomVariableSchema,
		})

		if (submission.status !== 'success') {
			return json(
				{
					result: submission.reply({
						formErrors: takeoffModelId
							? undefined
							: ['Takeoff model not found'],
					}),
				},
				{ status: submission.status === 'error' ? 400 : 200 },
			)
		}

		const { id, name, type, value } = submission.value

		if (!valueMatchesType(value, type)) {
			return json(
				{
					result: submission.reply({
						formErrors: ['Value does not match type.'],
					}),
				},
				{ status: 400 },
			)
		}

		await prisma.takeoffModel.update({
			where: { id: takeoffModelId },
			data: {
				variables: {
					upsert: {
						where: { id: id ?? '__new__' },
						update: { name, type, value },
						create: {
							name,
							type,
							value,
							isManuallyCreated: true,
						},
					},
				},
			},
		})
	}
	return redirect(`/takeoff-models/${takeoffModelId}`)
}

const CustomVariableSchema = z.object({
	id: z.string().optional(),
	name: z.string(),
	type: z.string(),
	value: z.string(),
})

export default function EditVariable() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const [form, fields] = useForm({
		id: 'model-editor',
		lastResult: actionData?.result,
		defaultValue: data?.variable ?? {
			type: 'string',
		},
	})

	return (
		<div className="main-container">
			<Card>
				<CardHeader>
					<CardTitle>Variables</CardTitle>
					<CardDescription>
						These are the variables for this takeoff model
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form method="post" {...getFormProps(form)}>
						{data?.variable?.id && (
							<input type="hidden" name="id" value={data.variable.id} />
						)}
						<div className="flex gap-4">
							<Field
								className="w-full"
								labelProps={{ children: 'Name' }}
								inputProps={{ ...getInputProps(fields.name, { type: 'text' }) }}
							/>
							<Field
								className="w-full pl-4"
								labelProps={{ children: 'Value' }}
								inputProps={{
									...getInputProps(fields.value, { type: 'text' }),
								}}
							/>
						</div>
						<div className="w-1/2">
							<SelectField
								meta={fields.type}
								label="Type"
								options={[
									{ label: 'String', value: 'string' },
									{ label: 'Number', value: 'number' },
									{ label: 'Boolean', value: 'boolean' },
									{ label: 'JSON', value: 'object' },
								]}
								placeholder="Select a type"
							/>
						</div>
						<ErrorList errors={form.errors} />
						<div className="mt-4 flex justify-end gap-4">
							{data?.variable?.id && (
								<Button variant="destructive" name="intent" value="delete">
									Delete
								</Button>
							)}
							<Button name="intent" value="update">
								Update
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
