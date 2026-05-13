import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VibeCustomTextEditorProvider } from '../customTextEditorProvider';

function createMockContext(): vscode.ExtensionContext {
  return {
    extensionPath: '/mock/extension',
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
}

function createDocument(uri: vscode.Uri, getContent: () => string): vscode.TextDocument {
  return {
    uri,
    fileName: uri.fsPath,
    getText: getContent,
    positionAt: (offset: number) => new vscode.Position(0, offset),
    save: vi.fn().mockResolvedValue(true),
  } as unknown as vscode.TextDocument;
}

describe('VibeCustomTextEditorProvider', () => {
  let provider: VibeCustomTextEditorProvider;
  let ctx: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
    provider = new VibeCustomTextEditorProvider(ctx);
  });

  it('ready 后向 webview 推送当前 document 内容和文件类型', async () => {
    const uri = vscode.Uri.file('/test/data.csv');
    const document = createDocument(uri, () => 'name,value\nA,1');
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    messageHandler({ type: 'ready' });

    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        content: 'name,value\nA,1',
        fileType: 'csv',
      })
    );
  });

  it('空文件 ready 时也会推送初始化消息', async () => {
    const uri = vscode.Uri.file('/test/empty.csv');
    const document = createDocument(uri, () => '');
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    messageHandler({ type: 'ready' });

    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        content: '',
        fileType: 'csv',
      })
    );
  });

  it('ready 会强制推送当前内容，即使此前变更监听已经发送过相同内容', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    let content = '# Current';
    const document = createDocument(uri, () => content);
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const documentChangeHandler = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];
    documentChangeHandler({ document } as any);
    vi.mocked(panel.webview.postMessage).mockClear();

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    messageHandler({ type: 'ready' });

    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        content,
        fileType: 'markdown',
      })
    );
  });

  it('edit 消息使用传入的 TextDocument 应用编辑，不打开原生文档', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# Before');
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ type: 'edit', content: '# After' });

    expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).toHaveBeenCalled();
    const editArg = vi.mocked(vscode.workspace.applyEdit).mock.calls[0][0] as any;
    expect(editArg.getEdits().length).toBeGreaterThan(0);
  });

  it('save 消息先 flush content 再保存 custom editor document', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const save = vi.fn().mockResolvedValue(true);
    const document = {
      ...createDocument(uri, () => '# Before'),
      save,
    } as unknown as vscode.TextDocument;
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ type: 'save', content: '# After' });

    expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    expect(vscode.workspace.applyEdit).toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it('TextDocument 变化后同步更新 webview', async () => {
    vi.useFakeTimers();
    const uri = vscode.Uri.file('/test/file.md');
    let content = '# Before';
    const document = createDocument(uri, () => content);
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    const documentChangeHandler = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];

    content = '# External Change';
    documentChangeHandler({ document } as any);
    vi.advanceTimersByTime(50);

    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        content: '# External Change',
      })
    );
    vi.useRealTimers();
  });

  it('toggleMode 向当前 active custom editor 发送消息', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# Content');
    const panel = (vscode as any).createMockPanel();
    panel.active = true;

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    provider.toggleMode();

    expect(panel.webview.postMessage).toHaveBeenCalledWith({ type: 'toggleMode' });
  });
});
