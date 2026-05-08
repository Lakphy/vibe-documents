import { memo, useCallback, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { SortState, CsvAction } from './types';
import { MIN_COL_WIDTH } from './types';

interface ColumnHeaderProps {
  index: number;
  label: string;
  width: number;
  sort: SortState;
  dispatch: (action: CsvAction) => void;
  onDragStart: (colIndex: number, e: React.MouseEvent) => void;
}

export const ColumnHeader = memo(function ColumnHeader({ index, label, width, sort, dispatch, onDragStart }: ColumnHeaderProps) {
  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleSort = useCallback(() => {
    if (sort.columnIndex !== index) {
      dispatch({ type: 'SET_SORT', sort: { columnIndex: index, direction: 'asc' } });
    } else if (sort.direction === 'asc') {
      dispatch({ type: 'SET_SORT', sort: { columnIndex: index, direction: 'desc' } });
    } else {
      dispatch({ type: 'SET_SORT', sort: { columnIndex: -1, direction: null } });
    }
  }, [sort, index, dispatch]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    const handleMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const diff = ev.clientX - startX.current;
      const newWidth = Math.max(MIN_COL_WIDTH, startWidth.current + diff);
      dispatch({ type: 'SET_COLUMN_WIDTH', col: index, width: newWidth });
    };

    const handleUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [width, index, dispatch]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onDragStart(index, e);
  }, [index, onDragStart]);

  return (
    <div className="csv-header-cell" style={{ width, minWidth: width }}>
      <div
        className="csv-header-cell-content"
        onClick={handleSort}
        onMouseDown={handleMouseDown}
      >
        <span className="csv-header-label">{label}</span>
        {sort.columnIndex === index && sort.direction === 'asc' && <ArrowUp size={12} />}
        {sort.columnIndex === index && sort.direction === 'desc' && <ArrowDown size={12} />}
      </div>
      <div className="csv-resize-handle" onMouseDown={handleResizeStart} />
    </div>
  );
});
