export interface CellPosition {
  row: number;
  col: number;
}

export interface Selection {
  start: CellPosition;
  end: CellPosition;
}

export interface SortState {
  columnIndex: number;
  direction: 'asc' | 'desc' | null;
}

export interface SearchState {
  query: string;
  replaceText: string;
  matches: CellPosition[];
  currentMatchIndex: number;
  showReplace: boolean;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetCell: CellPosition | null;
}

export interface ColumnWidths {
  [colIndex: number]: number;
}

export interface CsvState {
  headers: string[];
  rows: string[][];
  columnWidths: ColumnWidths;
  selection: Selection | null;
  editingCell: CellPosition | null;
  sort: SortState;
  search: SearchState;
  contextMenu: ContextMenuState;
}

export type CsvAction =
  | { type: 'SET_DATA'; headers: string[]; rows: string[][] }
  | { type: 'SET_CELL'; row: number; col: number; value: string }
  | { type: 'INSERT_ROW'; at: number }
  | { type: 'DELETE_ROW'; at: number }
  | { type: 'INSERT_COL'; at: number }
  | { type: 'DELETE_COL'; at: number }
  | { type: 'SET_SELECTION'; selection: Selection | null }
  | { type: 'SET_EDITING_CELL'; cell: CellPosition | null }
  | { type: 'SET_SORT'; sort: SortState }
  | { type: 'SET_COLUMN_WIDTH'; col: number; width: number }
  | { type: 'SET_SEARCH'; search: Partial<SearchState> }
  | { type: 'SET_CONTEXT_MENU'; menu: ContextMenuState }
  | { type: 'REPLACE_CURRENT' }
  | { type: 'REPLACE_ALL' }
  | { type: 'PASTE_CELLS'; startRow: number; startCol: number; data: string[][] }
  | { type: 'MOVE_ROW'; from: number; to: number }
  | { type: 'MOVE_COL'; from: number; to: number }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export const DEFAULT_COL_WIDTH = 120;
export const MIN_COL_WIDTH = 50;
export const ROW_HEIGHT = 28;
export const HEADER_HEIGHT = 32;
export const ROW_NUMBER_WIDTH = 50;
