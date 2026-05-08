import { useCallback } from 'react';
import {
  Search, Replace, Plus, Trash2, Undo2, Redo2,
  ChevronUp, ChevronDown, X,
} from 'lucide-react';
import type { CsvState, CsvAction } from './types';

interface CsvToolbarProps {
  state: CsvState;
  dispatch: (action: CsvAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  showSearch: boolean;
  onToggleSearch: () => void;
}

export function CsvToolbar({ state, dispatch, canUndo, canRedo, showSearch, onToggleSearch }: CsvToolbarProps) {
  const { search, rows, headers } = state;

  const handleSearchChange = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH', search: { query } });
  }, [dispatch]);

  const handleReplaceChange = useCallback((replaceText: string) => {
    dispatch({ type: 'SET_SEARCH', search: { replaceText } });
  }, [dispatch]);

  const nextMatch = useCallback(() => {
    if (search.matches.length === 0) return;
    const next = (search.currentMatchIndex + 1) % search.matches.length;
    dispatch({ type: 'SET_SEARCH', search: { currentMatchIndex: next } });
  }, [search, dispatch]);

  const prevMatch = useCallback(() => {
    if (search.matches.length === 0) return;
    const prev = (search.currentMatchIndex - 1 + search.matches.length) % search.matches.length;
    dispatch({ type: 'SET_SEARCH', search: { currentMatchIndex: prev } });
  }, [search, dispatch]);

  const toggleReplace = useCallback(() => {
    dispatch({ type: 'SET_SEARCH', search: { showReplace: !search.showReplace } });
  }, [search.showReplace, dispatch]);

  return (
    <div className="csv-toolbar">
      <div className="csv-toolbar-left">
        <button
          className="csv-toolbar-btn"
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          className="csv-toolbar-btn"
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={!canRedo}
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
        <div className="csv-toolbar-divider" />
        <button
          className="csv-toolbar-btn"
          onClick={() => dispatch({ type: 'INSERT_ROW', at: rows.length })}
          title="添加行"
        >
          <Plus size={14} />
          <span>行</span>
        </button>
        <button
          className="csv-toolbar-btn"
          onClick={() => dispatch({ type: 'INSERT_COL', at: headers.length })}
          title="添加列"
        >
          <Plus size={14} />
          <span>列</span>
        </button>
        <div className="csv-toolbar-divider" />
        <button
          className={`csv-toolbar-btn ${showSearch ? 'csv-toolbar-btn--active' : ''}`}
          onClick={onToggleSearch}
          title="搜索 (Ctrl+F)"
        >
          <Search size={14} />
        </button>
      </div>

      <div className="csv-toolbar-right">
        <span className="csv-stats">
          {rows.length} 行 · {headers.length} 列
        </span>
      </div>

      {showSearch && (
        <div className="csv-search-panel">
          <div className="csv-search-row">
            <button className="csv-toolbar-btn csv-toolbar-btn--sm" onClick={toggleReplace} title="替换">
              <Replace size={12} />
            </button>
            <input
              type="text"
              className="csv-search-input"
              placeholder="搜索..."
              value={search.query}
              onChange={e => handleSearchChange(e.target.value)}
              autoFocus
            />
            <span className="csv-search-count">
              {search.matches.length > 0
                ? `${search.currentMatchIndex + 1}/${search.matches.length}`
                : '无匹配'}
            </span>
            <button className="csv-toolbar-btn csv-toolbar-btn--sm" onClick={prevMatch} disabled={search.matches.length === 0}>
              <ChevronUp size={12} />
            </button>
            <button className="csv-toolbar-btn csv-toolbar-btn--sm" onClick={nextMatch} disabled={search.matches.length === 0}>
              <ChevronDown size={12} />
            </button>
            <button className="csv-toolbar-btn csv-toolbar-btn--sm" onClick={onToggleSearch}>
              <X size={12} />
            </button>
          </div>
          {search.showReplace && (
            <div className="csv-search-row">
              <div style={{ width: 26 }} />
              <input
                type="text"
                className="csv-search-input"
                placeholder="替换为..."
                value={search.replaceText}
                onChange={e => handleReplaceChange(e.target.value)}
              />
              <button
                className="csv-toolbar-btn csv-toolbar-btn--sm"
                onClick={() => dispatch({ type: 'REPLACE_CURRENT' })}
                disabled={search.matches.length === 0}
              >
                替换
              </button>
              <button
                className="csv-toolbar-btn csv-toolbar-btn--sm"
                onClick={() => dispatch({ type: 'REPLACE_ALL' })}
                disabled={search.matches.length === 0}
              >
                全部
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
