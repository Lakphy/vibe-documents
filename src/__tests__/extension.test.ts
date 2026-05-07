import { describe, it, expect, vi, beforeEach } from 'vitest';
import { activate, deactivate } from '../extension';
import * as vscode from 'vscode';

function createMockContext(): vscode.ExtensionContext {
  return {
    extensionPath: '/mock/extension',
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

describe('extension', () => {
  let ctx: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  describe('activate', () => {
    it('注册 showPreview 命令', () => {
      activate(ctx);
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'vibeDocuments.showPreview',
        expect.any(Function)
      );
    });

    it('注册 showPreviewToSide 命令', () => {
      activate(ctx);
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'vibeDocuments.showPreviewToSide',
        expect.any(Function)
      );
    });

    it('将命令添加到 subscriptions', () => {
      activate(ctx);
      expect(ctx.subscriptions.length).toBe(4);
    });

    it('注册 toggleMode 命令', () => {
      activate(ctx);
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'vibeDocuments.toggleMode',
        expect.any(Function)
      );
    });

    it('showPreview 命令无 URI 时使用 activeTextEditor', () => {
      const editorUri = vscode.Uri.file('/active/editor.md');
      vi.mocked(vscode.window).activeTextEditor = {
        document: { uri: editorUri },
      } as any;

      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const showPreviewCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreview');
      const callback = showPreviewCall![1] as (uri?: any) => void;

      callback(undefined);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    });

    it('showPreview 命令接收 URI 参数', () => {
      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const showPreviewCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreview');
      const callback = showPreviewCall![1] as (uri?: any) => void;

      const uri = vscode.Uri.file('/specific/file.md');
      callback(uri);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'vibeDocuments.preview',
        expect.stringContaining('file.md'),
        vscode.ViewColumn.Active,
        expect.any(Object)
      );
    });

    it('showPreviewToSide 使用 ViewColumn.Beside', () => {
      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const sideCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreviewToSide');
      const callback = sideCall![1] as (uri?: any) => void;

      const uri = vscode.Uri.file('/specific/file.md');
      callback(uri);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'vibeDocuments.preview',
        expect.stringContaining('file.md'),
        vscode.ViewColumn.Beside,
        expect.any(Object)
      );
    });

    it('无 URI 且无 activeTextEditor 时不创建面板', () => {
      vi.mocked(vscode.window).activeTextEditor = undefined;
      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const showPreviewCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreview');
      const callback = showPreviewCall![1] as (uri?: any) => void;

      callback(undefined);

      expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('deactivate 不抛出异常', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
