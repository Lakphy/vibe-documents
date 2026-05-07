import * as vscode from 'vscode';

export class PreviewCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const range = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(range, {
        title: '$(open-preview) Open Vibe Preview',
        command: 'vibeDocuments.showPreview',
        arguments: [document.uri],
      }),
    ];
  }
}
