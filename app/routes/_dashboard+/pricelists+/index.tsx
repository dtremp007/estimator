import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	unstable_parseMultipartFormData as parseMultipartFormData,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	redirect,
} from '@remix-run/node'
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
} from '@remix-run/react'
import BasicTable from '#app/components/basic-table.js'
import { Button } from '#app/components/ui/button.js'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog'
import { Icon } from '#app/components/ui/icon.js'
import { Input } from '#app/components/ui/input'
import { Label } from '#app/components/ui/label'
import { TableCell, TableRow } from '#app/components/ui/table'
import { PricelistSchema } from '#app/lib/takeoff/pricelist.class.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { parseCSVFromFile } from '#app/utils/csv-parser.js'
import {
	csvUploadHandler,
	isUploadedFile,
} from '#app/utils/csv-upload-handler.js'
import { prisma } from '#app/utils/db.server'
import { formatListTimeAgo } from '#app/utils/misc.js'
import {
	requireUserWithPermission,
} from '#app/utils/permissions.server.js'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const pricelists = await prisma.pricelist.findMany({
		where: { ownerId: userId },
	})

	invariantResponse(pricelists, 'Not found', { status: 404 })

	return json({ pricelists: formatListTimeAgo(pricelists) })
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await parseMultipartFormData(request, csvUploadHandler)
	const intent = formData.get('intent')

	if (intent === 'delete') {
		return handlePricelistDelete(request, userId, formData)
	}

	if (intent === 'upload') {
		return handleCSVUpload(userId, formData)
	}

	return null
}

export default function Pricelists() {
	const data = useLoaderData<typeof loader>()

	return (
		<div className="main-container">
			<BasicTable
				headers={['Name', 'Created', 'Delete']}
				title="Pricelists"
				description="A list of your pricelists."
				actionButton={<CSVUploadDialog />}
			>
				{data.pricelists.map(pricelist => (
					<TableRow key={pricelist.id}>
						<TableCell className="font-medium">
							<Link to={pricelist.id} className="hover:underline">
								{pricelist.name}
							</Link>
						</TableCell>
						<TableCell>{pricelist.updatedAt} ago</TableCell>
						<TableCell>
							<Form method="post">
								<input type="hidden" name="intent" value="delete" />
								<input type="hidden" name="id" value={pricelist.id} />
								<Button type="submit" variant="ghost">
									<Icon name="trash" />
								</Button>
							</Form>
						</TableCell>
					</TableRow>
				))}
			</BasicTable>
		</div>
	)
}

async function handleCSVUpload(userId: string, formData: FormData) {
	const file = formData.get('pricelist')
	const name = formData.get('name') as string

	if (!isUploadedFile(file)) return null

	const pricelistFromCSV = await parseCSVFromFile(file.getFilePath())

	const result = PricelistSchema.safeParse(pricelistFromCSV)

	if (!result.success) {
		return json({ error: result.error }, { status: 400 })
	}

	const pricelistData = result.data

	const newPricelist = await prisma.pricelist.create({
		data: {
			ownerId: userId,
			name: name,
		},
	})

	pricelistData.forEach(async item => {
		await prisma.pricelistItem.create({
			data: {
				pricelistId: newPricelist.id,
				category: item.category,
				name: item.name,
				pricePerUnit: item.pricePerUnit,
				unitType: item.unitType,
				currency: item.currency,
			},
		})
	})

	return redirect(`/pricelists/${newPricelist.id}`)
}

function CSVUploadDialog() {
	const actionData = useActionData<typeof action>()

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Edit Profile</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Upload Pricelist</DialogTitle>
					<DialogDescription>
						Upload a new pricelist to add to your collection. Must be in CSV
						format.
						<br />
						<br />
						Here are the columns that are required:
						<ul className="list-inside list-disc">
							<li>Material</li>
							<li>Category</li>
							<li>Price</li>
						</ul>
					</DialogDescription>
					<pre className="text-red-500">{actionData?.error?.message}</pre>
				</DialogHeader>
				<Form method="post" encType="multipart/form-data">
					<input type="hidden" name="intent" value="upload" />
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="name">Name</Label>
							<Input type="text" name="name" required className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="supplier">Supplier</Label>
							<Input
								type="text"
								name="supplier"
								required
								className="col-span-3"
							/>
						</div>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="pricelist">CSV File</Label>
						<Input
							type="file"
							name="pricelist"
							className="col-span-3 cursor-pointer"
							accept=".csv"
							required
						/>
					</div>
					<DialogFooter className="mt-4">
						<Button type="submit">Upload</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	)
}

async function handlePricelistDelete(request: Request, userId: string, formData: FormData) {
    const id = formData.get('id') as string

    const pricelist = await prisma.pricelist.findFirst({
        where: {
            id: id,
        },
    })

    invariantResponse(pricelist, 'Not found', { status: 404 })

    const isOwner = pricelist.ownerId === userId
    await requireUserWithPermission(
        request,
        isOwner ? `delete:pricelist:own` : `delete:pricelist:any`,
    )

    await prisma.pricelist.delete({
        where: {
            id: id,
        },
    })

    return null
}
