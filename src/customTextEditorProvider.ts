import * as vscode from 'vscode';
import { inferFileType } from './editorTypes';
import { applyTextDocumentContent } from './textDocumentEdits';
import { configureEditorWebview, getResourceBaseUri } from './webviewHost';

export class VibeCustomTextEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly panels = new Set<vscode.WebviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  toggleMode() {
    for (const panel of this.panels) {
      if (panel.active) {
        panel.webview.postMessage({ type: 'toggleMode' });
        return;
      }
    }
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const resourceKey = document.uri.toString();
    const fileType = inferFileType(document.uri.fsPath);
    let lastSentContent: string | undefined;
    let webviewMessageQueue: Promise<unknown> = Promise.resolve();
    let pendingContentPost: ReturnType<typeof setTimeout> | undefined;

    this.panels.add(panel);
    panel.iconPath = new vscode.ThemeIcon('open-preview');

    configureEditorWebview(this.context, panel, document.uri);

    const postDocumentContent = (force = false) => {
      const content = document.getText();
      if (!force && content === lastSentContent) return;

      lastSentContent = content;
      panel.webview.postMessage({
        type: 'update',
        content,
        baseUri: getResourceBaseUri(panel, document.uri),
        fileType,
      });
    };

    const scheduleDocumentContentPost = () => {
      if (pendingContentPost !== undefined) {
        clearTimeout(pendingContentPost);
      }
      pendingContentPost = setTimeout(() => {
        pendingContentPost = undefined;
        postDocumentContent();
      }, 50);
    };

    const enqueueWebviewMessage = <T>(task: () => Promise<T>) => {
      const run = webviewMessageQueue.then(task, task);
      webviewMessageQueue = run.catch(() => undefined);
      return run;
    };

    const applyContentFromWebview = async (content: string) => {
      const applied = await applyTextDocumentContent(document, content);
      if (applied) {
        lastSentContent = content;
      }
      return applied;
    };

    const saveDocument = async (content?: string) => {
      const applied = typeof content === 'string'
        ? await applyContentFromWebview(content)
        : true;

      if (!applied) {
        vscode.window.showErrorMessage(`Failed to apply changes before saving ${document.fileName}.`);
        return;
      }

      const saved = await document.save();
      if (!saved) {
        vscode.window.showErrorMessage(`Failed to save ${document.fileName}.`);
      }
    };

    const changeListener = vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document.uri.toString() === resourceKey) {
        scheduleDocumentContentPost();
      }
    });

    const messageListener = panel.webview.onDidReceiveMessage(message => {
      if (message.type === 'ready') {
        if (pendingContentPost !== undefined) {
          clearTimeout(pendingContentPost);
          pendingContentPost = undefined;
        }
        postDocumentContent(true);
      } else if (message.type === 'edit' && typeof message.content === 'string') {
        return enqueueWebviewMessage(() => applyContentFromWebview(message.content));
      } else if (message.type === 'save') {
        return enqueueWebviewMessage(() => saveDocument(typeof message.content === 'string' ? message.content : undefined));
      }
      return undefined;
    });

    panel.onDidDispose(() => {
      if (pendingContentPost !== undefined) {
        clearTimeout(pendingContentPost);
      }
      this.panels.delete(panel);
      changeListener.dispose();
      messageListener.dispose();
    });
  }
}
