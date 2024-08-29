import {
	getFormProps,
	getInputProps,
	getTextareaProps,
	useForm,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
	redirect,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.js'
import { SidebarLayout } from '#app/components/sidebar-layout.js'
import { Button } from '#app/components/ui/button'
import { Label } from '#app/components/ui/label'
import { ScrollArea } from '#app/components/ui/scroll-area.js'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from '#app/components/ui/tabs'
import { Textarea } from '#app/components/ui/textarea'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { cn, useIsPending } from '#app/utils/misc.tsx'

export const handle = {
	breadcrumb: 'Template',
}

const MAX_SIZE = 1024 * 1024 * 3 // 3MB

const templateSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	companyName: z.string().min(1, 'Company name is required'),
	companyInfo: z.string(),
	bodyTemplate: z.string(),
	greeting: z.string(),
	logoImage: z
		.instanceof(File)
		.optional()
		.refine(
			file => !file || file.size <= MAX_SIZE,
			'Image size must be less than 3MB',
		),
})

type TemplateSchema = z.infer<typeof templateSchema>

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const { takeoffModelId, templateId } = params

	const takeoffModel = await prisma.takeoffModel.findUnique({
		where: { id: takeoffModelId },
		include: {
			variables: true,
			inputs: true,
		},
	})

	invariantResponse(takeoffModel, 'Takeoff model not found', { status: 404 })

	if (templateId === 'new') {
		return json({
			template: {
				name: '',
				companyName: '',
				companyInfo: '',
				bodyTemplate: '',
				greeting: 'Thank you for your business!',
				logoImageId: null,
			},
			takeoffModel,
		})
	}

	const template = await prisma.printTemplate.findFirst({
		where: {
			id: templateId,
			takeoffModel: {
				id: takeoffModelId,
				ownerId: userId,
			},
		},
	})

	if (!template) {
		throw new Response('Not found', { status: 404 })
	}

	return json({ template, takeoffModel })
}

