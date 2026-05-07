import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVsCodeMessages, useMarkdownComponents } from '../hooks';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('useVsCodeMessages', () => {
  let addListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addListenerSpy = vi.spyOn(window, 'addEventListener');
    removeListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });

  it('初始状态为空', () => {
    const { result } = renderHook(() => useVsCodeMessages());
    expect(result.current.content).toBe('');
    expect(result.current.baseUri).toBe('');
  });

  it('注册 message 事件监听器', () => {
    renderHook(() => useVsCodeMessages());
    expect(addListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('卸载时移除事件监听器', () => {
    const { unmount } = renderHook(() => useVsCodeMessages());
    unmount();
    expect(removeListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('处理 update 消息更新 content', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'update', content: '# Hello', baseUri: 'https://base' },
      }));
    });

    expect(result.current.content).toBe('# Hello');
    expect(result.current.baseUri).toBe('https://base');
  });

  it('忽略非 update 类型的消息', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'other', content: 'should-not-set' },
      }));
    });

    expect(result.current.content).toBe('');
  });

  it('content 为 undefined 时不更新', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'update', content: 'first' },
      }));
    });

    expect(result.current.content).toBe('first');

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'update' },
      }));
    });

    expect(result.current.content).toBe('first');
  });

  it('允许空字符串作为 content', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'update', content: 'initial' },
      }));
    });

    expect(result.current.content).toBe('initial');

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'update', content: '' },
      }));
    });

    expect(result.current.content).toBe('');
  });

  it('不提供 baseUri 时保留旧值', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'update', content: '# A', baseUri: 'https://base1' },
      }));
    });

    expect(result.current.baseUri).toBe('https://base1');

    act(() => {
      const handler = addListenerSpy.mock.calls.find(c => c[0] === 'message')![1] as EventListener;
      handler(new MessageEvent('message', {
        data: { type: 'update', content: '# B' },
      }));
    });

    expect(result.current.baseUri).toBe('https://base1');
  });
});

describe('useMarkdownComponents', () => {
  describe('img 组件', () => {
    it('为相对路径图片添加 baseUri 前缀', () => {
      const { result } = renderHook(() => useMarkdownComponents('https://base'));
      const Img = result.current.img;

      render(<Img src="images/photo.png" alt="test" />);
      const img = screen.getByAltText('test');
      expect(img).toHaveAttribute('src', 'https://base/images/photo.png');
    });

    it('http 图片 URL 不修改', () => {
      const { result } = renderHook(() => useMarkdownComponents('https://base'));
      const Img = result.current.img;

      render(<Img src="https://cdn.example.com/img.jpg" alt="external" />);
      const img = screen.getByAltText('external');
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/img.jpg');
    });

    it('data: URI 不修改', () => {
      const { result } = renderHook(() => useMarkdownComponents('https://base'));
      const Img = result.current.img;
      const dataUri = 'data:image/png;base64,abc123';

      render(<Img src={dataUri} alt="data" />);
      const img = screen.getByAltText('data');
      expect(img).toHaveAttribute('src', dataUri);
    });

    it('设置 loading="lazy"', () => {
      const { result } = renderHook(() => useMarkdownComponents(''));
      const Img = result.current.img;

      render(<Img src="photo.png" alt="lazy" />);
      const img = screen.getByAltText('lazy');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('a 组件', () => {
    it('设置 target="_blank"', () => {
      const { result } = renderHook(() => useMarkdownComponents(''));
      const A = result.current.a;

      render(<A href="https://example.com">Link</A>);
      const link = screen.getByText('Link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('设置 rel="noopener noreferrer"', () => {
      const { result } = renderHook(() => useMarkdownComponents(''));
      const A = result.current.a;

      render(<A href="https://example.com">Link</A>);
      const link = screen.getByText('Link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('添加 markdown-link class', () => {
      const { result } = renderHook(() => useMarkdownComponents(''));
      const A = result.current.a;

      render(<A href="https://example.com">Link</A>);
      const link = screen.getByText('Link');
      expect(link).toHaveClass('markdown-link');
    });
  });

  describe('table 组件', () => {
    it('包裹在 container 和 wrapper 中', () => {
      const { result } = renderHook(() => useMarkdownComponents(''));
      const Table = result.current.table;

      const { container } = render(
        <Table>
          <tbody><tr><td>Cell</td></tr></tbody>
        </Table>
      );

      expect(container.querySelector('.markdown-table-container')).not.toBeNull();
      expect(container.querySelector('.markdown-table-wrapper')).not.toBeNull();
      expect(container.querySelector('.markdown-table')).not.toBeNull();
    });
  });

  describe('记忆化', () => {
    it('相同 baseUri 返回相同引用', () => {
      const { result, rerender } = renderHook(
        ({ baseUri }) => useMarkdownComponents(baseUri),
        { initialProps: { baseUri: 'https://base' } }
      );

      const first = result.current;
      rerender({ baseUri: 'https://base' });
      expect(result.current).toBe(first);
    });

    it('不同 baseUri 返回新引用', () => {
      const { result, rerender } = renderHook(
        ({ baseUri }) => useMarkdownComponents(baseUri),
        { initialProps: { baseUri: 'https://base1' } }
      );

      const first = result.current;
      rerender({ baseUri: 'https://base2' });
      expect(result.current).not.toBe(first);
    });
  });
});
