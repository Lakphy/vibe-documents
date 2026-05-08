import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarkdownPreviewProvider } from '../previewProvider';
import * as vscode from 'vscode';

function createMockContext(): vscode.ExtensionContext {
  return {
    extensionPath: '/mock/extension',
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

describe('MarkdownPreviewProvider', () => {
  let provider: MarkdownPreviewProvider;
  let ctx: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
    provider = new MarkdownPreviewProvider(ctx);
  });

  describe('面板生命周期', () => {
    it('初始状态没有面板', () => {
      expect(provider.getPanelCount()).toBe(0);
    });

    it('showPreview 创建新面板', () => {
      const uri = vscode.Uri.file('/test/readme.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);
      expect(provider.getPanelCount()).toBe(1);
      expect(provider.hasPanel(uri.toString())).toBe(true);
    });

    it('相同 URI 不会创建重复面板', () => {
      const uri = vscode.Uri.file('/test/readme.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);
      provider.showPreview(uri, vscode.ViewColumn.Beside);
      expect(provider.getPanelCount()).toBe(1);
    });

    it('不同 URI 创建不同面板', () => {
      const uri1 = vscode.Uri.file('/test/readme.md');
      const uri2 = vscode.Uri.file('/test/other.md');
      provider.showPreview(uri1, vscode.ViewColumn.Active);
      provider.showPreview(uri2, vscode.ViewColumn.Beside);
      expect(provider.getPanelCount()).toBe(2);
    });

    it('已有面板时调用 reveal', () => {
      const uri = vscode.Uri.file('/test/readme.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      provider.showPreview(uri, vscode.ViewColumn.Beside);

      expect(panel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.Beside);
    });

    it('面板 dispose 后从映射中移除', () => {
      const uri = vscode.Uri.file('/test/readme.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);
      expect(provider.hasPanel(uri.toString())).toBe(true);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      panel._disposeCallback();

      expect(provider.hasPanel(uri.toString())).toBe(false);
      expect(provider.getPanelCount()).toBe(0);
    });
  });

  describe('面板配置', () => {
    it('面板标题包含文件名', () => {
      const uri = vscode.Uri.file('/project/docs/README.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'vibeDocuments.preview',
        'Preview: README.md',
        vscode.ViewColumn.Active,
        expect.any(Object)
      );
    });

    it('面板启用脚本执行', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const options = vi.mocked(vscode.window.createWebviewPanel).mock.calls[0][3];
      expect(options).toMatchObject({
        enableScripts: true,
        retainContextWhenHidden: true,
      });
    });

    it('设置 open-preview 图标', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      expect(panel.iconPath).toBeInstanceOf(vscode.ThemeIcon);
      expect((panel.iconPath as vscode.ThemeIcon).id).toBe('open-preview');
    });
  });

  describe('HTML 生成', () => {
    it('面板 webview 包含有效 HTML', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const html = panel.webview.html;

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<div id="root"></div>');
      expect(html).toContain('Content-Security-Policy');
    });

    it('HTML 中的 JS/CSS URI 通过 asWebviewUri 转换', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      expect(panel.webview.asWebviewUri).toHaveBeenCalled();
    });
  });

  describe('内容推送', () => {
    it('收到 ready 消息后发送内容', async () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      await messageHandler({ type: 'ready' });

      await vi.waitFor(() => {
        expect(panel.webview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'update',
            content: expect.any(String),
            baseUri: expect.any(String),
          })
        );
      });
    });

    it('markdown 文件 postMessage 携带 fileType: markdown', async () => {
      const uri = vscode.Uri.file('/test/readme.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      await messageHandler({ type: 'ready' });

      await vi.waitFor(() => {
        expect(panel.webview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ fileType: 'markdown' })
        );
      });
    });

    it('excalidraw 文件 postMessage 携带 fileType: excalidraw', async () => {
      const uri = vscode.Uri.file('/test/diagram.excalidraw');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      await messageHandler({ type: 'ready' });

      await vi.waitFor(() => {
        expect(panel.webview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ fileType: 'excalidraw' })
        );
      });
    });

    it('csv 文件 postMessage 携带 fileType: csv', async () => {
      const uri = vscode.Uri.file('/test/data.csv');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      await messageHandler({ type: 'ready' });

      await vi.waitFor(() => {
        expect(panel.webview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ fileType: 'csv' })
        );
      });
    });
  });

  describe('文件监听', () => {
    it('创建文件系统监视器', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
    });

    it('注册编辑器文档变更监听', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
    });

    it('将监视器和监听器添加到 subscriptions', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      expect(ctx.subscriptions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('debounce 与内容去重', () => {
    it('文档变更经过 debounce 后才推送', async () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      await messageHandler({ type: 'ready' });

      await vi.waitFor(() => {
        expect(panel.webview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'update' })
        );
      });

      panel.webview.postMessage.mockClear();

      const editorCallback = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0]?.[0];

      let callCount = 0;
      vi.mocked(vscode.workspace.openTextDocument).mockImplementation(async () => ({
        getText: () => `# Change ${++callCount}`,
        uri: vscode.Uri.file('/test/file.md'),
        positionAt: (offset: number) => new vscode.Position(0, offset),
      } as any));

      editorCallback({ document: { uri: { toString: () => uri.toString() } } });
      editorCallback({ document: { uri: { toString: () => uri.toString() } } });
      editorCallback({ document: { uri: { toString: () => uri.toString() } } });

      await vi.waitFor(() => {
        expect(panel.webview.postMessage).toHaveBeenCalled();
      }, { timeout: 500 });

      expect(panel.webview.postMessage).toHaveBeenCalledTimes(1);
    });

    it('相同内容不重复推送', async () => {
      const fixedContent = '# Fixed Content';
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: () => fixedContent,
        uri: vscode.Uri.file('/test/file.md'),
        positionAt: (offset: number) => new vscode.Position(0, offset),
      } as any);

      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      await messageHandler({ type: 'ready' });

      await vi.waitFor(() => {
        expect(panel.webview.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'update', content: fixedContent })
        );
      });

      panel.webview.postMessage.mockClear();

      const editorCallback = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0]?.[0];

      editorCallback({ document: { uri: { toString: () => uri.toString() } } });

      await new Promise(r => setTimeout(r, 300));

      expect(panel.webview.postMessage).not.toHaveBeenCalled();
    });

    it('dispose 面板后 debounce/maxWait timer 均被清理，不再触发 postMessage', async () => {
      vi.useFakeTimers();

      try {
        let callCount = 0;
        vi.mocked(vscode.workspace.openTextDocument).mockImplementation(async () => ({
          getText: () => `# Dispose Test ${++callCount}`,
          uri: vscode.Uri.file('/test/file.md'),
          positionAt: (offset: number) => new vscode.Position(0, offset),
        } as any));

        const uri = vscode.Uri.file('/test/file.md');
        provider.showPreview(uri, vscode.ViewColumn.Active);

        const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
        panel.webview.postMessage.mockClear();

        const editorCallback = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0]?.[0];
        editorCallback({ document: { uri: { toString: () => uri.toString() } } });

        panel._disposeCallback();

        await vi.advanceTimersByTimeAsync(2000);

        expect(panel.webview.postMessage).not.toHaveBeenCalled();
        expect(provider.hasPanel(uri.toString())).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
