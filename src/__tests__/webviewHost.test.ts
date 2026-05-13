import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { configureEditorWebview, getResourceBaseUri } from '../webviewHost';

function makeContext(extensionPath = '/ext'): vscode.ExtensionContext {
  return { extensionPath, subscriptions: [] } as unknown as vscode.ExtensionContext;
}

describe('configureEditorWebview', () => {
  it('配置 enableScripts 与 localResourceRoots', () => {
    const ctx = makeContext('/ext');
    const panel = (vscode as any).createMockPanel();
    const uri = vscode.Uri.file('/workspace/docs/readme.md');

    configureEditorWebview(ctx, panel, uri);

    expect(panel.webview.options.enableScripts).toBe(true);
    const roots = panel.webview.options.localResourceRoots as Array<{ fsPath: string }>;
    const paths = roots.map(r => r.fsPath);
    expect(paths).toContain('/ext/dist');
    expect(paths).toContain('/ext/dist/webview-assets');
    expect(paths).toContain('/workspace/docs');
    // workspaceFolders 从 mock 来
    expect(paths).toContain('/test/workspace');
  });

  it('注入包含脚本/样式 URI 与 CSP 的 HTML', () => {
    const ctx = makeContext('/ext');
    const panel = (vscode as any).createMockPanel();
    const uri = vscode.Uri.file('/workspace/docs/readme.md');

    configureEditorWebview(ctx, panel, uri);

    expect(panel.webview.html).toContain('webview.js');
    expect(panel.webview.html).toContain('webview.css');
    expect(panel.webview.html).toContain('Content-Security-Policy');
    expect(panel.webview.html).toContain('mock-csp-source');
    expect(panel.webview.html).toMatch(/nonce-[A-Za-z0-9]{32}/);
    expect(panel.webview.html).toContain('<div id="root"></div>');
  });

  it('workspaceFolders 为 undefined 时仍能配置', () => {
    const ctx = makeContext('/ext');
    const panel = (vscode as any).createMockPanel();
    const uri = vscode.Uri.file('/abs/file.md');
    const original = (vscode.workspace as any).workspaceFolders;
    (vscode.workspace as any).workspaceFolders = undefined;

    try {
      configureEditorWebview(ctx, panel, uri);
      const roots = panel.webview.options.localResourceRoots as Array<{ fsPath: string }>;
      expect(roots.length).toBe(3);
    } finally {
      (vscode.workspace as any).workspaceFolders = original;
    }
  });
});

describe('getResourceBaseUri', () => {
  it('返回文件目录的 webview URI 字符串', () => {
    const panel = (vscode as any).createMockPanel();
    const uri = vscode.Uri.file('/workspace/docs/readme.md');
    expect(getResourceBaseUri(panel, uri)).toContain('/workspace/docs');
  });
});
