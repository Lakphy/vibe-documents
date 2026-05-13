import * as path from 'path';

export type FileType = 'markdown' | 'excalidraw' | 'csv';

export const CUSTOM_EDITOR_VIEW_TYPES: Record<FileType, string> = {
  markdown: 'vibeDocuments.markdownEditor',
  csv: 'vibeDocuments.csvEditor',
  excalidraw: 'vibeDocuments.excalidrawEditor',
};

export function inferFileType(fsPath: string): FileType {
  const ext = path.extname(fsPath).toLowerCase();
  if (ext === '.csv') return 'csv';
  if (ext === '.excalidraw') return 'excalidraw';
  return 'markdown';
}

export function getCustomEditorViewType(fsPath: string) {
  return CUSTOM_EDITOR_VIEW_TYPES[inferFileType(fsPath)];
}
