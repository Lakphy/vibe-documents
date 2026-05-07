import * as vscode from 'vscode';
import { MarkdownPreviewProvider } from './previewProvider';
import { PreviewCodeLensProvider } from './codeLensProvider';

export function activate(context: vscode.ExtensionContext) {
  const provider = new MarkdownPreviewProvider(context);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'markdown' },
      new PreviewCodeLensProvider()
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
    vscode.commands.registerCommand('vibeDocuments.toggleMode', () => {
      provider.toggleMode();
    })
  );
}

export function deactivate() {}
