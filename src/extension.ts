import * as vscode from 'vscode'
import { Highlight } from './Highlight'

export type MarkerType = 'foreground' | 'background' | 'outline' | 'underline'
export interface Config extends vscode.WorkspaceConfiguration {
	enabled?: boolean,
	langauges?: string[],
	markerType?: MarkerType
	prefixes?: string[]
	delimiters?: string[]
	newLineDelimiter?: boolean
}

let instanceMap: Highlight[] = []
let config: Config

export function activate(context: vscode.ExtensionContext) {
	console.log('mc-color is now active')

	// Reset Instance Map
	instanceMap = []
	// Set Config To Workspace Configurations
	config = vscode.workspace.getConfiguration('mc-color')

	// Create Listener For McColor Command
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('extension.mcColor', runHighlightEditorCommand)
	)

	// On Editor Change/Open
	vscode.window.onDidChangeVisibleTextEditors(onOpenEditor, null, context.subscriptions)
	// On Configuration Change
	vscode.workspace.onDidChangeConfiguration(onConfigurationChange, null, context.subscriptions)

	// Call Open Editor Method
	onOpenEditor(vscode.window.visibleTextEditors)
}

function isValidDocument(config: Config, { languageId }: vscode.TextDocument): boolean {
	let isValid = false

	// If not enabled dont continue further
	if (!config?.enabled) {
		return isValid
	}

	// If no prefixes
	if (!config.prefixes?.length) {
		return isValid
	}

	// If config languages contains (*) then files clearly okay
	if ((config?.langauges?.indexOf('*') ?? -1) > -1) {
		isValid = true
	}

	// If languages include language id then its okay.
	if ((config?.langauges?.includes(languageId) ?? false)) {
		isValid = true
	}

	// If languages includes ignorer for langauge then not okay
	if ((config?.langauges?.includes(`!${languageId}`) ?? false)) {
		isValid = false
	}

	return isValid
}

export function deactivate() {
	// Disipose all instances
	instanceMap.forEach((instance) => instance.dispose())
	// Reset instances
	instanceMap = []
}

function reactivate(): void {
	// Call deactivate
	deactivate()

	// Ensure empty instance map
	instanceMap = []
	// Call open editor again
	onOpenEditor(vscode.window.visibleTextEditors)
}

async function runHighlightEditorCommand(editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
	// Get document
	const document = editor.document

	// Literally says what it does
	return doHighlight([document])
}

function findOrCreateInstance(document: vscode.TextDocument): Highlight | undefined {
	// If not document then why are we here?
	if (!document) {
		return undefined
	}

	// If found then cool we can just return this
	const found = instanceMap.find(({ document: refDoc }) => refDoc === document)

	// Else we need to create a new one
	if (!found) {
		const instance = new Highlight(document, config)
		instanceMap.push(instance)

		return instance
	}

	return found
}

async function doHighlight(docs: vscode.TextDocument[] = []): Promise<Promise<boolean | void>[] | void> {
	// If no docs then why are we here?
	if (docs.length) {
		// Get all highlight instances from docs
		const instances = docs.map(findOrCreateInstance)

		// Call onUpdate method of every highlight instance.
		return instances.map((inst) => {
			if (inst) {
				return inst.onUpdate()
			}
			return Promise.resolve(false)
		})
	}
}

function onConfigurationChange() {
	// Get new config
	config = vscode.workspace.getConfiguration('mc-color')

	// Reset
	reactivate()
}

function onOpenEditor(editors: readonly vscode.TextEditor[]): void {
	// dispose all inactive editors
	const documents = editors.map(({ document }) => document)
	const forDisposal = instanceMap.filter(({ document }) => documents.indexOf(document!) === -1)

	// Reassign active ones
	instanceMap = instanceMap.filter(({ document }) => documents.indexOf(document!) > -1)
	forDisposal.forEach((instance) => instance.dispose())

	// Call doHighlight on valid docs
	const validDocuments = documents.filter((doc) => isValidDocument(config, doc))
	doHighlight(validDocuments)
}
