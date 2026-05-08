import { useCallback, useRef } from 'react';
import type { CellPosition, Selection, CsvAction } from './types';

interface UseSelectionProps {
  dispatch: (action: CsvAction) => void;
  totalRows: number;
  totalCols: number;
}

export function useSelection({ dispatch, totalRows, totalCols }: UseSelectionProps) {
  const isDragging = useRef(false);
  const dragStart = useRef<CellPosition | null>(null);

  const selectCell = useCallback((pos: CellPosition, extend = false) => {
    if (extend && dragStart.current) {
      dispatch({
        type: 'SET_SELECTION',
        selection: { start: dragStart.current, end: pos },
      });
    } else {
      dragStart.current = pos;
      dispatch({
        type: 'SET_SELECTION',
        selection: { start: pos, end: pos },
      });
    }
  }, [dispatch]);

  const startDrag = useCallback((pos: CellPosition) => {
    isDragging.current = true;
    dragStart.current = pos;
    dispatch({
      type: 'SET_SELECTION',
      selection: { start: pos, end: pos },
    });
  }, [dispatch]);

  const updateDrag = useCallback((pos: CellPosition) => {
    if (!isDragging.current || !dragStart.current) return;
    dispatch({
      type: 'SET_SELECTION',
      selection: { start: dragStart.current, end: pos },
    });
  }, [dispatch]);

  const endDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  const moveSelection = useCallback((
    current: Selection | null,
    direction: 'up' | 'down' | 'left' | 'right',
    extend = false
  ) => {
    if (!current) return;
    const anchor = extend ? current.start : current.end;
    const moving = current.end;
    let newPos: CellPosition;

    switch (direction) {
      case 'up':
        newPos = { row: Math.max(0, moving.row - 1), col: moving.col };
        break;
      case 'down':
        newPos = { row: Math.min(totalRows - 1, moving.row + 1), col: moving.col };
        break;
      case 'left':
        newPos = { row: moving.row, col: Math.max(0, moving.col - 1) };
        break;
      case 'right':
        newPos = { row: moving.row, col: Math.min(totalCols - 1, moving.col + 1) };
        break;
    }

    if (extend) {
      dispatch({ type: 'SET_SELECTION', selection: { start: anchor, end: newPos } });
    } else {
      dispatch({ type: 'SET_SELECTION', selection: { start: newPos, end: newPos } });
    }
  }, [dispatch, totalRows, totalCols]);

  return { selectCell, startDrag, updateDrag, endDrag, moveSelection };
}

export function getSelectionRange(selection: Selection): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  return {
    minRow: Math.min(selection.start.row, selection.end.row),
    maxRow: Math.max(selection.start.row, selection.end.row),
    minCol: Math.min(selection.start.col, selection.end.col),
    maxCol: Math.max(selection.start.col, selection.end.col),
  };
}

export function isCellInSelection(row: number, col: number, selection: Selection | null): boolean {
  if (!selection) return false;
  const { minRow, maxRow, minCol, maxCol } = getSelectionRange(selection);
  return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
}
