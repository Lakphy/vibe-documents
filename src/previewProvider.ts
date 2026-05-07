import * as vscode from 'vscode';
import * as path from 'path';
import { getNonce, buildPreviewHtml } from './utils';

export class MarkdownPreviewProvider {
  private panels = new Map<string, vscode.WebviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  getPanelCount(): number {
    return this.panels.size;
  }

  hasPanel(uri: string): boolean {
    return this.panels.has(uri);
  }

  toggleMode() {
    for (const [, panel] of this.panels) {
      if (panel.active) {
        panel.webview.postMessage({ type: 'toggleMode' });
        return;
      }
    }
  }

  showPreview(uri: vscode.Uri, column: vscode.ViewColumn) {
    const key = uri.toString();
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal(column);
      return;
    }

    const fileName = path.basename(uri.fsPath);
    const panel = vscode.window.createWebviewPanel(
      'vibeDocuments.preview',
      `Preview: ${fileName}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'dist')),
          vscode.Uri.file(path.dirname(uri.fsPath)),
          ...(vscode.workspace.workspaceFolders?.map(f => f.uri) ?? []),
        ],
      }
    );

    panel.iconPath = new vscode.ThemeIcon('open-preview');
    this.panels.set(key, panel);

    let isUpdatingFromWebview = false;

    panel.onDidDispose(() => {
      this.panels.delete(key);
      fileWatcher?.dispose();
      editorListener?.dispose();
    });

    const webviewJs = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview.js'))
    );
    const webviewCss = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview.css'))
    );

    const nonce = getNonce();
    panel.webview.html = buildPreviewHtml({
      cspSource: panel.webview.cspSource,
      nonce,
      scriptUri: webviewJs.toString(),
      cssUri: webviewCss.toString(),
    });

    const sendContent = async () => {
      if (isUpdatingFromWebview) return;
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        const content = doc.getText();
        const resourceBaseUri = panel.webview.asWebviewUri(
          vscode.Uri.file(path.dirname(uri.fsPath))
        );
        panel.webview.postMessage({
          type: 'update',
          content,
          baseUri: resourceBaseUri.toString(),
        });
      } catch {
        // file may have been deleted
      }
    };

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'edit' && typeof msg.content === 'string') {
        const doc = await vscode.workspace.openTextDocument(uri);
        const currentText = doc.getText();
        if (currentText === msg.content) return;

        isUpdatingFromWebview = true;
        try {
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(currentText.length)
          );
          edit.replace(uri, fullRange, msg.content);
          await vscode.workspace.applyEdit(edit);
        } finally {
          setTimeout(() => {
            isUpdatingFromWebview = false;
          }, 100);
        }
      }
    });

    sendContent();

    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(path.dirname(uri.fsPath)), path.basename(uri.fsPath))
    );
    fileWatcher.onDidChange(() => sendContent());

    const editorListener = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === uri.toString()) {
        sendContent();
      }
    });

    this.context.subscriptions.push(fileWatcher, editorListener);
  }
}
