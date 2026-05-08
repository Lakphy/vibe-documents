import * as vscode from 'vscode';
import { PreviewProvider } from './previewProvider';
import { PreviewCodeLensProvider } from './codeLensProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new PreviewProvider(context);

  context.subscriptions.push(
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
      const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (targetUri) {
        provider.showPreview(targetUri, vscode.ViewColumn.Active);
      }
    }),
    vscode.commands.registerCommand('vibeDocuments.showPreviewToSide', (uri?: vscode.Uri) => {
      const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (targetUri) {
        provider.showPreview(targetUri, vscode.ViewColumn.Beside);
      }
    }),
    vscode.commands.registerCommand('vibeDocuments.showExcalidrawPreview', (uri?: vscode.Uri) => {
      const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (targetUri) {
        provider.showPreview(targetUri, vscode.ViewColumn.Active);
      }
    }),
    vscode.commands.registerCommand('vibeDocuments.showCsvPreview', (uri?: vscode.Uri) => {
      const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (targetUri) {
        provider.showPreview(targetUri, vscode.ViewColumn.Active);
      }
    }),
    vscode.commands.registerCommand('vibeDocuments.toggleMode', () => {
      provider.toggleMode();
    })
  );
}

export function deactivate() {}
