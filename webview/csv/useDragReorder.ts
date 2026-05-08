import { useState, useCallback, useRef, useEffect } from 'react';
import type { CsvAction, ColumnWidths } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, ROW_NUMBER_WIDTH, DEFAULT_COL_WIDTH } from './types';

export interface DragIndicator {
  type: 'row' | 'col';
  sourceIndex: number;
  targetIndex: number;
}

const DRAG_THRESHOLD = 4;

interface UseDragReorderOptions {
  dispatch: (action: CsvAction) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  totalRows: number;
  totalCols: number;
  columnWidths: ColumnWidths;
  sortActive: boolean;
}

export function useDragReorder({
  dispatch, scrollRef, totalRows, totalCols, columnWidths, sortActive,
}: UseDragReorderOptions) {
  const [indicator, setIndicator] = useState<DragIndicator | null>(null);
  const indicatorRef = useRef<DragIndicator | null>(null);
  const pendingRef = useRef<{
    type: 'row' | 'col';
    index: number;
    startX: number;
    startY: number;
  } | null>(null);
  const activeDrag = useRef(false);

  const configRef = useRef({ totalRows, totalCols, columnWidths, dispatch, scrollRef, sortActive });
  configRef.current = { totalRows, totalCols, columnWidths, dispatch, scrollRef, sortActive };

  const handleRowMouseDown = useCallback((rowIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    pendingRef.current = { type: 'row', index: rowIndex, startX: e.clientX, startY: e.clientY };
    activeDrag.current = false;
  }, []);

  const handleColMouseDown = useCallback((colIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    pendingRef.current = { type: 'col', index: colIndex, startX: e.clientX, startY: e.clientY };
    activeDrag.current = false;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const p = pendingRef.current;
      if (!p) return;

      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;

      if (!activeDrag.current) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        if (p.type === 'row' && configRef.current.sortActive) {
          pendingRef.current = null;
          return;
        }
        activeDrag.current = true;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }

      const { totalRows, totalCols, columnWidths, scrollRef } = configRef.current;
      const scroll = scrollRef.current;
      if (!scroll) return;
      const rect = scroll.getBoundingClientRect();
      const getColWidth = (i: number) => columnWidths[i] || DEFAULT_COL_WIDTH;

      let next: DragIndicator;
      if (p.type === 'row') {
        const relY = e.clientY - rect.top + scroll.scrollTop - HEADER_HEIGHT;
        const target = Math.max(0, Math.min(totalRows, Math.round(relY / ROW_HEIGHT)));
        next = { type: 'row', sourceIndex: p.index, targetIndex: target };
      } else {
        const relX = e.clientX - rect.left + scroll.scrollLeft - ROW_NUMBER_WIDTH;
        let target = 0;
        let acc = 0;
        for (let i = 0; i < totalCols; i++) {
          const w = getColWidth(i);
          if (relX < acc + w / 2) break;
          acc += w;
          target = i + 1;
        }
        target = Math.max(0, Math.min(totalCols, target));
        next = { type: 'col', sourceIndex: p.index, targetIndex: target };
      }
      indicatorRef.current = next;
      setIndicator(next);
    };

    const onMouseUp = () => {
      const p = pendingRef.current;
      if (!p) return;

      const { dispatch, totalCols } = configRef.current;

      if (activeDrag.current && indicatorRef.current) {
        const { type, sourceIndex, targetIndex } = indicatorRef.current;
        if (type === 'row') {
          const to = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
          if (to !== sourceIndex) {
            dispatch({ type: 'MOVE_ROW', from: sourceIndex, to });
          }
        } else {
          const to = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
          if (to !== sourceIndex) {
            dispatch({ type: 'MOVE_COL', from: sourceIndex, to });
          }
        }
      } else if (!activeDrag.current) {
        if (p.type === 'row') {
          dispatch({
            type: 'SET_SELECTION',
            selection: { start: { row: p.index, col: 0 }, end: { row: p.index, col: totalCols - 1 } },
          });
        }
      }

      pendingRef.current = null;
      activeDrag.current = false;
      indicatorRef.current = null;
      setIndicator(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return { indicator, handleRowMouseDown, handleColMouseDown };
}
