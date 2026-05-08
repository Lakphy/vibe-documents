import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { SearchWidget } from '../search/SearchWidget';
import type { SearchState, SearchActions } from '../search/useSearch';
import type { EditorMode } from '../Toolbar';

function makeState(overrides: Partial<SearchState> = {}): SearchState {
  return {
    isOpen: true,
    query: '',
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    matchCount: 0,
    currentIndex: -1,
    replaceText: '',
    ...overrides,
  };
}

function makeActions(overrides: Partial<SearchActions> = {}): SearchActions {
  return {
    open: vi.fn(),
    close: vi.fn(),
    setQuery: vi.fn(),
    toggleCaseSensitive: vi.fn(),
    toggleWholeWord: vi.fn(),
    toggleRegex: vi.fn(),
    findNext: vi.fn(),
    findPrev: vi.fn(),
    setReplaceText: vi.fn(),
    replaceCurrent: vi.fn(),
    replaceAll: vi.fn(),
    ...overrides,
  };
}

function renderWidget(
  stateOverrides: Partial<SearchState> = {},
  actionsOverrides: Partial<SearchActions> = {},
  mode: EditorMode = 'preview',
) {
  const state = makeState(stateOverrides);
  const actions = makeActions(actionsOverrides);
  const ref = createRef<HTMLInputElement>();
  return { ...render(<SearchWidget state={state} actions={actions} mode={mode} searchInputRef={ref} />), actions, state };
}

describe('SearchWidget', () => {
  it('isOpen 为 false 时不渲染任何内容', () => {
    const { container } = renderWidget({ isOpen: false });
    expect(container.innerHTML).toBe('');
  });

  it('isOpen 为 true 时渲染搜索输入框', () => {
    renderWidget({ isOpen: true });
    expect(screen.getByPlaceholderText('搜索')).toBeInTheDocument();
  });

  it('搜索输入框显示当前 query', () => {
    renderWidget({ isOpen: true, query: 'hello' });
    expect(screen.getByPlaceholderText('搜索')).toHaveValue('hello');
  });

  it('输入时调用 setQuery', () => {
    const setQuery = vi.fn();
    renderWidget({ isOpen: true }, { setQuery });
    fireEvent.change(screen.getByPlaceholderText('搜索'), { target: { value: 'test' } });
    expect(setQuery).toHaveBeenCalledWith('test');
  });

  it('显示匹配计数', () => {
    renderWidget({ isOpen: true, query: 'x', matchCount: 5, currentIndex: 2 });
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('无匹配时显示"无结果"', () => {
    renderWidget({ isOpen: true, query: 'x', matchCount: 0 });
    expect(screen.getByText('无结果')).toBeInTheDocument();
  });

  it('空查询时不显示匹配计数', () => {
    const { container } = renderWidget({ isOpen: true, query: '' });
    expect(container.querySelector('.vd-search-count')?.textContent).toBe('');
  });

  it('Enter 调用 findNext', () => {
    const findNext = vi.fn();
    renderWidget({ isOpen: true }, { findNext });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索'), { key: 'Enter' });
    expect(findNext).toHaveBeenCalledTimes(1);
  });

  it('Shift+Enter 调用 findPrev', () => {
    const findPrev = vi.fn();
    renderWidget({ isOpen: true }, { findPrev });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索'), { key: 'Enter', shiftKey: true });
    expect(findPrev).toHaveBeenCalledTimes(1);
  });

  it('Escape 调用 close', () => {
    const close = vi.fn();
    renderWidget({ isOpen: true }, { close });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索'), { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('关闭按钮调用 close', () => {
    const close = vi.fn();
    renderWidget({ isOpen: true }, { close });
    fireEvent.click(screen.getByTitle('关闭 (Escape)'));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('上一个按钮调用 findPrev', () => {
    const findPrev = vi.fn();
    renderWidget({ isOpen: true, matchCount: 3 }, { findPrev });
    fireEvent.click(screen.getByTitle('上一个匹配 (Shift+Enter)'));
    expect(findPrev).toHaveBeenCalledTimes(1);
  });

  it('下一个按钮调用 findNext', () => {
    const findNext = vi.fn();
    renderWidget({ isOpen: true, matchCount: 3 }, { findNext });
    fireEvent.click(screen.getByTitle('下一个匹配 (Enter)'));
    expect(findNext).toHaveBeenCalledTimes(1);
  });

  it('点击大小写按钮调用 toggleCaseSensitive', () => {
    const toggleCaseSensitive = vi.fn();
    renderWidget({ isOpen: true }, { toggleCaseSensitive });
    fireEvent.click(screen.getByTitle('区分大小写 (Alt+C)'));
    expect(toggleCaseSensitive).toHaveBeenCalledTimes(1);
  });

  it('大小写按钮在 active 时有 active class', () => {
    renderWidget({ isOpen: true, caseSensitive: true });
    const btn = screen.getByTitle('区分大小写 (Alt+C)');
    expect(btn.className).toContain('vd-search-option-btn--active');
  });

  it('preview 模式不显示替换切换按钮', () => {
    renderWidget({ isOpen: true }, {}, 'preview');
    expect(screen.queryByTitle('展开替换')).toBeNull();
  });

  it('source 模式显示替换切换按钮', () => {
    renderWidget({ isOpen: true }, {}, 'source');
    expect(screen.getByTitle('展开替换')).toBeInTheDocument();
  });

  it('wysiwyg 模式不显示替换切换按钮', () => {
    renderWidget({ isOpen: true }, {}, 'wysiwyg');
    expect(screen.queryByTitle('展开替换')).toBeNull();
  });

  it('点击替换切换后显示替换输入框', () => {
    renderWidget({ isOpen: true }, {}, 'source');
    fireEvent.click(screen.getByTitle('展开替换'));
    expect(screen.getByPlaceholderText('替换')).toBeInTheDocument();
  });

  it('Alt+C 调用 toggleCaseSensitive', () => {
    const toggleCaseSensitive = vi.fn();
    renderWidget({ isOpen: true }, { toggleCaseSensitive });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索'), { key: 'c', altKey: true });
    expect(toggleCaseSensitive).toHaveBeenCalledTimes(1);
  });

  it('Alt+W 调用 toggleWholeWord', () => {
    const toggleWholeWord = vi.fn();
    renderWidget({ isOpen: true }, { toggleWholeWord });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索'), { key: 'w', altKey: true });
    expect(toggleWholeWord).toHaveBeenCalledTimes(1);
  });

  it('Alt+R 调用 toggleRegex', () => {
    const toggleRegex = vi.fn();
    renderWidget({ isOpen: true }, { toggleRegex });
    fireEvent.keyDown(screen.getByPlaceholderText('搜索'), { key: 'r', altKey: true });
    expect(toggleRegex).toHaveBeenCalledTimes(1);
  });

  it('导航按钮在 matchCount=0 时被禁用', () => {
    renderWidget({ isOpen: true, matchCount: 0 });
    expect(screen.getByTitle('上一个匹配 (Shift+Enter)')).toBeDisabled();
    expect(screen.getByTitle('下一个匹配 (Enter)')).toBeDisabled();
  });

  it('有 role="search" 属性', () => {
    renderWidget({ isOpen: true });
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
