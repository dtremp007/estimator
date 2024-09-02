import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, redirect, useLoaderData } from '@remix-run/react'
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
	const { template, body, total, estimate } = useLoaderData<typeof loader>()
	const [companyInfoRows, setCompanyInfoRows] = useState(
		template.companyInfo.split('\n').length,
	)
	const [billToRows, setBillToRows] = useState(3)
	const [quoteItemsRows, setQuoteItemsRows] = useState(20)
	const handlePrint = () => {
		window.print()
	}

	return (
		<div className="main mx-auto w-full max-w-4xl print:p-8 print:text-black">
			<div className="mb-8 flex justify-end gap-4 print:hidden">
				<Button asChild>
					<Link
						to={`/takeoff-models/${estimate.model?.id}/templates/${template.id}`}
					>
						Edit Template
					</Link>
				</Button>
				<Button onClick={handlePrint}>
					<Printer className="mr-2 h-4 w-4" />
					Print
				</Button>
			</div>
			<div className="mb-8 flex justify-between">
				<div className="flex w-full max-w-2xl flex-col">
					<div className="mb-6 flex flex-col gap-2 print:gap-0">
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
						<Input
							className="mb-2 font-bold print:mb-0"
							defaultValue="BILL TO"
						></Input>
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
				<Input className="font-bold" defaultValue="Quote Date:"></Input>
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
					<Input className="font-bold" defaultValue="Quote Items"></Input>
				</div>
				<div className="mb-4">
					<Textarea
						className="w-full border"
						defaultValue={body}
						rows={quoteItemsRows}
						onChange={e => {
							setQuoteItemsRows(
								Math.max(20, e.currentTarget.value.split('\n').length),
							)
						}}
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-baseline justify-between">
				<Input
					className="mb-2 flex-1 font-bold"
					defaultValue={template.greeting}
				></Input>
				<div className="">
					<div className="flex flex-wrap items-center justify-end text-2xl font-bold">
						<span className="font-bold">TOTAL</span>
						<Input className="max-w-[200px] text-right" defaultValue={total} />
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
