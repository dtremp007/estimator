import { Editor, type Monaco } from '@monaco-editor/react'
import { ArrowLeft } from 'lucide-react'
import { type editor as MonacoEditor, type IDisposable } from 'monaco-editor'
import React from 'react'
import { useActionData, useNavigate, useSearchParams } from 'react-router'
import { Button } from '#app/components/ui/button.js'
import typesFile from '#app/lib/takeoff/types.d.ts?raw'
import { type action } from './$takeoffModelId.code'

export type ModelCodeEditorProps = {
	model?: {
		id: string
		code: string
	}
	/** Item names of the selected price list, suggested for priceLookupKey. */
	priceKeys: string[]
	/** Categories of the selected price list, suggested for getCategoryItems. */
	categories: string[]
	/** Receives the editor instance once it is mounted. */
	editorRef: React.MutableRefObject<MonacoEditor.IStandaloneCodeEditor | null>
	onSave: (code: string) => void
}

const TYPES_URI = 'ts:filename/types.d.ts'
const PRICELIST_TYPES_URI = 'ts:filename/pricelist.d.ts'

/**
 * Builds declarations that fill the PriceLookupKeys / PriceCategories
 * interfaces from types.d.ts, so Monaco suggests these strings.
 */
function buildPricelistTypes(priceKeys: string[], categories: string[]) {
	const members = (values: string[]) =>
		Array.from(new Set(values))
			.map(value => `\t${JSON.stringify(value)}: true`)
			.join('\n')

	return `interface PriceLookupKeys {\n${members(priceKeys)}\n}\ninterface PriceCategories {\n${members(categories)}\n}\n`
}

export function ModelCodeEditor({
	model,
	priceKeys,
	categories,
	editorRef,
	onSave,
}: ModelCodeEditorProps) {
	const [monaco, setMonaco] = React.useState<Monaco | null>(null)
	const actionData = useActionData<typeof action>()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	React.useEffect(() => {
		return () => {
			monaco?.editor.getModels().forEach(model => model.dispose())
		}
	}, [monaco])

	// Swap the price list suggestions whenever the selected price list changes
	React.useEffect(() => {
		if (!monaco) return
		const lib: IDisposable =
			monaco.languages.typescript.javascriptDefaults.addExtraLib(
				buildPricelistTypes(priceKeys, categories),
				PRICELIST_TYPES_URI,
			)
		return () => lib.dispose()
	}, [monaco, priceKeys, categories])

	function handleEditorDidMount(
		editor: MonacoEditor.IStandaloneCodeEditor,
		monaco: Monaco,
	) {
		editorRef.current = editor

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
		monaco.languages.typescript.javascriptDefaults.addExtraLib(
			typesFile,
			TYPES_URI,
		)

		// create model if not exists
		if (!monaco.editor.getModel(monaco.Uri.parse(TYPES_URI))) {
			monaco.editor.createModel(
				typesFile,
				'typescript',
				monaco.Uri.parse(TYPES_URI),
			)
		}

		setMonaco(monaco)
	}

	function handleSave() {
		const code = editorRef.current?.getValue()
		if (typeof code === 'string') onSave(code)
	}

	return (
		<>
			<div className="flex w-full justify-end p-4">
				{searchParams.has('goBackButton') && (
					<Button
						onClick={() => navigate(-1)}
						className="mr-auto flex items-center gap-3"
						variant="secondary"
					>
						<ArrowLeft size={16} />
						{searchParams.get('goBackButton')}
					</Button>
				)}

				<Button onClick={handleSave}>Save</Button>
			</div>
			<div className="px-4">
				{actionData?.error &&
					actionData.error.map(error => (
						<div key={error} className="text-red-500">
							{error}
						</div>
					))}
				{actionData?.missingPrices && actionData.missingPrices.length > 0 && (
					<details className="text-sm text-amber-500">
						<summary className="cursor-pointer">
							{actionData.missingPrices.length} price keys or categories
							aren&apos;t in the selected price list
						</summary>
						<p className="mt-1">{actionData.missingPrices.join(', ')}</p>
					</details>
				)}
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
					automaticLayout: true,
					quickSuggestions: { other: true, comments: false, strings: true },
				}}
				onMount={handleEditorDidMount}
			/>
		</>
	)
}
