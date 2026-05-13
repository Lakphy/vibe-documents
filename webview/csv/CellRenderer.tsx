import { memo } from 'react';
import type { CellPosition } from './types';

interface CellRendererProps {
  row: number;
  col: number;
  value: string;
  width: number;
  height: number;
  isSelected: boolean;
  isActive: boolean;
  isEditing: boolean;
  isSearchMatch: boolean;
  isCurrentMatch: boolean;
  onMouseDown: (pos: CellPosition, e: React.MouseEvent) => void;
  onMouseEnter: (pos: CellPosition) => void;
  onDoubleClick: (pos: CellPosition) => void;
  onContextMenu: (pos: CellPosition, e: React.MouseEvent) => void;
}

export const CellRenderer = memo(function CellRenderer({
  row, col, value, width, height,
  isSelected, isActive, isEditing, isSearchMatch, isCurrentMatch,
  onMouseDown, onMouseEnter, onDoubleClick, onContextMenu,
}: CellRendererProps) {
  let className = 'csv-cell';
  if (isSelected) className += ' csv-cell--selected';
  if (isActive) className += ' csv-cell--active';
  if (isEditing) className += ' csv-cell--editing';
  if (isSearchMatch) className += ' csv-cell--search-match';
  if (isCurrentMatch) className += ' csv-cell--current-match';

  return (
    <div
      className={className}
      style={{ width, height, minWidth: width }}
      onMouseDown={e => onMouseDown({ row, col }, e)}
      onMouseEnter={() => onMouseEnter({ row, col })}
      onDoubleClick={() => onDoubleClick({ row, col })}
      onContextMenu={e => { e.preventDefault(); onContextMenu({ row, col }, e); }}
    >
      <span className="csv-cell-text">{isEditing ? '' : value}</span>
    </div>
  );
});
