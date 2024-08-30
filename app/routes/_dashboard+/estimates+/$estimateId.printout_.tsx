import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { redirect, useLoaderData } from '@remix-run/react'
import { Printer } from 'lucide-react'
import React, { useState } from 'react'
import _ from 'underscore'
import { Button } from '#app/components/ui/button'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.js'
import { cn } from '#app/utils/misc.js'

export const handle = {
	breadcrumb: 'Printout',
}

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

	if (!template) {
		return redirect(`/estimates/${estimate.id}/printout/onboarding`)
	}

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
		total: templateData.total,
	})
}

export default function EstimatePrintout() {
	const { template, body, total } = useLoaderData<typeof loader>()
	const [companyInfoRows, setCompanyInfoRows] = useState(
		template.companyInfo.split('\n').length,
	)
	const [billToRows, setBillToRows] = useState(3)
	const [quoteItemsRows, setQuoteItemsRows] = useState(15)
	const handlePrint = () => {
		window.print()
	}

	return (
		<div className="main-container mx-auto max-w-4xl print:p-8">
			<div className="mb-8 flex justify-end print:hidden">
				<Button onClick={handlePrint}>
					<Printer className="mr-2 h-4 w-4" />
					Print
				</Button>
			</div>
			<div className="mb-8 flex justify-between">
				<div className="flex w-full max-w-2xl flex-col">
					<div className="mb-6 flex flex-col gap-2">
						<Input
							className="text-2xl font-bold"
							defaultValue={template.companyName}
						/>
						<Textarea
							className="mb-1"
							rows={companyInfoRows}
							defaultValue={template.companyInfo}
							onChange={e => {
								setCompanyInfoRows(e.currentTarget.value.split('\n').length)
							}}
						/>
					</div>
					<div className="">
						<h2 className="mb-2 font-bold">BILL TO</h2>
						<Textarea
							className="w-full"
							rows={billToRows}
							defaultValue={'John Doe\n123 Main St\nSpringfield, IL 62701'}
							onChange={e => {
								setBillToRows(e.currentTarget.value.split('\n').length)
							}}
						/>
					</div>
				</div>

				{template.logoImageId && (
					<img
						src={`/resources/logo-images/${template.logoImageId}`}
						alt="Logo"
						className="hidden h-24 w-24 object-contain sm:block print:block"
					/>
				)}
			</div>

			<div className="mb-4 text-right">
				<span className="font-bold">Quote Date: </span>
				<Input
					className="text-right"
					defaultValue={new Date().toLocaleDateString()}
				/>
			</div>

			{/* line break */}
			<div className="mb-4 border-b"></div>
			{/* Quote content */}
			<div className="mb-4 border-b">
				<div className="mb-4">
					<h3 className="font-bold">Quote Items</h3>
				</div>
				<div className="mb-4">
					<Textarea
						className="w-full border"
						defaultValue={body}
						rows={quoteItemsRows}
						onChange={e => {
							setQuoteItemsRows(
								Math.max(15, e.currentTarget.value.split('\n').length),
							)
						}}
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-start justify-between">
				<div className="">
					<p className="mb-2 font-bold">{template.greeting}</p>
					{/* <h3 className="mb-2 font-bold">Terms & Instructions</h3>
					<Textarea
						className="h-24 w-full border p-2"
						defaultValue="<Add payment requirements here, for example deposit amount and payment method>\n\n<Add terms here, e.g. warranty, returns policy...>"
					/> */}
				</div>
				<div className="">
					<div className="flex flex-wrap items-center justify-between text-2xl font-bold">
						<span className="font-bold">TOTAL $</span>
						<Input className="text-right max-sm:w-full" defaultValue={total} />
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
				className={cn('rounded-sm bg-foreground/5 p-1', className)}
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
				className={cn(
					'rounded-sm border-none bg-foreground/5 p-1 print:resize-none',
					className,
				)}
				ref={ref}
				{...props}
			/>
		)
	},
)
Textarea.displayName = 'Textarea'
