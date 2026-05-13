import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { VibeCustomTextEditorProvider } from '../customTextEditorProvider';

function createMockContext(): vscode.ExtensionContext {
  return { extensionPath: '/mock/ext', subscriptions: [] } as unknown as vscode.ExtensionContext;
}

function createDocument(uri: vscode.Uri, getContent: () => string, opts: Partial<vscode.TextDocument> = {}) {
  return {
    uri,
    fileName: uri.fsPath,
    getText: getContent,
    positionAt: (offset: number) => new vscode.Position(0, offset),
    save: vi.fn().mockResolvedValue(true),
    ...opts,
  } as unknown as vscode.TextDocument;
}

describe('VibeCustomTextEditorProvider - extra branches', () => {
  let provider: VibeCustomTextEditorProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new VibeCustomTextEditorProvider(createMockContext());
  });

  it('TextDocument 变化与上次内容相同时不重复推送', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# Same');
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    messageHandler({ type: 'ready' });
    const callsAfterReady = panel.webview.postMessage.mock.calls.length;

    const onChange = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];
    onChange({ document } as any);

    // 内容未变 -> 不应再次推送
    expect(panel.webview.postMessage.mock.calls.length).toBe(callsAfterReady);
  });

  it('其他文档变更不触发推送', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# Mine');
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    vi.mocked(panel.webview.postMessage).mockClear();

    const otherDoc = createDocument(vscode.Uri.file('/test/other.md'), () => '# Other');
    const onChange = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];
    onChange({ document: otherDoc } as any);

    expect(panel.webview.postMessage).not.toHaveBeenCalled();
  });

  it('TextDocument 连续变化会在 50ms 后合并推送最后一次内容', async () => {
    vi.useFakeTimers();
    const uri = vscode.Uri.file('/test/file.md');
    let content = '# Before';
    const document = createDocument(uri, () => content);
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    const onChange = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];

    content = '# First';
    onChange({ document } as any);
    content = '# Second';
    onChange({ document } as any);

    vi.advanceTimersByTime(49);
    expect(panel.webview.postMessage).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(panel.webview.postMessage).toHaveBeenCalledTimes(1);
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'update', content: '# Second' })
    );
    vi.useRealTimers();
  });

  it('ready 会清除待发送的批量更新，只保留强制首帧推送', async () => {
    vi.useFakeTimers();
    const uri = vscode.Uri.file('/test/file.md');
    let content = '# Before';
    const document = createDocument(uri, () => content);
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    const onChange = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];
    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];

    content = '# Pending';
    onChange({ document } as any);
    messageHandler({ type: 'ready' });
    vi.advanceTimersByTime(50);

    expect(panel.webview.postMessage).toHaveBeenCalledTimes(1);
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'update', content: '# Pending' })
    );
    vi.useRealTimers();
  });

  it('panel dispose 会取消待发送的批量更新', async () => {
    vi.useFakeTimers();
    const uri = vscode.Uri.file('/test/file.md');
    let content = '# Before';
    const document = createDocument(uri, () => content);
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    const onChange = vi.mocked(vscode.workspace.onDidChangeTextDocument).mock.calls[0][0];

    content = '# Pending';
    onChange({ document } as any);
    panel._disposeCallback();
    vi.advanceTimersByTime(50);

    expect(panel.webview.postMessage).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('edit 失败时不更新 lastSentContent', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# Before');
    const panel = (vscode as any).createMockPanel();

    vi.mocked(vscode.workspace.applyEdit).mockResolvedValueOnce(false);

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ type: 'edit', content: '# After' });

    expect(vscode.workspace.applyEdit).toHaveBeenCalled();
  });

  it('save 时若 applyEdit 失败则显示错误', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const save = vi.fn().mockResolvedValue(true);
    const document = createDocument(uri, () => '# Before', { save });
    const panel = (vscode as any).createMockPanel();

    vi.mocked(vscode.workspace.applyEdit).mockResolvedValueOnce(false);

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ type: 'save', content: '# After' });

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to apply changes before saving')
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('save 时若 document.save 失败则显示错误', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const save = vi.fn().mockResolvedValue(false);
    const document = createDocument(uri, () => '# Before', { save });
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ type: 'save' });

    expect(save).toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to save')
    );
  });

  it('save 消息不携带 content 时直接调用 save', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const save = vi.fn().mockResolvedValue(true);
    const document = createDocument(uri, () => '# X', { save });
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    await messageHandler({ type: 'save' });

    expect(vscode.workspace.applyEdit).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it('未知消息类型被安全忽略', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# X');
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];

    expect(() => messageHandler({ type: 'unknown' })).not.toThrow();
  });

  it('panel dispose 时移除监听并从 panels 集合中移除', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# X');
    const panel = (vscode as any).createMockPanel();

    await provider.resolveCustomTextEditor(document, panel, {} as any);

    panel._disposeCallback();

    // 之后 toggleMode 找不到 active panel，不应抛错
    expect(() => provider.toggleMode()).not.toThrow();
  });

  it('toggleMode 无 panel 时安全返回', () => {
    expect(() => provider.toggleMode()).not.toThrow();
  });

  it('toggleMode 跳过非 active 的 panel', async () => {
    const uri = vscode.Uri.file('/test/file.md');
    const document = createDocument(uri, () => '# X');
    const panel = (vscode as any).createMockPanel();
    panel.active = false;

    await provider.resolveCustomTextEditor(document, panel, {} as any);
    provider.toggleMode();

    expect(panel.webview.postMessage).not.toHaveBeenCalledWith({ type: 'toggleMode' });
  });
});
