import { useEffect, useCallback } from 'react';
import type { CsvState, CsvAction, Selection } from './types';

interface UseKeyboardProps {
  state: CsvState;
  sortedToSourceMap: number[];
  dispatch: (action: CsvAction) => void;
  moveSelection: (current: Selection | null, dir: 'up' | 'down' | 'left' | 'right', extend?: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSearchToggle: () => void;
}

export function useKeyboard({ state, sortedToSourceMap, dispatch, moveSelection, containerRef, onSearchToggle }: UseKeyboardProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSearchToggle();
      return;
    }

    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      dispatch({ type: 'UNDO' });
      return;
    }

    if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      dispatch({ type: 'REDO' });
      return;
    }

    if (isInput) return;

    if (state.editingCell) {
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_EDITING_CELL', cell: null });
      }
      return;
    }

    const extend = e.shiftKey;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveSelection(state.selection, 'up', extend);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveSelection(state.selection, 'down', extend);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveSelection(state.selection, 'left', extend);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveSelection(state.selection, 'right', extend);
        break;
      case 'Tab':
        e.preventDefault();
        moveSelection(state.selection, e.shiftKey ? 'left' : 'right', false);
        break;
      case 'Enter':
        e.preventDefault();
        if (state.selection) {
          dispatch({ type: 'SET_EDITING_CELL', cell: state.selection.end });
        }
        break;
      case 'F2':
        e.preventDefault();
        if (state.selection) {
          dispatch({ type: 'SET_EDITING_CELL', cell: state.selection.end });
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (state.selection) {
          const { start, end: selEnd } = state.selection;
          const minR = Math.min(start.row, selEnd.row);
          const maxR = Math.max(start.row, selEnd.row);
          const minC = Math.min(start.col, selEnd.col);
          const maxC = Math.max(start.col, selEnd.col);
          for (let r = minR; r <= maxR; r++) {
            const sourceRow = sortedToSourceMap[r];
            for (let c = minC; c <= maxC; c++) {
              dispatch({ type: 'SET_CELL', row: sourceRow, col: c, value: '' });
            }
          }
        }
        break;
      case 'Escape':
        dispatch({ type: 'SET_SELECTION', selection: null });
        dispatch({ type: 'SET_CONTEXT_MENU', menu: { visible: false, x: 0, y: 0, targetCell: null } });
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && state.selection) {
          dispatch({ type: 'SET_EDITING_CELL', cell: state.selection.end });
        }
        break;
    }
  }, [state, dispatch, moveSelection, onSearchToggle]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, containerRef]);
}
