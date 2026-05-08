import { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CsvState, CsvAction, CellPosition } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT, ROW_NUMBER_WIDTH, DEFAULT_COL_WIDTH } from './types';
import { ColumnHeader } from './ColumnHeader';
import { CellRenderer } from './CellRenderer';
import { CellEditor } from './CellEditor';
import { useSelection, isCellInSelection } from './useSelection';
import { useKeyboard } from './useKeyboard';
import { useCopyPaste } from './useCopyPaste';

interface VirtualGridProps {
  state: CsvState;
  sortedRows: string[][];
  sortedToSourceMap: number[];
  dispatch: (action: CsvAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  onSearchToggle: () => void;
}

export function VirtualGrid({ state, sortedRows, sortedToSourceMap, dispatch, onSearchToggle }: VirtualGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { headers, columnWidths, selection, editingCell, sort, search } = state;
  const totalCols = headers.length;
  const totalRows = sortedRows.length;

  const { selectCell, startDrag, updateDrag, endDrag, moveSelection } = useSelection({
    dispatch,
    totalRows,
    totalCols,
  });

  useKeyboard({ state, sortedToSourceMap, dispatch, moveSelection, containerRef, onSearchToggle });
  useCopyPaste({ state, sortedRows, sortedToSourceMap, dispatch, containerRef });

  const getColWidth = useCallback((index: number) => columnWidths[index] || DEFAULT_COL_WIDTH, [columnWidths]);

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const colVirtualizer = useVirtualizer({
    count: totalCols,
    getScrollElement: () => scrollRef.current,
    estimateSize: getColWidth,
    horizontal: true,
    overscan: 3,
  });

  const totalWidth = useMemo(() => {
    let w = 0;
    for (let i = 0; i < totalCols; i++) w += getColWidth(i);
    return w;
  }, [totalCols, getColWidth]);

  const handleCellMouseDown = useCallback((pos: CellPosition, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey) {
      selectCell(pos, true);
    } else {
      startDrag(pos);
    }
  }, [selectCell, startDrag]);

  const handleCellMouseEnter = useCallback((pos: CellPosition) => {
    updateDrag(pos);
  }, [updateDrag]);

  const handleCellDoubleClick = useCallback((pos: CellPosition) => {
    dispatch({ type: 'SET_EDITING_CELL', cell: pos });
  }, [dispatch]);

  const handleContextMenu = useCallback((pos: CellPosition, e: React.MouseEvent) => {
    dispatch({
      type: 'SET_CONTEXT_MENU',
      menu: { visible: true, x: e.clientX, y: e.clientY, targetCell: pos },
    });
  }, [dispatch]);

  const handleMouseUp = useCallback(() => {
    endDrag();
  }, [endDrag]);

  const searchMatchSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of search.matches) {
      set.add(`${m.row},${m.col}`);
    }
    return set;
  }, [search.matches]);

  const currentMatch = useMemo(() => {
    if (search.currentMatchIndex < 0 || search.currentMatchIndex >= search.matches.length) return null;
    return search.matches[search.currentMatchIndex];
  }, [search.matches, search.currentMatchIndex]);

  const editingCellPosition = useMemo(() => {
    if (!editingCell) return null;
    let left = ROW_NUMBER_WIDTH;
    for (let i = 0; i < editingCell.col; i++) left += getColWidth(i);
    const top = HEADER_HEIGHT + editingCell.row * ROW_HEIGHT;
    return { left, top, width: getColWidth(editingCell.col), height: ROW_HEIGHT };
  }, [editingCell, getColWidth]);

  return (
    <div
      ref={containerRef}
      className="csv-grid-container"
      tabIndex={0}
      onMouseUp={handleMouseUp}
    >
      <div ref={scrollRef} className="csv-grid-scroll">
        {/* 固定表头 */}
        <div className="csv-grid-header" style={{ width: totalWidth + ROW_NUMBER_WIDTH }}>
          <div className="csv-row-number-header" style={{ width: ROW_NUMBER_WIDTH, minWidth: ROW_NUMBER_WIDTH }}>
            #
          </div>
          {colVirtualizer.getVirtualItems().map(virtualCol => (
            <ColumnHeader
              key={virtualCol.index}
              index={virtualCol.index}
              label={headers[virtualCol.index] || `Col ${virtualCol.index + 1}`}
              width={getColWidth(virtualCol.index)}
              sort={sort}
              dispatch={dispatch}
            />
          ))}
        </div>

        {/* 虚拟化网格主体 */}
        <div
          className="csv-grid-body"
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: totalWidth + ROW_NUMBER_WIDTH,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const rowData = sortedRows[virtualRow.index];
            if (!rowData) return null;

            return (
              <div
                key={virtualRow.index}
                className="csv-grid-row"
                style={{
                  position: 'absolute',
                  top: virtualRow.start,
                  height: ROW_HEIGHT,
                  width: totalWidth + ROW_NUMBER_WIDTH,
                }}
              >
                <div
                  className="csv-row-number"
                  style={{ width: ROW_NUMBER_WIDTH, minWidth: ROW_NUMBER_WIDTH, height: ROW_HEIGHT }}
                >
                  {virtualRow.index + 1}
                </div>
                {colVirtualizer.getVirtualItems().map(virtualCol => {
                  const r = virtualRow.index;
                  const c = virtualCol.index;
                  return (
                    <CellRenderer
                      key={c}
                      row={r}
                      col={c}
                      value={rowData[c] || ''}
                      width={getColWidth(c)}
                      height={ROW_HEIGHT}
                      isSelected={isCellInSelection(r, c, selection)}
                      isActive={selection?.end.row === r && selection?.end.col === c}
                      isSearchMatch={searchMatchSet.has(`${r},${c}`)}
                      isCurrentMatch={currentMatch !== null && currentMatch.row === r && currentMatch.col === c}
                      onMouseDown={handleCellMouseDown}
                      onMouseEnter={handleCellMouseEnter}
                      onDoubleClick={handleCellDoubleClick}
                      onContextMenu={handleContextMenu}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* 编辑覆盖层 */}
          {editingCell && editingCellPosition && (
            <CellEditor
              cell={editingCell}
              sourceRow={sortedToSourceMap[editingCell.row]}
              value={sortedRows[editingCell.row]?.[editingCell.col] || ''}
              width={editingCellPosition.width}
              height={editingCellPosition.height}
              left={editingCellPosition.left}
              top={editingCellPosition.top}
              dispatch={dispatch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
