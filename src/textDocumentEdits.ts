import * as vscode from 'vscode';
import diff from 'fast-diff';

export interface DocumentEditResult {
  edit: vscode.WorkspaceEdit;
  hasChanges: boolean;
}

export function createTextDocumentEdit(document: vscode.TextDocument, nextContent: string): DocumentEditResult {
  const currentText = document.getText();
  const edit = new vscode.WorkspaceEdit();
  let offset = 0;
  let hasChanges = false;

  for (const [op, text] of diff(currentText, nextContent)) {
    if (op === diff.EQUAL) {
      offset += text.length;
    } else if (op === diff.DELETE) {
      const start = document.positionAt(offset);
      const end = document.positionAt(offset + text.length);
      edit.delete(document.uri, new vscode.Range(start, end));
      offset += text.length;
      hasChanges = true;
    } else if (op === diff.INSERT) {
      edit.insert(document.uri, document.positionAt(offset), text);
      hasChanges = true;
    }
  }

  return { edit, hasChanges };
}

export async function applyTextDocumentContent(document: vscode.TextDocument, nextContent: string) {
  const { edit, hasChanges } = createTextDocumentEdit(document, nextContent);
  if (!hasChanges) return true;
  return vscode.workspace.applyEdit(edit);
}
