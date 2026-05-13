import { useReducer, useRef, useCallback, useMemo } from 'react';
import type { CsvState, CsvAction, CellPosition, SearchState } from './types';
import { DEFAULT_COL_WIDTH } from './types';
import { UndoRedoStack, type Snapshot } from './history';
import { parseAndSplit, serializeCsv } from './parser';

function createInitialState(): CsvState {
  return {
    headers: [],
    rows: [],
    columnWidths: {},
    selection: null,
    editingCell: null,
    sort: { columnIndex: -1, direction: null },
    search: { query: '', replaceText: '', matches: [], currentMatchIndex: -1, showReplace: false },
    contextMenu: { visible: false, x: 0, y: 0, targetCell: null },
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function computeSearchMatches(rows: string[][], query: string): CellPosition[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  const matches: CellPosition[] = [];
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c].toLowerCase().includes(lower)) {
        matches.push({ row: r, col: c });
      }
    }
  }
  return matches;
}

function cellMatches(value: string, lowerQuery: string) {
  return value.toLowerCase().includes(lowerQuery);
}

function sortCellPositions(a: CellPosition, b: CellPosition) {
  return a.row === b.row ? a.col - b.col : a.row - b.row;
}

function insertSortedCellPosition(matches: CellPosition[], position: CellPosition) {
  const next = [...matches];
  let low = 0;
  let high = next.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sortCellPositions(next[mid], position) < 0) low = mid + 1;
    else high = mid;
  }
  next.splice(low, 0, position);
  return next;
}

function clampSearchIndex(matches: CellPosition[], currentMatchIndex: number) {
  if (matches.length === 0) return -1;
  if (currentMatchIndex < 0) return 0;
  return Math.min(currentMatchIndex, matches.length - 1);
}

function refreshSearchMatches(search: SearchState, rows: string[][]): SearchState {
  if (!search.query) return search;
  const matches = computeSearchMatches(rows, search.query);
  return {
    ...search,
    matches,
    currentMatchIndex: clampSearchIndex(matches, search.currentMatchIndex),
  };
}

function updateCellSearchMatches(search: SearchState, row: number, col: number, value: string): SearchState {
  if (!search.query) return search;

  const lowerQuery = search.query.toLowerCase();
  const withoutCell = search.matches.filter(match => match.row !== row || match.col !== col);
  const matches = cellMatches(value, lowerQuery)
    ? insertSortedCellPosition(withoutCell, { row, col })
    : withoutCell;

  return {
    ...search,
    matches,
    currentMatchIndex: clampSearchIndex(matches, search.currentMatchIndex),
  };
}

