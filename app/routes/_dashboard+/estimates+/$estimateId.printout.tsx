import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import React from 'react'
import _ from 'underscore'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { cn } from '#app/utils/misc.js'

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const estimate = await prisma.estimate.findFirst({
		where: {
			id: params.estimateId,
			ownerId: userId,
		},
		include: {
			results: true,
			model: {
				include: {
					printTemplates: {
						orderBy: {
							createdAt: 'desc',
						},
						take: 1,
					},
				},
			},
			formData: true,
		},
	})

	invariantResponse(estimate, 'Estimate not found')

	const template = estimate.model?.printTemplates[0]
	invariantResponse(template, 'No template found')

	const formData = Object.fromEntries(
		estimate.formData.map(item => [item.name, item.value]),
	)

	const templateData = {
		...formData,
		total: estimate.results
			.reduce((acc, result) => acc + result.total, 0)
			.toLocaleString('en-US', {
				style: 'currency',
				currency: 'USD',
			}),
		date: new Date().toLocaleDateString(),
	}

	// Use {{ name }} in the template to interpolate the value
	_.templateSettings = {
		interpolate: /\{\{(.+?)\}\}/g,
	}

	const compiledTemplate = _.template(template.bodyTemplate)
	const body = compiledTemplate(templateData)

	return json({
		estimate,
		template,
		body,
	})
}

export default function EstimatePrintout() {
	const { template, body } = useLoaderData<typeof loader>()

	return (
		<div className="main-container mx-auto max-w-4xl p-8">
			<div className="mb-8 flex items-start justify-between">
				<div className="flex-grow">
					<Input
						className="mb-1 w-full text-2xl font-bold"
						defaultValue={template.companyName}
					/>
					<Textarea
						className="mb-1 w-full"
						rows={5}
						defaultValue={template.companyInfo}
					/>
				</div>
				<img
					src={`/resources/logo-images/${template.logoImageId}`}
					alt="Logo"
					className="h-24 w-24"
				/>
			</div>

			<div className="mb-4 flex">
				<div className="w-1/3">
					<h2 className="mb-2 font-bold">BILL TO</h2>
					<Textarea
						className="w-full"
						rows={3}
						defaultValue={'John Doe\n123 Main St\nSpringfield, IL 62701'}
					/>
				</div>
			</div>

			<div className="mb-4 text-right">
				<span className="font-bold">Quote Date: </span>
				<Input
					className="w-24 text-right"
					defaultValue={new Date().toLocaleDateString()}
				/>
				<span className="ml-4 font-bold">Valid For: </span>
				<Input className="w-16 text-right" defaultValue="14" /> days
			</div>

			{/* line break */}
			<div className="mb-4 border-b"></div>
			{/* Quote content */}
			<div className="mb-4 border-b">
				<div className="mb-4">
					<h3 className="font-bold">Quote Items</h3>
				</div>
				<div className="mb-4">
					<Textarea className="w-full border" defaultValue={body} rows={8} />
				</div>
			</div>

			<div className="flex items-start justify-between">
				<div className="w-1/2">
					<p className="mb-2 font-bold">{template.greeting}</p>
					{/* <h3 className="mb-2 font-bold">Terms & Instructions</h3>
					<Textarea
						className="h-24 w-full border p-2"
						defaultValue="<Add payment requirements here, for example deposit amount and payment method>\n\n<Add terms here, e.g. warranty, returns policy...>"
					/> */}
				</div>
				<div className="w-1/3">
					<div className="mb-2 flex justify-between">
						<span className="font-bold">SUBTOTAL $</span>
						<span>0.00</span>
					</div>
					<div className="flex justify-between">
						<span className="font-bold">TOTAL $</span>
						<span>100,000</span>
					</div>
				</div>
			</div>
		</div>
	)
}

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				className={cn('bg-background', className)}
				ref={ref}
				{...props}
			/>
		)
	},
)
Input.displayName = 'Input'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				className={cn('border-none bg-background print:resize-none', className)}
				ref={ref}
				{...props}
			/>
		)
	},
)
Textarea.displayName = 'Textarea'
