import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { useSearch } from '../search/useSearch';

function buildContainer(html: string, mode: 'preview' | 'wysiwyg' = 'preview') {
  const root = document.createElement('div');
  const inner = document.createElement('div');
  inner.className = mode === 'preview' ? 'markdown-section' : 'ProseMirror';
  inner.innerHTML = html;
  root.appendChild(inner);
  document.body.appendChild(root);
  return root;
}

describe('useSearch - navigation & toggles', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('findNext 在多个匹配间循环', () => {
    const container = buildContainer('<p>x x x</p>');
    const ref = { current: container } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() => useSearch('preview', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.setQuery('x'));
    expect(result.current.state.matchCount).toBe(3);
    expect(result.current.state.currentIndex).toBe(0);

    act(() => result.current.actions.findNext());
    expect(result.current.state.currentIndex).toBe(1);
    act(() => result.current.actions.findNext());
    expect(result.current.state.currentIndex).toBe(2);
    act(() => result.current.actions.findNext());
    expect(result.current.state.currentIndex).toBe(0);
  });

  it('findPrev 在末尾循环到尾部', () => {
    const container = buildContainer('<p>y y y</p>');
    const ref = { current: container } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() => useSearch('preview', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.setQuery('y'));
    act(() => result.current.actions.findPrev());
    expect(result.current.state.currentIndex).toBe(2);
  });

  it('toggleCaseSensitive 在已有 query 时重新执行搜索', () => {
    const container = buildContainer('<p>Foo foo FOO</p>');
    const ref = { current: container } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() => useSearch('preview', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.setQuery('foo'));
    expect(result.current.state.matchCount).toBe(3);

    act(() => result.current.actions.toggleCaseSensitive());
    expect(result.current.state.caseSensitive).toBe(true);
    expect(result.current.state.matchCount).toBe(1);
  });

  it('toggleWholeWord 重新执行搜索', () => {
    const container = buildContainer('<p>foobar foo bar</p>');
    const ref = { current: container } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() => useSearch('preview', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.setQuery('foo'));
    expect(result.current.state.matchCount).toBe(2);

    act(() => result.current.actions.toggleWholeWord());
    expect(result.current.state.matchCount).toBe(1);
  });

  it('toggleRegex 切换正则模式', () => {
    const container = buildContainer('<p>cat bat hat</p>');
    const ref = { current: container } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() => useSearch('preview', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.toggleRegex());
    act(() => result.current.actions.setQuery('[cb]at'));
    expect(result.current.state.matchCount).toBe(2);
  });

  it('wysiwyg 模式从 .ProseMirror 容器搜索', () => {
    const container = buildContainer('<p>edit edit</p>', 'wysiwyg');
    const ref = { current: container } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() => useSearch('wysiwyg', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.setQuery('edit'));
    expect(result.current.state.matchCount).toBe(2);
  });

  it('容器 ref 为空时安全降级', () => {
    const ref = createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement | null>;
    const { result } = renderHook(() => useSearch('preview', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.setQuery('x'));
    expect(result.current.state.matchCount).toBe(0);
    expect(result.current.state.currentIndex).toBe(-1);
  });

  it('查询无结果时 currentIndex 为 -1', () => {
    const container = buildContainer('<p>hello</p>');
    const ref = { current: container } as React.RefObject<HTMLDivElement>;
    const { result } = renderHook(() => useSearch('preview', ref));

    act(() => result.current.actions.open());
    act(() => result.current.actions.setQuery('zzz'));
    expect(result.current.state.matchCount).toBe(0);
    expect(result.current.state.currentIndex).toBe(-1);
  });
});
