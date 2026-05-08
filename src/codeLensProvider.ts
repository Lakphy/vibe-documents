import * as vscode from 'vscode';

export type FileType = 'markdown' | 'excalidraw' | 'csv';

const FILE_TYPE_CONFIG: Record<FileType, { title: string; command: string }> = {
  markdown: {
    title: '$(open-preview)  Open Vibe Preview',
    command: 'vibeDocuments.showPreview',
  },
  excalidraw: {
    title: '$(open-preview)  Open Excalidraw Editor',
    command: 'vibeDocuments.showExcalidrawPreview',
  },
  csv: {
    title: '$(open-preview)  Open CSV Preview',
    command: 'vibeDocuments.showCsvPreview',
  },
};

export class PreviewCodeLensProvider implements vscode.CodeLensProvider {
  constructor(private readonly fileType: FileType = 'markdown') {}

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const config = FILE_TYPE_CONFIG[this.fileType];
    const range = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(range, {
        title: config.title,
        command: config.command,
        arguments: [document.uri],
      }),
    ];
  }
}
