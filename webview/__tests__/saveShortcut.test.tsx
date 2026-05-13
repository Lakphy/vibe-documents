import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSaveContentProvider, useSaveShortcut } from '../saveShortcut';

const vscodeApi = {
  postMessage: vi.fn(),
  getState: vi.fn(),
  setState: vi.fn(),
};

function dispatchSaveShortcut(options: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean } = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 's',
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

describe('useSaveShortcut', () => {
  beforeEach(() => {
    vscodeApi.postMessage.mockClear();
    (globalThis as any).acquireVsCodeApi = vi.fn(() => vscodeApi);
  });

  afterEach(() => {
    delete (globalThis as any).acquireVsCodeApi;
  });

  it('Cmd+S 发送 save 消息并阻止浏览器默认保存', () => {
    renderHook(() => useSaveShortcut());

    const event = dispatchSaveShortcut({ metaKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(vscodeApi.postMessage).toHaveBeenCalledWith({ type: 'save' });
  });

  it('Ctrl+S 同样发送 save 消息', () => {
    renderHook(() => useSaveShortcut());

    dispatchSaveShortcut({ ctrlKey: true });

    expect(vscodeApi.postMessage).toHaveBeenCalledWith({ type: 'save' });
  });

  it('保存时附带最新注册的编辑内容', () => {
    renderHook(() => {
      useSaveShortcut();
      useSaveContentProvider(() => '# Draft');
    });

    dispatchSaveShortcut({ metaKey: true });

    expect(vscodeApi.postMessage).toHaveBeenCalledWith({ type: 'save', content: '# Draft' });
  });

  it('Shift+Cmd+S 不被拦截，保留 Save As 等系统语义', () => {
    renderHook(() => useSaveShortcut());

    const event = dispatchSaveShortcut({ metaKey: true, shiftKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(vscodeApi.postMessage).not.toHaveBeenCalled();
  });
});
