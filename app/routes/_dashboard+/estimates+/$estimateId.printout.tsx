import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import React from 'react'
import { Button } from '#app/components/ui/button.js'
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
		},
	})

	invariantResponse(estimate, 'Estimate not found')

	return json({
		estimate,
	})
}

export default function EstimatePrintout() {
	// const data = useLoaderData()

	return (
		<div className="main-container mx-auto max-w-4xl p-8">
			<div className="mb-8 flex items-start justify-between">
				<div className="flex-grow">
					<Input
						className="mb-1 w-full text-2xl font-bold"
						defaultValue="<Company Name>"
					/>
					<Input
						className="mb-1 w-full text-sm"
						defaultValue="<123 Street Address, City, State, Zip/Post>"
					/>
					<Input
						className="mb-1 w-full text-sm"
						defaultValue="<Website, Email Address>"
					/>
					<Input
						className="mb-1 w-full text-sm"
						defaultValue="<Phone Number>"
					/>
				</div>
				<img
					src="https://fakeimg.pl/600x400"
					alt="Logo"
					className="h-24 w-24"
				/>
			</div>

			<div className="mb-8 flex">
				<div className="w-1/3">
					<h2 className="mb-2 font-bold">BILL TO</h2>
					<Input className="mb-1 w-full" defaultValue="<Contact Name>" />
					<Input className="mb-1 w-full" defaultValue="<Client Company Name>" />
					<Input className="mb-1 w-full" defaultValue="<Address>" />
					<Input className="mb-1 w-full" defaultValue="<Phone, Email>" />
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
					<Textarea
						className="w-full border p-2"
						defaultValue="<Add quote items here>"
						rows={8}
					/>
				</div>
			</div>

			<div className="flex items-start justify-between">
				<div className="w-1/2">
					<p className="mb-2 font-bold">Thank you for your business!</p>
					<h3 className="mb-2 font-bold">Terms & Instructions</h3>
					<Textarea
						className="h-24 w-full border p-2"
						defaultValue="<Add payment requirements here, for example deposit amount and payment method>\n\n<Add terms here, e.g. warranty, returns policy...>"
					/>
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
				className={cn('bg-background border-none print:resize-none', className)}
				ref={ref}
				{...props}
			/>
		)
	},
)
