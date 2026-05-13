import * as vscode from 'vscode';
import * as path from 'path';
import diff from 'fast-diff';
import { getNonce, buildPreviewHtml } from './utils';
import type { FileType } from './codeLensProvider';

function inferFileType(fsPath: string): FileType {
  const ext = path.extname(fsPath).toLowerCase();
  if (ext === '.excalidraw') return 'excalidraw';
  if (ext === '.csv') return 'csv';
  return 'markdown';
}

export class PreviewProvider {
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
    const panelTitle = `Preview: ${fileName}`;
    const fileType = inferFileType(uri.fsPath);
    const panel = vscode.window.createWebviewPanel(
      'vibeDocuments.preview',
      panelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'dist')),
          vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview-assets')),
          vscode.Uri.file(path.dirname(uri.fsPath)),
          ...(vscode.workspace.workspaceFolders?.map(f => f.uri) ?? []),
        ],
      }
    );

    panel.iconPath = new vscode.ThemeIcon('open-preview');
    this.panels.set(key, panel);

    let isUpdatingFromWebview = false;
    let lastSentContent = '';
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
    let webviewMessageQueue: Promise<unknown> = Promise.resolve();
    const DEBOUNCE_MS = 200;
    const MAX_WAIT_MS = 1000;

    const updatePanelTitle = (isDirty: boolean) => {
      panel.title = isDirty ? `${panelTitle} *` : panelTitle;
    };

    const updatePanelTitleFromDocument = (doc: vscode.TextDocument) => {
      updatePanelTitle(Boolean(doc.isDirty));
    };

    panel.onDidDispose(() => {
      this.panels.delete(key);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (maxWaitTimer) clearTimeout(maxWaitTimer);
      fileWatcher?.dispose();
      editorListener?.dispose();
      saveListener?.dispose();
    });

    const webviewAssetsDir = path.join(this.context.extensionPath, 'dist', 'webview-assets');
    const webviewJs = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(webviewAssetsDir, 'webview.js'))
    );
    const webviewCss = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(webviewAssetsDir, 'webview.css'))
    );

    const nonce = getNonce();
    panel.webview.html = buildPreviewHtml({
      cspSource: panel.webview.cspSource,
      nonce,
      scriptUri: webviewJs.toString(),
      cssUri: webviewCss.toString(),
    });

    const sendContent = async () => {
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = undefined; }
      if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = undefined; }
      if (isUpdatingFromWebview) return;
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        const content = doc.getText();
        updatePanelTitleFromDocument(doc);
        if (content === lastSentContent) return;
        lastSentContent = content;
        const resourceBaseUri = panel.webview.asWebviewUri(
          vscode.Uri.file(path.dirname(uri.fsPath))
        );
        panel.webview.postMessage({
          type: 'update',
          content,
          baseUri: resourceBaseUri.toString(),
          fileType,
        });
      } catch {
        // file may have been deleted
      }
    };

    const debouncedSendContent = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(sendContent, DEBOUNCE_MS);
      if (!maxWaitTimer) {
        maxWaitTimer = setTimeout(sendContent, MAX_WAIT_MS);
      }
    };

    const enqueueWebviewMessage = <T>(task: () => Promise<T>) => {
      const run = webviewMessageQueue.then(task, task);
      webviewMessageQueue = run.catch(() => undefined);
      return run;
    };

    const applyContentFromWebview = async (content: string) => {
      const doc = await vscode.workspace.openTextDocument(uri);
      const currentText = doc.getText();
      if (currentText === content) {
        lastSentContent = content;
        updatePanelTitleFromDocument(doc);
        return true;
      }

      isUpdatingFromWebview = true;
      try {
        const edit = new vscode.WorkspaceEdit();
        const diffs = diff(currentText, content);
        let offset = 0;
        for (const [op, text] of diffs) {
          if (op === diff.EQUAL) {
            offset += text.length;
          } else if (op === diff.DELETE) {
            const start = doc.positionAt(offset);
            const end = doc.positionAt(offset + text.length);
            edit.delete(uri, new vscode.Range(start, end));
            offset += text.length;
          } else if (op === diff.INSERT) {
            edit.insert(uri, doc.positionAt(offset), text);
          }
        }
        const applied = await vscode.workspace.applyEdit(edit);
        if (applied) {
          lastSentContent = content;
          updatePanelTitle(true);
        }
        return applied;
      } finally {
        setTimeout(() => {
          isUpdatingFromWebview = false;
        }, 100);
      }
    };

    const saveDocument = async (content?: string) => {
      const applied = typeof content === 'string'
        ? await applyContentFromWebview(content)
        : true;

      if (!applied) {
        vscode.window.showErrorMessage(`Failed to apply changes before saving ${fileName}.`);
        return;
      }

      const doc = await vscode.workspace.openTextDocument(uri);
      const saved = await doc.save();
      if (!saved) {
        vscode.window.showErrorMessage(`Failed to save ${fileName}.`);
        updatePanelTitleFromDocument(doc);
        return;
      }
      updatePanelTitle(false);
    };

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'ready') {
        return sendContent();
      } else if (msg.type === 'edit' && typeof msg.content === 'string') {
        return enqueueWebviewMessage(() => applyContentFromWebview(msg.content));
      } else if (msg.type === 'save') {
        return enqueueWebviewMessage(() => saveDocument(typeof msg.content === 'string' ? msg.content : undefined));
      }
    });

    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(path.dirname(uri.fsPath)), path.basename(uri.fsPath))
    );
    fileWatcher.onDidChange(() => debouncedSendContent());

    const editorListener = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === uri.toString()) {
        updatePanelTitleFromDocument(e.document);
        debouncedSendContent();
      }
    });

    const saveListener = vscode.workspace.onDidSaveTextDocument(e => {
      if (e.uri.toString() === uri.toString()) {
        updatePanelTitle(false);
      }
    });

    this.context.subscriptions.push(fileWatcher, editorListener, saveListener);
  }
}

/** @deprecated Use PreviewProvider instead */
export const MarkdownPreviewProvider = PreviewProvider;
