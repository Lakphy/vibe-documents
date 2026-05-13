import { describe, it, expect, vi, beforeEach } from 'vitest';

let subscribe: typeof import('../messageBus').subscribe;

describe('messageBus', () => {
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../messageBus');
    subscribe = mod.subscribe;
  });

  it('订阅后收到对应类型的消息', () => {
    const handler = vi.fn();
    subscribe('update', handler);

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'update', content: 'hello' },
    }));

    expect(handler).toHaveBeenCalledWith({ type: 'update', content: 'hello' });
  });

  it('不同类型的消息不会触发无关订阅', () => {
    const handler = vi.fn();
    subscribe('update', handler);

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'toggleMode' },
    }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('同一类型可以有多个订阅者', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    subscribe('update', h1);
    subscribe('update', h2);

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'update', content: 'x' },
    }));

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('取消订阅后不再接收消息', () => {
    const handler = vi.fn();
    const unsub = subscribe('update', handler);

    unsub();

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'update', content: 'x' },
    }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('忽略 data 为 null 的消息', () => {
    const handler = vi.fn();
    subscribe('update', handler);

    window.dispatchEvent(new MessageEvent('message', { data: null }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('忽略 type 不是字符串的消息', () => {
    const handler = vi.fn();
    subscribe('update', handler);

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 123 },
    }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('只注册一个全局 window message 监听器', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');

    subscribe('a', vi.fn());
    subscribe('b', vi.fn());
    subscribe('c', vi.fn());

    const messageCalls = addSpy.mock.calls.filter(c => c[0] === 'message');
    expect(messageCalls.length).toBe(1);

    addSpy.mockRestore();
  });

  it('只取消其中一个订阅者时，其它订阅者仍可继续接收', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const unsub1 = subscribe('update', h1);
    subscribe('update', h2);

    unsub1();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'update', content: 'x' },
    }));

    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledTimes(1);
  });
});
