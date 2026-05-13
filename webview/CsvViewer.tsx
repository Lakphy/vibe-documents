import { useEffect, useRef, useState, useCallback } from 'react';
import { useCsvStore } from './csv/store';
import { VirtualGrid } from './csv/VirtualGrid';
import { CsvToolbar } from './csv/CsvToolbar';
import { ContextMenu } from './csv/ContextMenu';
import { getVsCodeApi } from './vscodeApi';
import { useSaveContentProvider } from './saveShortcut';

interface CsvViewerProps {
  content: string;
}

export function CsvViewer({ content }: CsvViewerProps) {
  const { state, dispatch, initFromContent, serialize, sortedRows, sortedToSourceMap, canUndo, canRedo } = useCsvStore(content);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastContentRef = useRef(content);
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      isExternalUpdate.current = true;
      initFromContent(content);
      isExternalUpdate.current = false;
    }
  }, [content, initFromContent]);

  useEffect(() => {
    if (!state.headers.length && content) {
      initFromContent(content);
    }
  }, []);

  useEffect(() => {
    if (isExternalUpdate.current) return;
    if (!state.headers.length) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const csv = serialize();
      if (csv !== lastContentRef.current) {
        lastContentRef.current = csv;
        getVsCodeApi()?.postMessage({ type: 'edit', content: csv });
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state.rows, state.headers, serialize]);

  const openSearch = useCallback(() => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    dispatch({ type: 'SET_SEARCH', search: { query: '', matches: [], currentMatchIndex: -1 } });
  }, [dispatch]);

  const toggleSearch = useCallback(() => {
    if (showSearch) {
      closeSearch();
    } else {
      openSearch();
    }
  }, [showSearch, openSearch, closeSearch]);

  useSaveContentProvider(() => {
    if (!state.headers.length) return undefined;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }

    const csv = serialize();
    lastContentRef.current = csv;
    return csv;
  });

  // Cmd+F / Ctrl+F (document 级别，确保在任何焦点状态下都能工作)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        openSearch();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [openSearch]);

  if (!state.headers.length) {
    return (
      <div className="csv-viewer-container">
        <div className="csv-empty-state">
          Waiting for content...
        </div>
      </div>
    );
  }

  return (
    <div className="csv-viewer-container">
      <CsvToolbar
        state={state}
        dispatch={dispatch}
        canUndo={canUndo}
        canRedo={canRedo}
        showSearch={showSearch}
        onToggleSearch={toggleSearch}
        onCloseSearch={closeSearch}
        searchInputRef={searchInputRef}
      />
      <VirtualGrid
        state={state}
        sortedRows={sortedRows}
        sortedToSourceMap={sortedToSourceMap}
        dispatch={dispatch}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <ContextMenu menu={state.contextMenu} sortedToSourceMap={sortedToSourceMap} dispatch={dispatch} />
    </div>
  );
}
