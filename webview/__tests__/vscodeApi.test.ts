import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('getVsCodeApi', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).acquireVsCodeApi;
  });

  it('未声明 acquireVsCodeApi 时返回 undefined', async () => {
    const { getVsCodeApi } = await import('../vscodeApi');
    expect(getVsCodeApi()).toBeUndefined();
  });

  it('存在 acquireVsCodeApi 时调用一次并缓存', async () => {
    const api = { postMessage: vi.fn(), getState: vi.fn(), setState: vi.fn() };
    const factory = vi.fn(() => api);
    (globalThis as any).acquireVsCodeApi = factory;

    const { getVsCodeApi } = await import('../vscodeApi');

    const first = getVsCodeApi();
    const second = getVsCodeApi();

    expect(first).toBe(api);
    expect(second).toBe(api);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
