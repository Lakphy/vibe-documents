import { useState, useEffect, useRef, useCallback } from 'react';
import type { CellPosition, CsvAction } from './types';

interface CellEditorProps {
  cell: CellPosition;
  sourceRow: number;
  value: string;
  width: number;
  height: number;
  left: number;
  top: number;
  dispatch: (action: CsvAction) => void;
}

export function CellEditor({ cell, sourceRow, value, width, height, left, top, dispatch }: CellEditorProps) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(value);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [value, cell.row, cell.col]);

  const commit = useCallback(() => {
    if (text !== value) {
      dispatch({ type: 'SET_CELL', row: sourceRow, col: cell.col, value: text });
    }
    dispatch({ type: 'SET_EDITING_CELL', cell: null });
  }, [text, value, sourceRow, cell, dispatch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      dispatch({ type: 'SET_EDITING_CELL', cell: null });
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commit();
    }
  }, [commit, dispatch]);

  return (
    <textarea
      ref={inputRef}
      className="csv-cell-editor"
      style={{
        position: 'absolute',
        left,
        top,
        width: Math.max(width, 100),
        minHeight: height,
        zIndex: 100,
      }}
      value={text}
      onChange={e => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={commit}
    />
  );
}
