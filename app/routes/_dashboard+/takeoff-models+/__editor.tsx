import { Editor, type Monaco } from '@monaco-editor/react'
import {
	useActionData,
	useNavigate,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { ArrowLeft } from 'lucide-react'
import React from 'react'
import { Button } from '#app/components/ui/button.js'
import typesFile from '#app/lib/takeoff/types.d.ts?raw'
import { type action } from './$takeoffModelId.code'

export type ModelCodeEditorProps = {
	model?: {
		id: string
		code: string
	}
}

export function ModelCodeEditor({ model }: ModelCodeEditorProps) {
	const editorRef = React.useRef<Monaco['editor'] | null>(null)
	const submit = useSubmit()
	const actionData = useActionData<typeof action>()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	React.useEffect(() => {
		return () => {
			if (editorRef.current) {
				editorRef.current.getModels().forEach(model => model.dispose())
			}
		}
	}, [])

	function handleEditorDidMount(editor: any, monaco: Monaco) {
		// here is the editor instance
		// you can store it in `useRef` for further usage
		editorRef.current = monaco.editor

		monaco.editor.defineTheme('custom', {
			base: 'vs-dark',
			inherit: true,
			rules: [],
			colors: {
				'editor.background': '#020818',
			},
		})

		monaco.editor.setTheme('custom')

		// validation settings
		monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: true,
			noSyntaxValidation: false,
		})

		// compiler options
		monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
			target: monaco.languages.typescript.ScriptTarget.ES2015,
			allowNonTsExtensions: true,
		})
		const typesUri = 'ts:filename/types.d.ts'
		monaco.languages.typescript.javascriptDefaults.addExtraLib(
			typesFile,
			typesUri,
		)

		// create model if not exists
		monaco.editor.createModel(
			typesFile,
			'typescript',
			monaco.Uri.parse(typesUri),
		)
	}

	function handleSave() {
		// save code
		const code = editorRef.current
			?.getModel(editorRef.current?.getModels()[0].uri)
			?.getValue() as string

		const formData = new FormData()
		formData.append('code', code)

		submit(formData, { method: 'post' })
	}

	return (
		<>
			<div className="flex justify-end p-4 w-full">
				{searchParams.has('goBackButton') && (
					<Button
						onClick={() => navigate(-1)}
						className="flex items-center gap-3 mr-auto"
                        variant='secondary'
					>
						<ArrowLeft size={16} />
						{searchParams.get('goBackButton')}
					</Button>
				)}

				<Button onClick={handleSave}>Save</Button>
			</div>
			<div>
				{actionData?.error &&
					actionData.error.map(error => (
						<div key={error} className="text-red-500">
							{error}
						</div>
					))}
			</div>
			<Editor
				height="calc(100vh - 180px)"
				className="mt-4"
				defaultLanguage="javascript"
				defaultValue={model?.code}
				theme="vs-dark"
				options={{
					scrollBeyondLastLine: false,
					minimap: { enabled: false },
				}}
				onMount={handleEditorDidMount}
			/>
		</>
		// const [form, fields] = useForm({
		// 	id: 'model-editor',
		// 	lastResult: actionData?.result,
		// 	defaultValue: model,
		// })
		// <Form method="post" {...getFormProps(form)}>
		// 	{model && <input type="hidden" name="id" value={model.id} />}
		// 	<TextareaField
		// 		labelProps={{ children: 'Content' }}
		// 		textareaProps={{
		//             rows: 20,
		// 			...getTextareaProps(fields.code),
		// 		}}
		// 		errors={fields.code.errors}
		// 	/>
		// 	<div id={form.errorId}
		//     className='text-red-500'
		//     >{form.errors}</div>
		// 	<Button>Save</Button>
		// </Form>
	)
}