function csvReducer(state: CsvState, action: CsvAction): CsvState {
  switch (action.type) {
    case 'SET_DATA': {
      const widths = { ...state.columnWidths };
      for (let i = 0; i < action.headers.length; i++) {
        if (widths[i] === undefined) widths[i] = DEFAULT_COL_WIDTH;
      }
      return {
        ...state,
        headers: action.headers,
        rows: action.rows,
        columnWidths: widths,
        selection: null,
        editingCell: null,
        search: refreshSearchMatches(state.search, action.rows),
      };
    }

    case 'SET_CELL': {
      const newRows = state.rows.map((r, i) =>
        i === action.row ? r.map((c, j) => (j === action.col ? action.value : c)) : r
      );
      const newSearch = updateCellSearchMatches(state.search, action.row, action.col, action.value);
      return { ...state, rows: newRows, search: newSearch };
    }

    case 'INSERT_ROW': {
      const newRow = new Array(state.headers.length).fill('');
      const newRows = [...state.rows];
      newRows.splice(action.at, 0, newRow);
      return { ...state, rows: newRows, search: refreshSearchMatches(state.search, newRows) };
    }

    case 'DELETE_ROW': {
      if (state.rows.length <= 1) return state;
      const newRows = state.rows.filter((_, i) => i !== action.at);
      return { ...state, rows: newRows, editingCell: null, search: refreshSearchMatches(state.search, newRows) };
    }

    case 'INSERT_COL': {
      const newHeaders = [...state.headers];
      newHeaders.splice(action.at, 0, `Column ${state.headers.length + 1}`);
      const newRows = state.rows.map(r => {
        const nr = [...r];
        nr.splice(action.at, 0, '');
        return nr;
      });
      const widths = { ...state.columnWidths };
      widths[action.at] = DEFAULT_COL_WIDTH;
      return { ...state, headers: newHeaders, rows: newRows, columnWidths: widths, search: refreshSearchMatches(state.search, newRows) };
    }

    case 'DELETE_COL': {
      if (state.headers.length <= 1) return state;
      const newHeaders = state.headers.filter((_, i) => i !== action.at);
      const newRows = state.rows.map(r => r.filter((_, i) => i !== action.at));
      return { ...state, headers: newHeaders, rows: newRows, editingCell: null, search: refreshSearchMatches(state.search, newRows) };
    }

    case 'SET_SELECTION':
      return { ...state, selection: action.selection };

    case 'SET_EDITING_CELL':
      return { ...state, editingCell: action.cell };

    case 'SET_SORT':
      return { ...state, sort: action.sort };

    case 'SET_COLUMN_WIDTH':
      return { ...state, columnWidths: { ...state.columnWidths, [action.col]: action.width } };

    case 'SET_SEARCH': {
      const newSearch = { ...state.search, ...action.search };
      if (action.search.query !== undefined) {
        newSearch.matches = computeSearchMatches(state.rows, newSearch.query);
        newSearch.currentMatchIndex = newSearch.matches.length > 0 ? 0 : -1;
      }
      return { ...state, search: newSearch };
    }

    case 'SET_CONTEXT_MENU':
      return { ...state, contextMenu: action.menu };

    case 'REPLACE_CURRENT': {
      const { matches, currentMatchIndex, replaceText } = state.search;
      if (currentMatchIndex < 0 || currentMatchIndex >= matches.length) return state;
      const pos = matches[currentMatchIndex];
      const oldValue = state.rows[pos.row][pos.col];
      const escaped = escapeRegExp(state.search.query);
      const newValue = oldValue.replace(new RegExp(escaped, 'i'), replaceText);
      const newRows = state.rows.map((r, i) =>
        i === pos.row ? r.map((c, j) => (j === pos.col ? newValue : c)) : r
      );
      const newMatches = computeSearchMatches(newRows, state.search.query);
      const newIndex = Math.min(currentMatchIndex, newMatches.length - 1);
      return {
        ...state,
        rows: newRows,
        search: { ...state.search, matches: newMatches, currentMatchIndex: newIndex },
      };
    }

    case 'REPLACE_ALL': {
      const { query, replaceText } = state.search;
      if (!query) return state;
      const escaped = escapeRegExp(query);
      const regex = new RegExp(escaped, 'gi');
      const newRows = state.rows.map(r => r.map(c => c.replace(regex, replaceText)));
      return {
        ...state,
        rows: newRows,
        search: { ...state.search, matches: [], currentMatchIndex: -1 },
      };
    }

    case 'PASTE_CELLS': {
      const { startRow, startCol, data } = action;
      const newRows = [...state.rows];
      for (let r = 0; r < data.length; r++) {
        const targetRow = startRow + r;
        if (targetRow >= newRows.length) {
          newRows.push(new Array(state.headers.length).fill(''));
        }
        const row = [...newRows[targetRow]];
        for (let c = 0; c < data[r].length; c++) {
          const targetCol = startCol + c;
          if (targetCol < state.headers.length) {
            row[targetCol] = data[r][c];
          }
        }
        newRows[targetRow] = row;
      }
      return { ...state, rows: newRows, search: refreshSearchMatches(state.search, newRows) };
    }

    case 'MOVE_ROW': {
      const { from, to } = action;
      if (from === to) return state;
      const newRows = [...state.rows];
      const [moved] = newRows.splice(from, 1);
      newRows.splice(to, 0, moved);
      return { ...state, rows: newRows, sort: { columnIndex: -1, direction: null }, editingCell: null, search: refreshSearchMatches(state.search, newRows) };
    }

    case 'MOVE_COL': {
      const { from, to } = action;
      if (from === to) return state;
      const newHeaders = [...state.headers];
      const [movedH] = newHeaders.splice(from, 1);
      newHeaders.splice(to, 0, movedH);
      const newRows = state.rows.map(row => {
        const nr = [...row];
        const [movedC] = nr.splice(from, 1);
        nr.splice(to, 0, movedC);
        return nr;
      });
      const oldWidths = Array.from(
        { length: state.headers.length },
        (_, i) => state.columnWidths[i] || DEFAULT_COL_WIDTH,
      );
      const [movedW] = oldWidths.splice(from, 1);
      oldWidths.splice(to, 0, movedW);
      const newWidths: Record<number, number> = {};
      oldWidths.forEach((w, i) => { newWidths[i] = w; });
      return { ...state, headers: newHeaders, rows: newRows, columnWidths: newWidths, editingCell: null, search: refreshSearchMatches(state.search, newRows) };
    }

    default:
      return state;
  }
}

