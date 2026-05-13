import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from '../csv/useSelection';
import type { CsvAction, Selection } from '../csv/types';

function setup(totalRows = 5, totalCols = 5) {
  const dispatch = vi.fn<(action: CsvAction) => void>();
  const hook = renderHook(() => useSelection({ dispatch, totalRows, totalCols }));
  return { dispatch, hook };
}

describe('useSelection hook', () => {
  describe('selectCell', () => {
    it('单击设置 start=end 选区', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.selectCell({ row: 2, col: 3 }));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 2, col: 3 }, end: { row: 2, col: 3 } },
      });
    });

    it('extend=true 且已有起点时扩展选区', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.selectCell({ row: 1, col: 1 }));
      dispatch.mockClear();
      act(() => hook.result.current.selectCell({ row: 4, col: 4 }, true));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 1, col: 1 }, end: { row: 4, col: 4 } },
      });
    });

    it('extend=true 但无起点时退化为单选', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.selectCell({ row: 2, col: 2 }, true));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 2, col: 2 }, end: { row: 2, col: 2 } },
      });
    });
  });

  describe('drag', () => {
    it('startDrag 初始化选区并设置 dragging', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.startDrag({ row: 0, col: 0 }));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
      });
    });

    it('updateDrag 在拖拽中扩展选区', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.startDrag({ row: 0, col: 0 }));
      dispatch.mockClear();
      act(() => hook.result.current.updateDrag({ row: 3, col: 2 }));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 0, col: 0 }, end: { row: 3, col: 2 } },
      });
    });

    it('endDrag 后 updateDrag 不再触发', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.startDrag({ row: 0, col: 0 }));
      act(() => hook.result.current.endDrag());
      dispatch.mockClear();
      act(() => hook.result.current.updateDrag({ row: 2, col: 2 }));
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('未 startDrag 直接 updateDrag 不触发', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.updateDrag({ row: 1, col: 1 }));
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('moveSelection', () => {
    const baseSel: Selection = { start: { row: 2, col: 2 }, end: { row: 2, col: 2 } };

    it('current 为 null 时无任何操作', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.moveSelection(null, 'up'));
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('向上移动', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.moveSelection(baseSel, 'up'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 1, col: 2 }, end: { row: 1, col: 2 } },
      });
    });

    it('向下移动', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.moveSelection(baseSel, 'down'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 3, col: 2 }, end: { row: 3, col: 2 } },
      });
    });

    it('向左移动', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.moveSelection(baseSel, 'left'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } },
      });
    });

    it('向右移动', () => {
      const { dispatch, hook } = setup();
      act(() => hook.result.current.moveSelection(baseSel, 'right'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 2, col: 3 }, end: { row: 2, col: 3 } },
      });
    });

    it('向上越界时夹紧到 0', () => {
      const { dispatch, hook } = setup();
      const topSel: Selection = { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } };
      act(() => hook.result.current.moveSelection(topSel, 'up'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
      });
    });

    it('向右越界时夹紧到 totalCols-1', () => {
      const { dispatch, hook } = setup(5, 3);
      const rightSel: Selection = { start: { row: 0, col: 2 }, end: { row: 0, col: 2 } };
      act(() => hook.result.current.moveSelection(rightSel, 'right'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 0, col: 2 }, end: { row: 0, col: 2 } },
      });
    });

    it('向下越界时夹紧到 totalRows-1', () => {
      const { dispatch, hook } = setup(3, 5);
      const bottomSel: Selection = { start: { row: 2, col: 0 }, end: { row: 2, col: 0 } };
      act(() => hook.result.current.moveSelection(bottomSel, 'down'));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 2, col: 0 }, end: { row: 2, col: 0 } },
      });
    });

    it('extend=true 时保留 start 作为锚点', () => {
      const { dispatch, hook } = setup();
      const sel: Selection = { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } };
      act(() => hook.result.current.moveSelection(sel, 'down', true));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        selection: { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      });
    });
  });
});
