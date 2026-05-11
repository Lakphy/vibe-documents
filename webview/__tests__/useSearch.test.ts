import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { useSearch } from '../search/useSearch';
import type { EditorMode } from '../Toolbar';

function renderSearchHook(mode: EditorMode = 'preview') {
  const containerRef = createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement | null>;
  return renderHook(
    ({ mode: m }) => useSearch(m, containerRef),
    { initialProps: { mode } }
  );
}

describe('useSearch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('初始状态', () => {
    it('isOpen 初始为 false', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.isOpen).toBe(false);
    });

    it('query 初始为空', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.query).toBe('');
    });

    it('搜索选项初始为 false', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.caseSensitive).toBe(false);
      expect(result.current.state.wholeWord).toBe(false);
      expect(result.current.state.useRegex).toBe(false);
    });

    it('matchCount 初始为 0', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.matchCount).toBe(0);
    });

    it('currentIndex 初始为 -1', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.currentIndex).toBe(-1);
    });

    it('提供 searchInputRef', () => {
      const { result } = renderSearchHook();
      expect(result.current.searchInputRef).toBeDefined();
    });
  });

  describe('open / close', () => {
    it('open 将 isOpen 设为 true', () => {
      const { result } = renderSearchHook();
      act(() => result.current.actions.open());
      expect(result.current.state.isOpen).toBe(true);
    });

    it('close 将 isOpen 设为 false 并重置匹配', () => {
      const { result } = renderSearchHook();
      act(() => result.current.actions.open());
      expect(result.current.state.isOpen).toBe(true);

      act(() => result.current.actions.close());
      expect(result.current.state.isOpen).toBe(false);
      expect(result.current.state.matchCount).toBe(0);
      expect(result.current.state.currentIndex).toBe(-1);
    });
  });

  describe('setQuery', () => {
    it('更新 query 状态', () => {
      const { result } = renderSearchHook();
      act(() => result.current.actions.open());
      act(() => result.current.actions.setQuery('test'));
      expect(result.current.state.query).toBe('test');
    });
  });

  describe('toggle 选项', () => {
    it('toggleCaseSensitive 切换 caseSensitive', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.caseSensitive).toBe(false);
      act(() => result.current.actions.toggleCaseSensitive());
      expect(result.current.state.caseSensitive).toBe(true);
      act(() => result.current.actions.toggleCaseSensitive());
      expect(result.current.state.caseSensitive).toBe(false);
    });

    it('toggleWholeWord 切换 wholeWord', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.wholeWord).toBe(false);
      act(() => result.current.actions.toggleWholeWord());
      expect(result.current.state.wholeWord).toBe(true);
    });

    it('toggleRegex 切换 useRegex', () => {
      const { result } = renderSearchHook();
      expect(result.current.state.useRegex).toBe(false);
      act(() => result.current.actions.toggleRegex());
      expect(result.current.state.useRegex).toBe(true);
    });
  });

  describe('DOM 搜索（preview 模式）', () => {
    it('在 DOM 容器中搜索并更新 matchCount', () => {
      const container = document.createElement('div');
      const p = document.createElement('p');
      p.textContent = 'hello world hello';
      p.className = 'markdown-section';
      container.appendChild(p);
      document.body.appendChild(container);

      const containerRef = { current: container } as React.RefObject<HTMLDivElement>;

      const { result } = renderHook(() => useSearch('preview', containerRef));

      act(() => result.current.actions.open());
      act(() => result.current.actions.setQuery('hello'));

      expect(result.current.state.matchCount).toBe(2);
      expect(result.current.state.currentIndex).toBe(0);
    });
  });

  describe('findNext / findPrev（DOM 模式）', () => {
    it('findNext 不在无匹配时报错', () => {
      const { result } = renderSearchHook();
      act(() => result.current.actions.open());
      expect(() => {
        act(() => result.current.actions.findNext());
      }).not.toThrow();
    });

    it('findPrev 不在无匹配时报错', () => {
      const { result } = renderSearchHook();
      act(() => result.current.actions.open());
      expect(() => {
        act(() => result.current.actions.findPrev());
      }).not.toThrow();
    });
  });

});