export function useCsvStore(initialContent: string) {
  const [state, dispatch] = useReducer(csvReducer, createInitialState());
  const historyRef = useRef(new UndoRedoStack());
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatchWithHistory = useCallback((action: CsvAction) => {
    const current = stateRef.current;

    if (
      action.type === 'SET_CELL' ||
      action.type === 'INSERT_ROW' ||
      action.type === 'DELETE_ROW' ||
      action.type === 'INSERT_COL' ||
      action.type === 'DELETE_COL' ||
      action.type === 'PASTE_CELLS' ||
      action.type === 'REPLACE_CURRENT' ||
      action.type === 'REPLACE_ALL' ||
      action.type === 'MOVE_ROW' ||
      action.type === 'MOVE_COL'
    ) {
      historyRef.current.push({ headers: current.headers, rows: current.rows });
    }

    if (action.type === 'UNDO') {
      const prev = historyRef.current.undo({ headers: current.headers, rows: current.rows });
      if (prev) {
        dispatch({ type: 'SET_DATA', headers: prev.headers, rows: prev.rows });
      }
      return;
    }

    if (action.type === 'REDO') {
      const next = historyRef.current.redo({ headers: current.headers, rows: current.rows });
      if (next) {
        dispatch({ type: 'SET_DATA', headers: next.headers, rows: next.rows });
      }
      return;
    }

    dispatch(action);
  }, []);

  const initFromContent = useCallback((content: string) => {
    const { headers, rows } = parseAndSplit(content);
    historyRef.current.clear();
    dispatch({ type: 'SET_DATA', headers, rows });
  }, []);

  const serialize = useCallback(() => {
    return serializeCsv(state.headers, state.rows);
  }, [state.headers, state.rows]);

  const { sortedRows, sortedToSourceMap } = useMemo(() => {
    const { sort, rows } = state;
    if (sort.direction === null || sort.columnIndex < 0) {
      return {
        sortedRows: rows,
        sortedToSourceMap: rows.map((_, i) => i),
      };
    }
    const indexed = rows.map((row, i) => ({ row, sourceIndex: i }));
    indexed.sort((a, b) => {
      const valA = a.row[sort.columnIndex] || '';
      const valB = b.row[sort.columnIndex] || '';
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return sort.direction === 'asc' ? numA - numB : numB - numA;
      }
      const cmp = valA.localeCompare(valB);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return {
      sortedRows: indexed.map(item => item.row),
      sortedToSourceMap: indexed.map(item => item.sourceIndex),
    };
  }, [state.sort, state.rows]);

  return {
    state,
    dispatch: dispatchWithHistory,
    initFromContent,
    serialize,
    sortedRows,
    sortedToSourceMap,
    canUndo: historyRef.current.canUndo(),
    canRedo: historyRef.current.canRedo(),
  };
}
