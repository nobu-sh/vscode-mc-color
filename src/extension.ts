import * as vscode from "vscode";

import { getConfig, type Config } from "./config";
import { Formatter } from "./formatter";

let config: Config;
let instances: Array<Formatter> = [];

export function activate(context: vscode.ExtensionContext) {
  config = getConfig();

  // On Editor Change/Open
  vscode.window.onDidChangeVisibleTextEditors(
    onOpenEditorChanges,
    null,
    context.subscriptions
  );
  // On configuration changes
  vscode.workspace.onDidChangeConfiguration(
    onConfigurationChange,
    null,
    context.subscriptions
  );

  onOpenEditorChanges(vscode.window.visibleTextEditors);

  console.log("[mc-color] is now active!");
}

export function deactivate() {
  instances.forEach((instance) => instance.destroy());
  instances = [];

  console.log("[mc-color] deactivated!");
}

function reactivate() {
  deactivate();
  onOpenEditorChanges(vscode.window.visibleTextEditors);

  console.log("[mc-color] reactivated!");
}

function findOrCreateInstance(document: vscode.TextDocument): Formatter {
  const found = instances.find(({ document: refDoc }) => refDoc === document);
  if (found) return found;

  const instance = new Formatter(document, config);
  instances.push(instance);

  return instance;
}

function formatDocuments(docs: Array<vscode.TextDocument> = []): void {
  if (docs.length < 1) return;

  const instances = docs.map(findOrCreateInstance);
  instances.forEach((instance) => instance.onUpdate());
}

function onConfigurationChange() {
  config = getConfig();
  reactivate();
}

function onOpenEditorChanges(editors: ReadonlyArray<vscode.TextEditor>): void {
  if (!config.enable) return;

  // Dispose inactive instances
  const documents = editors.map(({ document }) => document);
  const forDisposal = instances.filter(
    ({ document }) => documents.indexOf(document!) === -1
  );

  // Update array with active instances
  instances = instances.filter(
    ({ document }) => documents.indexOf(document!) !== -1
  );
  forDisposal.forEach((instance) => instance.destroy());

  formatDocuments(documents);
}
