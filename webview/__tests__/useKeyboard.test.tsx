import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboard } from '../csv/useKeyboard';
import type { CsvAction, CsvState, Selection } from '../csv/types';

function makeState(overrides: Partial<CsvState> = {}): CsvState {
  return {
    headers: ['a', 'b', 'c'],
    rows: [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ],
    columnWidths: {},
    selection: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    editingCell: null,
    sort: { columnIndex: -1, direction: null },
    search: { query: '', replaceText: '', matches: [], currentMatchIndex: -1, showReplace: false },
    contextMenu: { visible: false, x: 0, y: 0, targetCell: null },
    ...overrides,
  };
}

function setup(state: CsvState, sortedToSourceMap: number[] = [0, 1]) {
  const dispatch = vi.fn<(action: CsvAction) => void>();
  const moveSelection = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const containerRef = { current: container };

  renderHook(() =>
    useKeyboard({
      state,
      sortedToSourceMap,
      dispatch,
      moveSelection,
      containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    })
  );

  return { dispatch, moveSelection, container };
}

function dispatchKey(target: Element, init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('useKeyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('Ctrl/Meta + Z 派发 UNDO', () => {
    const { dispatch, container } = setup(makeState());
    dispatchKey(container, { key: 'z', ctrlKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'UNDO' });
  });

  it('Ctrl/Meta + Shift + Z 派发 REDO', () => {
    const { dispatch, container } = setup(makeState());
    dispatchKey(container, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'REDO' });
  });

  it('Ctrl/Meta + Y 派发 REDO', () => {
    const { dispatch, container } = setup(makeState());
    dispatchKey(container, { key: 'y', ctrlKey: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'REDO' });
  });

  it('箭头键调用 moveSelection（默认不扩展）', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    const { moveSelection, container } = setup(makeState({ selection: sel }));
    dispatchKey(container, { key: 'ArrowDown' });
    expect(moveSelection).toHaveBeenCalledWith(sel, 'down', false);
  });

  it('Shift+箭头扩展选区', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    const { moveSelection, container } = setup(makeState({ selection: sel }));
    dispatchKey(container, { key: 'ArrowRight', shiftKey: true });
    expect(moveSelection).toHaveBeenCalledWith(sel, 'right', true);
  });

  it('Tab 向右移动', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    const { moveSelection, container } = setup(makeState({ selection: sel }));
    dispatchKey(container, { key: 'Tab' });
    expect(moveSelection).toHaveBeenCalledWith(sel, 'right', false);
  });

  it('Shift+Tab 向左移动', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    const { moveSelection, container } = setup(makeState({ selection: sel }));
    dispatchKey(container, { key: 'Tab', shiftKey: true });
    expect(moveSelection).toHaveBeenCalledWith(sel, 'left', false);
  });

  it('Enter 进入编辑模式', () => {
    const sel: Selection = { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } };
    const { dispatch, container } = setup(makeState({ selection: sel }));
    dispatchKey(container, { key: 'Enter' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EDITING_CELL', cell: sel.end });
  });

  it('F2 进入编辑模式', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 1 } };
    const { dispatch, container } = setup(makeState({ selection: sel }));
    dispatchKey(container, { key: 'F2' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EDITING_CELL', cell: sel.end });
  });

  it('Delete 清空选区中所有单元格', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } };
    const { dispatch, container } = setup(makeState({ selection: sel }), [0, 1]);
    dispatchKey(container, { key: 'Delete' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CELL', row: 0, col: 0, value: '' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CELL', row: 1, col: 1, value: '' });
  });

  it('Escape 清除选区和右键菜单', () => {
    const { dispatch, container } = setup(makeState());
    dispatchKey(container, { key: 'Escape' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTION', selection: null });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_CONTEXT_MENU',
      menu: { visible: false, x: 0, y: 0, targetCell: null },
    });
  });

  it('正在编辑时 Escape 仅退出编辑', () => {
    const { dispatch, container } = setup(
      makeState({ editingCell: { row: 0, col: 0 } })
    );
    dispatchKey(container, { key: 'Escape' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EDITING_CELL', cell: null });
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_SELECTION' }));
  });

  it('打字键直接进入编辑模式', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    const { dispatch, container } = setup(makeState({ selection: sel }));
    dispatchKey(container, { key: 'x' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_EDITING_CELL', cell: sel.end });
  });

  it('焦点在 INPUT 时跳过常规按键（除了 undo/redo）', () => {
    const sel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
    const { moveSelection, container } = setup(makeState({ selection: sel }));
    const input = document.createElement('input');
    container.appendChild(input);
    dispatchKey(input, { key: 'ArrowDown' });
    expect(moveSelection).not.toHaveBeenCalled();
  });
});
