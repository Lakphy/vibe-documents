import { useEffect, useCallback } from 'react';
import type { CsvState, CsvAction } from './types';
import { getSelectionRange } from './useSelection';

interface UseCopyPasteProps {
  state: CsvState;
  sortedRows: string[][];
  sortedToSourceMap: number[];
  dispatch: (action: CsvAction) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useCopyPaste({ state, sortedRows, sortedToSourceMap, dispatch, containerRef }: UseCopyPasteProps) {
  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (!state.selection) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    e.preventDefault();
    const { minRow, maxRow, minCol, maxCol } = getSelectionRange(state.selection);
    const lines: string[] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const row = sortedRows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        cells.push(row[c] || '');
      }
      lines.push(cells.join('\t'));
    }
    e.clipboardData?.setData('text/plain', lines.join('\n'));
  }, [state.selection, sortedRows]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (!state.selection) return;

    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;

    const pasteRows = text.split('\n').map(line => line.split('\t'));
    const visualStartRow = Math.min(state.selection.start.row, state.selection.end.row);
    const startCol = Math.min(state.selection.start.col, state.selection.end.col);
    const startRow = sortedToSourceMap[visualStartRow];

    dispatch({ type: 'PASTE_CELLS', startRow, startCol, data: pasteRows });
  }, [state.selection, sortedToSourceMap, dispatch]);

  const handleCut = useCallback((e: ClipboardEvent) => {
    if (!state.selection) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    handleCopy(e);
    const { minRow, maxRow, minCol, maxCol } = getSelectionRange(state.selection);
    for (let r = minRow; r <= maxRow; r++) {
      const sourceRow = sortedToSourceMap[r];
      for (let c = minCol; c <= maxCol; c++) {
        dispatch({ type: 'SET_CELL', row: sourceRow, col: c, value: '' });
      }
    }
  }, [state.selection, sortedToSourceMap, dispatch, handleCopy]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('copy', handleCopy);
    el.addEventListener('paste', handlePaste);
    el.addEventListener('cut', handleCut);
    return () => {
      el.removeEventListener('copy', handleCopy);
      el.removeEventListener('paste', handlePaste);
      el.removeEventListener('cut', handleCut);
    };
  }, [handleCopy, handlePaste, handleCut, containerRef]);
}
