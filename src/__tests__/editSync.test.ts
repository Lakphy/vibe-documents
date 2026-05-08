import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarkdownPreviewProvider } from '../previewProvider';
import * as vscode from 'vscode';

function createMockContext(): vscode.ExtensionContext {
  return {
    extensionPath: '/mock/extension',
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

describe('编辑同步（双向通信）', () => {
  let provider: MarkdownPreviewProvider;
  let ctx: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
    provider = new MarkdownPreviewProvider(ctx);
  });

  describe('webview → extension 写回', () => {
    it('面板创建时注册 onDidReceiveMessage', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      expect(panel.webview.onDidReceiveMessage).toHaveBeenCalled();
    });

    it('edit 消息触发 workspace.applyEdit（通过 onDidReceiveMessage 回调）', async () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];
      expect(messageHandler).toBeDefined();
    });
  });

  describe('toggleMode 功能', () => {
    it('toggleMode 向活动面板发送 toggleMode 消息', () => {
      const uri = vscode.Uri.file('/test/file.md');
      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      panel.active = true;

      provider.toggleMode();

      expect(panel.webview.postMessage).toHaveBeenCalledWith({ type: 'toggleMode' });
    });

    it('无活动面板时 toggleMode 不抛异常', () => {
      expect(() => provider.toggleMode()).not.toThrow();
    });
  });

  describe('防循环策略', () => {
    it('收到 ready 消息后推送内容到 webview', async () => {
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
    });
  });

  describe('增量 diff 编辑', () => {
    it('edit 消息调用 workspace.applyEdit 而非全量替换', async () => {
      const uri = vscode.Uri.file('/test/file.md');
      const currentText = '# Hello World';
      const newText = '# Hello Vibe World';

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: () => currentText,
        uri,
        positionAt: (offset: number) => new vscode.Position(0, offset),
      } as any);

      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];

      await messageHandler({ type: 'edit', content: newText });

      expect(vscode.workspace.applyEdit).toHaveBeenCalled();
      const editArg = vi.mocked(vscode.workspace.applyEdit).mock.calls[0][0] as vscode.WorkspaceEdit;
      const edits = (editArg as any).getEdits();
      expect(edits.length).toBeGreaterThan(0);
      const hasInsert = edits.some((e: any) => e.type === 'insert');
      expect(hasInsert).toBe(true);
    });

    it('内容相同时不调用 applyEdit', async () => {
      const uri = vscode.Uri.file('/test/file.md');
      const content = '# Same Content';

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: () => content,
        uri,
        positionAt: (offset: number) => new vscode.Position(0, offset),
      } as any);

      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];

      await messageHandler({ type: 'edit', content });

      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    });

    it('删除文本时产生 delete 类型的 edit', async () => {
      const uri = vscode.Uri.file('/test/file.md');
      const currentText = '# Hello World';
      const newText = '# Hello';

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: () => currentText,
        uri,
        positionAt: (offset: number) => new vscode.Position(0, offset),
      } as any);

      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];

      await messageHandler({ type: 'edit', content: newText });

      const editArg = vi.mocked(vscode.workspace.applyEdit).mock.calls[0][0] as vscode.WorkspaceEdit;
      const edits = (editArg as any).getEdits();
      const hasDelete = edits.some((e: any) => e.type === 'delete');
      expect(hasDelete).toBe(true);
    });

    it('edit 消息触发 applyEdit 使用增量 diff', async () => {
      const uri = vscode.Uri.file('/test/file.md');

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: () => '# Original',
        uri,
        positionAt: (offset: number) => new vscode.Position(0, offset),
      } as any);

      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];

      await messageHandler({ type: 'edit', content: '# Modified' });

      expect(vscode.workspace.applyEdit).toHaveBeenCalled();
      const editArg = vi.mocked(vscode.workspace.applyEdit).mock.calls[0][0] as any;
      const edits = editArg.getEdits();
      expect(edits.length).toBeGreaterThan(0);
    });

    it('edit 内容与当前文档相同时不调用 applyEdit', async () => {
      const uri = vscode.Uri.file('/test/file.md');
      const content = '# Same';

      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
        getText: () => content,
        uri,
        positionAt: (offset: number) => new vscode.Position(0, offset),
      } as any);

      provider.showPreview(uri, vscode.ViewColumn.Active);

      const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0].value;
      const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0]?.[0];

      await messageHandler({ type: 'edit', content });

      expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    });
  });
});
