import { useEffect } from 'react';
import {
  X, ChevronUp, ChevronDown,
  CaseSensitive, WholeWord, Regex,
} from 'lucide-react';
import type { SearchState, SearchActions } from './useSearch';

interface SearchWidgetProps {
  state: SearchState;
  actions: SearchActions;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export function SearchWidget({ state, actions, searchInputRef }: SearchWidgetProps) {
  useEffect(() => {
    if (state.isOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [state.isOpen, searchInputRef]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      actions.close();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      actions.findPrev();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      actions.findNext();
    } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      actions.toggleCaseSensitive();
    } else if (e.altKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      actions.toggleWholeWord();
    } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      actions.toggleRegex();
    }
  };

  if (!state.isOpen) return null;

  const matchLabel = state.query
    ? state.matchCount === 0
      ? '无结果'
      : `${state.currentIndex + 1} / ${state.matchCount}`
    : '';

  return (
    <div className="vd-search-widget" role="search" aria-label="搜索">
      <div className="vd-search-widget-inner">
        <div className="vd-search-rows">
          <div className="vd-search-row">
            <div className="vd-search-input-wrap">
              <input
                ref={searchInputRef}
                className="vd-search-input"
                type="text"
                placeholder="搜索"
                value={state.query}
                onChange={e => actions.setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                spellCheck={false}
                autoComplete="off"
              />
              <div className="vd-search-options">
                <button
                  className={`vd-search-option-btn ${state.caseSensitive ? 'vd-search-option-btn--active' : ''}`}
                  onClick={actions.toggleCaseSensitive}
                  title="区分大小写 (Alt+C)"
                  aria-pressed={state.caseSensitive}
                >
                  <CaseSensitive size={14} />
                </button>
                <button
                  className={`vd-search-option-btn ${state.wholeWord ? 'vd-search-option-btn--active' : ''}`}
                  onClick={actions.toggleWholeWord}
                  title="全词匹配 (Alt+W)"
                  aria-pressed={state.wholeWord}
                >
                  <WholeWord size={14} />
                </button>
                <button
                  className={`vd-search-option-btn ${state.useRegex ? 'vd-search-option-btn--active' : ''}`}
                  onClick={actions.toggleRegex}
                  title="使用正则表达式 (Alt+R)"
                  aria-pressed={state.useRegex}
                >
                  <Regex size={14} />
                </button>
              </div>
            </div>

            <span className="vd-search-count">{matchLabel}</span>

            <button className="vd-search-nav-btn" onClick={actions.findPrev} title="上一个匹配 (Shift+Enter)" disabled={state.matchCount === 0}>
              <ChevronUp size={16} />
            </button>
            <button className="vd-search-nav-btn" onClick={actions.findNext} title="下一个匹配 (Enter)" disabled={state.matchCount === 0}>
              <ChevronDown size={16} />
            </button>
            <button className="vd-search-nav-btn" onClick={actions.close} title="关闭 (Escape)">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
