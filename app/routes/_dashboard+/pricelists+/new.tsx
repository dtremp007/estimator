import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	redirect,
} from '@remix-run/node'
import { Input } from '#app/components/ui/input'
import { requireUserId } from '#app/utils/auth.server.js'
import { parsePricelistFormData } from '#app/utils/csv-upload-handler.js'
import { prisma } from '#app/utils/db.server'
import { nameTheThing } from '#app/utils/naming.server.js'

export const handle = {
	breadcrumb: 'New',
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	return json({})
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const { result } = await parsePricelistFormData(request)
	if (!result.success) {
		return json({ error: result.error }, { status: 400 })
	}

	const name = await nameTheThing(userId, 'New Pricelist', 'pricelist')
	const newPricelist = await prisma.pricelist.create({
		data: {
			ownerId: userId,
			name,
			items: { create: result.data },
		},
	})

	return redirect(`/pricelists/${newPricelist.id}`)
}

export default function UploadPricelist() {
	return (
		<div className="main-container flex h-fit w-fit flex-col gap-4 rounded-lg border border-dashed border-gray-300 px-4 pb-4 pt-8">
			<p>Upload a CSV file with the pricelist data.</p>
			<form method="post" encType="multipart/form-data">
				<Input
					type="file"
					name="pricelist"
					onChange={e => {
						// check if there is a file
						if (!e.target.files) return

						const form = e.target.form
						form?.submit()
					}}
				/>
			</form>
		</div>
	)
}
