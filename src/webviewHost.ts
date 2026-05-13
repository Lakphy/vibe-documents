import * as vscode from 'vscode';
import * as path from 'path';
import { buildPreviewHtml, getNonce } from './utils';

export function configureEditorWebview(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  resourceUri: vscode.Uri,
) {
  panel.webview.options = {
    enableScripts: true,
    localResourceRoots: [
      vscode.Uri.file(path.join(context.extensionPath, 'dist')),
      vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview-assets')),
      vscode.Uri.file(path.dirname(resourceUri.fsPath)),
      ...(vscode.workspace.workspaceFolders?.map(folder => folder.uri) ?? []),
    ],
  };

  const webviewAssetsDir = path.join(context.extensionPath, 'dist', 'webview-assets');
  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(webviewAssetsDir, 'webview.js'))
  );
  const cssUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(webviewAssetsDir, 'webview.css'))
  );

  panel.webview.html = buildPreviewHtml({
    cspSource: panel.webview.cspSource,
    nonce: getNonce(),
    scriptUri: scriptUri.toString(),
    cssUri: cssUri.toString(),
  });
}

export function getResourceBaseUri(panel: vscode.WebviewPanel, resourceUri: vscode.Uri) {
  return panel.webview.asWebviewUri(vscode.Uri.file(path.dirname(resourceUri.fsPath))).toString();
}
