import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useCopyPaste } from '../csv/useCopyPaste';
import type { CsvAction, CsvState } from '../csv/types';

function makeState(overrides: Partial<CsvState> = {}): CsvState {
  return {
    headers: ['a', 'b', 'c'],
    rows: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ],
    columnWidths: {},
    selection: { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } },
    editingCell: null,
    sort: { columnIndex: -1, direction: null },
    search: { query: '', replaceText: '', matches: [], currentMatchIndex: -1, showReplace: false },
    contextMenu: { visible: false, x: 0, y: 0, targetCell: null },
    ...overrides,
  };
}

function dispatchOn(el: Element, eventType: 'copy' | 'paste' | 'cut', data: string = '') {
  const clipboardData = {
    _store: { 'text/plain': data },
    getData(type: string) {
      return (this._store as any)[type] ?? '';
    },
    setData(type: string, value: string) {
      (this._store as any)[type] = value;
    },
  };

  const event = new Event(eventType, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: clipboardData });
  el.dispatchEvent(event);
  return { event, clipboardData };
}

function renderWithContainer(state: CsvState, sortedRows = state.rows, sortedToSourceMap = state.rows.map((_, i) => i)) {
  const dispatch = vi.fn<(action: CsvAction) => void>();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const containerRef = { current: container };

  renderHook(() =>
    useCopyPaste({
      state,
      sortedRows,
      sortedToSourceMap,
      dispatch,
      containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    })
  );

  return { dispatch, container };
}

describe('useCopyPaste', () => {
  it('copy 将选中区域写入剪贴板 (TSV)', () => {
    const { container } = renderWithContainer(makeState());
    const { event, clipboardData } = dispatchOn(container, 'copy');
    expect(event.defaultPrevented).toBe(true);
    expect(clipboardData.getData('text/plain')).toBe('1\t2\n4\t5');
  });

  it('selection 为 null 时 copy 跳过', () => {
    const { container } = renderWithContainer(makeState({ selection: null }));
    const { event, clipboardData } = dispatchOn(container, 'copy');
    expect(event.defaultPrevented).toBe(false);
    expect(clipboardData.getData('text/plain')).toBe('');
  });

  it('焦点在 INPUT/TEXTAREA 时 copy 不拦截', () => {
    const { container } = renderWithContainer(makeState());
    const input = document.createElement('input');
    container.appendChild(input);

    const clipboardData = {
      _store: {} as Record<string, string>,
      getData(t: string) { return this._store[t] ?? ''; },
      setData(t: string, v: string) { this._store[t] = v; },
    };
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(clipboardData.getData('text/plain')).toBe('');
  });

  it('paste 派发 PASTE_CELLS', () => {
    const { container, dispatch } = renderWithContainer(makeState());
    dispatchOn(container, 'paste', 'X\tY\nZ\tW');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'PASTE_CELLS',
      startRow: 0,
      startCol: 0,
      data: [['X', 'Y'], ['Z', 'W']],
    });
  });

  it('paste 没有 selection 时跳过', () => {
    const { container, dispatch } = renderWithContainer(makeState({ selection: null }));
    dispatchOn(container, 'paste', 'X\tY');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('paste 空文本时不派发', () => {
    const { container, dispatch } = renderWithContainer(makeState());
    dispatchOn(container, 'paste', '');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('cut 既复制又清空所选单元格', () => {
    const { container, dispatch } = renderWithContainer(makeState());
    const { clipboardData } = dispatchOn(container, 'cut');
    expect(clipboardData.getData('text/plain')).toBe('1\t2\n4\t5');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CELL', row: 0, col: 0, value: '' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CELL', row: 0, col: 1, value: '' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CELL', row: 1, col: 0, value: '' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CELL', row: 1, col: 1, value: '' });
  });

  it('paste 使用 sortedToSourceMap 解析目标源行', () => {
    const state = makeState({ selection: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } });
    const sortedToSourceMap = [2, 0, 1];
    const { container, dispatch } = renderWithContainer(state, state.rows, sortedToSourceMap);
    dispatchOn(container, 'paste', 'A');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'PASTE_CELLS',
      startRow: 2,
      startCol: 0,
      data: [['A']],
    });
  });
});
