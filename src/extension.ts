import * as vscode from 'vscode';
import { PreviewCodeLensProvider } from './codeLensProvider';
import { VibeCustomTextEditorProvider } from './customTextEditorProvider';
import { CUSTOM_EDITOR_VIEW_TYPES, getCustomEditorViewType } from './editorTypes';

export function activate(context: vscode.ExtensionContext) {
  const provider = new VibeCustomTextEditorProvider(context);

  const openWithVibeEditor = (uri: vscode.Uri | undefined, column: vscode.ViewColumn) => {
    const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (!targetUri) return;

    return vscode.commands.executeCommand(
      'vscode.openWith',
      targetUri,
      getCustomEditorViewType(targetUri.fsPath),
      { viewColumn: column }
    );
  };

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      CUSTOM_EDITOR_VIEW_TYPES.markdown,
      provider,
      { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }
    ),
    vscode.window.registerCustomEditorProvider(
      CUSTOM_EDITOR_VIEW_TYPES.csv,
      provider,
      { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }
    ),
    vscode.window.registerCustomEditorProvider(
      CUSTOM_EDITOR_VIEW_TYPES.excalidraw,
      provider,
      { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }
    ),
    vscode.languages.registerCodeLensProvider(
      { language: 'markdown' },
      new PreviewCodeLensProvider('markdown')
    ),
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.excalidraw' },
      new PreviewCodeLensProvider('excalidraw')
    ),
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/*.csv' },
      new PreviewCodeLensProvider('csv')
    ),
    vscode.commands.registerCommand('vibeDocuments.showPreview', (uri?: vscode.Uri) => {
      return openWithVibeEditor(uri, vscode.ViewColumn.Active);
    }),
    vscode.commands.registerCommand('vibeDocuments.showPreviewToSide', (uri?: vscode.Uri) => {
      return openWithVibeEditor(uri, vscode.ViewColumn.Beside);
    }),
    vscode.commands.registerCommand('vibeDocuments.showExcalidrawPreview', (uri?: vscode.Uri) => {
      return openWithVibeEditor(uri, vscode.ViewColumn.Active);
    }),
    vscode.commands.registerCommand('vibeDocuments.showCsvPreview', (uri?: vscode.Uri) => {
      return openWithVibeEditor(uri, vscode.ViewColumn.Active);
    }),
    vscode.commands.registerCommand('vibeDocuments.toggleMode', () => {
      provider.toggleMode();
    })
  );
}

export function deactivate() {}
