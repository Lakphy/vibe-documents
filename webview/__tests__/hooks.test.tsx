import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVsCodeMessages, useMarkdownComponents } from '../hooks';
import { render, screen } from '@testing-library/react';
import React from 'react';

function dispatchUpdate(data: Record<string, unknown>) {
  window.dispatchEvent(new MessageEvent('message', {
    data: { type: 'update', ...data },
  }));
}

describe('useVsCodeMessages', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('初始状态为空', () => {
    const { result } = renderHook(() => useVsCodeMessages());
    expect(result.current.content).toBe('');
    expect(result.current.baseUri).toBe('');
    expect(result.current.fileType).toBe('markdown');
    expect(result.current.hasReceivedUpdate).toBe(false);
  });

  it('处理 update 消息更新 content 和 baseUri', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      dispatchUpdate({ content: '# Hello', baseUri: 'https://base' });
    });

    expect(result.current.content).toBe('# Hello');
    expect(result.current.baseUri).toBe('https://base');
    expect(result.current.hasReceivedUpdate).toBe(true);
  });

  it('处理 update 消息更新 fileType', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      dispatchUpdate({ content: '{}', fileType: 'excalidraw' });
    });

    expect(result.current.fileType).toBe('excalidraw');
  });

  it('通过 messageBus 只接收 update 类型（非 update 不触发）', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'toggleMode', content: 'should-not-set' },
      }));
    });

    expect(result.current.content).toBe('');
  });

  it('content 为 undefined 时不更新', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      dispatchUpdate({ content: 'first' });
    });
    expect(result.current.content).toBe('first');

    act(() => {
      dispatchUpdate({});
    });
    expect(result.current.content).toBe('first');
  });

  it('允许空字符串作为 content', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      dispatchUpdate({ content: 'initial' });
    });
    expect(result.current.content).toBe('initial');

    act(() => {
      dispatchUpdate({ content: '' });
    });
    expect(result.current.content).toBe('');
  });

  it('不提供 baseUri 时保留旧值', () => {
    const { result } = renderHook(() => useVsCodeMessages());

    act(() => {
      dispatchUpdate({ content: '# A', baseUri: 'https://base1' });
    });
    expect(result.current.baseUri).toBe('https://base1');

    act(() => {
      dispatchUpdate({ content: '# B' });
    });
    expect(result.current.baseUri).toBe('https://base1');
  });

  it('卸载后 messageBus 取消订阅', () => {
    const { result, unmount } = renderHook(() => useVsCodeMessages());

    act(() => {
      dispatchUpdate({ content: 'before unmount' });
    });
    expect(result.current.content).toBe('before unmount');

    unmount();

    // 不应报错，但因 unmount 后 result 不再更新，这里只检查不抛异常
    expect(() => {
      dispatchUpdate({ content: 'after unmount' });
    }).not.toThrow();
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