export async function action({ params, request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const { takeoffModelId, templateId } = params

	invariantResponse(takeoffModelId, 'Takeoff model ID is required')

	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)

	const submission = await parseWithZod(formData, {
		schema: templateSchema.transform(async data => {
			let image = null
			if (data.logoImage && data.logoImage.size > 0) {
				image = {
					contentType: data.logoImage.type,
					blob: Buffer.from(await data.logoImage.arrayBuffer()),
				}
			}
			return {
				...data,
				image,
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json({ result: submission.reply() }, { status: 400 })
	}

	const { name, companyName, companyInfo, bodyTemplate, greeting, image } =
		submission.value

	if (templateId === 'new') {
		await prisma.printTemplate.create({
			// @ts-expect-error - image is optional
			data: {
				name,
				companyName,
				companyInfo,
				bodyTemplate,
				greeting,
				takeoffModelId,
				logoImage: image ? { create: image } : undefined,
			},
		})
	} else {
		await prisma.printTemplate.update({
			where: {
				id: templateId,
				takeoffModel: {
					id: takeoffModelId,
					ownerId: userId,
				},
			},
			data: {
				name,
				companyName,
				companyInfo,
				bodyTemplate,
				greeting,
				logoImage: image
					? { upsert: { create: image, update: image } }
					: undefined,
			},
		})
	}

	return redirect(`/takeoff-models/${takeoffModelId}`)
}

export default function TemplateForm() {
	const data = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
	const bodyTemplateRef = useRef<HTMLTextAreaElement>(null)
	const [logoPreview, setLogoPreview] = useState<string | null>(null)

	const [form, fields] = useForm<TemplateSchema>({
		id: 'template-form',
		constraint: getZodConstraint(templateSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: templateSchema })
		},
		defaultValue: data.template ?? undefined,
		shouldRevalidate: 'onBlur',
	})

	const insertVariable = (variable: string) => {
		if (bodyTemplateRef.current) {
			const start = bodyTemplateRef.current.selectionStart
			const end = bodyTemplateRef.current.selectionEnd
			const text = bodyTemplateRef.current.value
			const before = text.substring(0, start)
			const after = text.substring(end, text.length)
			bodyTemplateRef.current.value = `${before}{{ ${variable} }}${after}`
			bodyTemplateRef.current.focus()
			bodyTemplateRef.current.selectionStart =
				bodyTemplateRef.current.selectionEnd = start + variable.length + 6
		}
	}

	return (
		<SidebarLayout
			title="Template Variables"
			description="These are the variables that can be used in the template."
			sidebarContent={
				<SidebarContent
					takeoffModel={data.takeoffModel}
					onVariableClick={insertVariable}
				/>
			}
			open={isSidebarOpen}
			onOpenChange={setIsSidebarOpen}
		>
			<Form
				method="POST"
				encType="multipart/form-data"
				{...getFormProps(form)}
				className="m-auto mb-20 mt-16 max-w-2xl space-y-8 px-4"
			>
				<Field
					labelProps={{ children: 'Template Name' }}
					inputProps={{
						...getInputProps(fields.name, { type: 'text' }),
						autoFocus: true,
					}}
					errors={fields.name.errors}
				/>
				<Field
					labelProps={{ children: 'Company Name' }}
					inputProps={getInputProps(fields.companyName, { type: 'text' })}
					errors={fields.companyName.errors}
				/>
				<div>
					<Label htmlFor={fields.companyInfo.id}>Company Information</Label>
					<Textarea
						{...getTextareaProps(fields.companyInfo)}
						className="mt-2"
					/>
					<ErrorList
						errors={fields.companyInfo.errors}
						id={fields.companyInfo.errorId}
					/>
				</div>
				<div>
					<Label htmlFor={fields.bodyTemplate.id}>Body Template</Label>
					<p className="mb-2 text-sm font-medium text-foreground/80">
						This is where you create the main content of your estimate template.
						You can use special placeholders to insert dynamic values from your
						estimate. Here's how:
					</p>
					<ul className="mb-2 list-inside list-disc text-sm text-foreground/80">
						<li>
							Use <code className="font-bold">{'{{ variable }}'}</code> to
							insert dynamic values. For example, <code>{'{{ width }}'}</code>{' '}
							will be replaced with the actual width value from your estimate.
						</li>
						<li>
							You can use any input or variable from your takeoff model as a
							placeholder.
						</li>
						<li>
							Special placeholders like <code>{'{{ total }}'}</code> and{' '}
							<code>{'{{ date }}'}</code> are also available for the total cost
							and current date.
						</li>
					</ul>
					<p className="mb-2 text-sm font-medium text-foreground/80">
						Not sure what variables are available?{' '}
						<Button
							variant="link"
							className="p-0 text-sm text-blue-600"
							type="button"
							onClick={() => setIsSidebarOpen(true)}
						>
							Click here to show all available variables
						</Button>
					</p>
					<Textarea
						{...getTextareaProps(fields.bodyTemplate)}
						className="mt-2"
						rows={10}
						ref={bodyTemplateRef}
					/>
					<ErrorList
						errors={fields.bodyTemplate.errors}
						id={fields.bodyTemplate.errorId}
					/>
				</div>
				<Field
					labelProps={{ children: 'Greeting' }}
					inputProps={getInputProps(fields.greeting, { type: 'text' })}
					errors={fields.greeting.errors}
				/>
				<div>
					<Label htmlFor={fields.logoImage.id}>Logo</Label>
					{logoPreview || data.template.logoImageId ? (
						<img
							src={
								logoPreview ??
								`/resources/logo-images/${data.template.logoImageId}`
							}
							alt="Logo preview"
							className="mt-2 h-32 w-32 object-contain"
						/>
					) : null}
					<input
						{...getInputProps(fields.logoImage, { type: 'file' })}
						accept="image/*"
						onChange={e => {
							const file = e.currentTarget.files?.[0]
							if (file) {
								const reader = new FileReader()
								reader.onload = event => {
									setLogoPreview(event.target?.result?.toString() ?? null)
								}
								reader.readAsDataURL(file)
							}
						}}
					/>
					<ErrorList
						errors={fields.logoImage.errors}
						id={fields.logoImage.errorId}
					/>
				</div>
				<ErrorList errors={form.errors} id={form.errorId} />
				<div className="flex justify-end gap-4">
					<StatusButton
						type="submit"
						status={isPending ? 'pending' : form.status ?? 'idle'}
					>
						Save
					</StatusButton>
				</div>
			</Form>
		</SidebarLayout>
	)
}

function SidebarContent({
	takeoffModel,
	onVariableClick,
}: {
	takeoffModel: { variables: any[]; inputs: any[] }
	onVariableClick: (variable: string) => void
}) {
	const [currentPage, setCurrentPage] = useState(1)
	const [activeTab, setActiveTab] = useState('variables')
	const itemsPerPage = 7

	const paginateItems = (items: any[]) => {
		const startIndex = (currentPage - 1) * itemsPerPage
		return items.slice(startIndex, startIndex + itemsPerPage)
	}

	const renderPaginationButtons = (items: any[]) => {
		const totalPages = Math.ceil(items.length / itemsPerPage)
		return (
			<div className="mt-4 flex justify-between">
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
					disabled={currentPage === 1}
				>
					<ChevronLeft className="h-4 w-4" />
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
					disabled={currentPage === totalPages || items.length <= itemsPerPage}
				>
					Next
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		)
	}

	const handleTabChange = (value: string) => {
		setActiveTab(value)
		setCurrentPage(1)
	}

	return (
		<ScrollArea className="pb-4 pr-4 md:h-[calc(100vh-152px)]">
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList>
					<TabsTrigger value="variables">Variables</TabsTrigger>
					<TabsTrigger value="inputs">Inputs</TabsTrigger>
					<TabsTrigger value="special">Special</TabsTrigger>
				</TabsList>
				<TabsContent value="variables">
					<ul className="space-y-2">
						{paginateItems(takeoffModel.variables).map(variable => (
							<VariableCard
								key={variable.id}
								variable={variable}
								onClick={onVariableClick}
							/>
						))}
					</ul>
					{renderPaginationButtons(takeoffModel.variables)}
				</TabsContent>
				<TabsContent value="inputs">
					<ul className="space-y-2">
						{paginateItems(takeoffModel.inputs).map(input => (
							<VariableCard
								key={input.id}
								variable={input}
								onClick={onVariableClick}
							/>
						))}
					</ul>
					{renderPaginationButtons(takeoffModel.inputs)}
				</TabsContent>
				<TabsContent value="special">
					<ul className="space-y-2">
						<VariableCard
							variable={{ name: 'total', type: 'number' }}
							onClick={onVariableClick}
						/>
						<VariableCard
							variable={{ name: 'date', type: 'string' }}
							onClick={onVariableClick}
						/>
					</ul>
				</TabsContent>
			</Tabs>
		</ScrollArea>
	)
}

function VariableCard({
	variable,
	onClick,
}: {
	variable: {
		name: string
		type: string
	}
	onClick: (variable: string) => void
}) {
	const [isClicked, setIsClicked] = useState(false)

	useEffect(() => {
		let timer: NodeJS.Timeout
		if (isClicked) {
			timer = setTimeout(() => setIsClicked(false), 500) // Hide checkmark after 3 seconds
		}
		return () => clearTimeout(timer)
	}, [isClicked])

	const handleClick = () => {
		onClick(variable.name)
		setIsClicked(true)
	}

	return (
		<li className="flex items-center justify-between">
			<Button
				variant="ghost"
				className="font-medium transition-all duration-200 ease-in-out hover:scale-105 focus:scale-105"
				onClick={handleClick}
			>
				<span className="flex items-center">
					<span
						className={cn(
							'opacity-100 transition-opacity duration-1000 ease-in-out',
							isClicked && 'opacity-50 duration-200',
						)}
					>
						{variable.name}
					</span>
					<Check
						className={cn(
							'ml-2 h-4 w-4 text-green-500 opacity-0 transition-opacity duration-1000 ease-in-out',
							isClicked && 'opacity-100 duration-200',
						)}
					/>
				</span>
			</Button>
			<span className="text-muted-foreground">{variable.type}</span>
		</li>
	)
}
