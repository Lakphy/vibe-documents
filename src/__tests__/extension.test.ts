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
      expect(ctx.subscriptions.length).toBe(11);
    });

    it('注册 priority option custom editor provider', () => {
      activate(ctx);
      expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
        'vibeDocuments.markdownEditor',
        expect.any(Object),
        expect.objectContaining({
          webviewOptions: { retainContextWhenHidden: true },
          supportsMultipleEditorsPerDocument: true,
        })
      );
      expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
        'vibeDocuments.csvEditor',
        expect.any(Object),
        expect.any(Object)
      );
      expect(vscode.window.registerCustomEditorProvider).toHaveBeenCalledWith(
        'vibeDocuments.excalidrawEditor',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('注册 toggleMode 命令', () => {
      activate(ctx);
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'vibeDocuments.toggleMode',
        expect.any(Function)
      );
    });

    it('showPreview 命令无 URI 时使用 activeTextEditor 并通过 openWith 打开 custom editor', async () => {
      const editorUri = vscode.Uri.file('/active/editor.md');
      vi.mocked(vscode.window).activeTextEditor = {
        document: { uri: editorUri },
      } as any;

      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const showPreviewCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreview');
      const callback = showPreviewCall![1] as (uri?: any) => void;

      await callback(undefined);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        editorUri,
        'vibeDocuments.markdownEditor',
        { viewColumn: vscode.ViewColumn.Active }
      );
    });

    it('showPreview 命令接收 URI 参数', async () => {
      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const showPreviewCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreview');
      const callback = showPreviewCall![1] as (uri?: any) => void;

      const uri = vscode.Uri.file('/specific/file.md');
      await callback(uri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        uri,
        'vibeDocuments.markdownEditor',
        { viewColumn: vscode.ViewColumn.Active }
      );
    });

    it('showPreviewToSide 使用 ViewColumn.Beside', async () => {
      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const sideCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreviewToSide');
      const callback = sideCall![1] as (uri?: any) => void;

      const uri = vscode.Uri.file('/specific/file.md');
      await callback(uri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        uri,
        'vibeDocuments.markdownEditor',
        { viewColumn: vscode.ViewColumn.Beside }
      );
    });

    it('CSV 和 Excalidraw 命令按扩展名选择对应 custom editor', async () => {
      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const csvCall = registerCalls.find(c => c[0] === 'vibeDocuments.showCsvPreview');
      const excalidrawCall = registerCalls.find(c => c[0] === 'vibeDocuments.showExcalidrawPreview');

      const csvUri = vscode.Uri.file('/specific/data.csv');
      const excalidrawUri = vscode.Uri.file('/specific/diagram.excalidraw');

      await (csvCall![1] as (uri?: any) => void)(csvUri);
      await (excalidrawCall![1] as (uri?: any) => void)(excalidrawUri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        csvUri,
        'vibeDocuments.csvEditor',
        { viewColumn: vscode.ViewColumn.Active }
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        excalidrawUri,
        'vibeDocuments.excalidrawEditor',
        { viewColumn: vscode.ViewColumn.Active }
      );
    });

    it('无 URI 且无 activeTextEditor 时不打开 custom editor', () => {
      vi.mocked(vscode.window).activeTextEditor = undefined;
      activate(ctx);

      const registerCalls = vi.mocked(vscode.commands.registerCommand).mock.calls;
      const showPreviewCall = registerCalls.find(c => c[0] === 'vibeDocuments.showPreview');
      const callback = showPreviewCall![1] as (uri?: any) => void;

      callback(undefined);

      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('deactivate 不抛出异常', () => {
      expect(() => deactivate()).not.toThrow();
    });
  });
});
