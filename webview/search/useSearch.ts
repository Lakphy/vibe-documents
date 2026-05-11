import { useState, useCallback, useRef, useEffect } from 'react';
import type { EditorMode } from '../Toolbar';
import {
  findMatches,
  applyHighlights,
  clearHighlights,
  scrollToMatch,
  type MatchRange,
  type SearchOptions,
} from './domHighlighter';

export interface SearchState {
  isOpen: boolean;
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  matchCount: number;
  currentIndex: number;
}

export interface SearchActions {
  open: () => void;
  close: () => void;
  setQuery: (q: string) => void;
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  toggleRegex: () => void;
  findNext: () => void;
  findPrev: () => void;
}

export function useSearch(
  mode: EditorMode,
  contentContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [state, setState] = useState<SearchState>({
    isOpen: false,
    query: '',
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    matchCount: 0,
    currentIndex: -1,
  });

  const domMatchesRef = useRef<MatchRange[]>([]);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchParamsRef = useRef(state);

  const getSearchContainer = useCallback((): Element | null => {
    if (!contentContainerRef.current) return null;

    if (mode === 'preview') {
      return contentContainerRef.current.querySelector('.markdown-section') ??
             contentContainerRef.current;
    }
    return contentContainerRef.current.querySelector('.ProseMirror') ??
           contentContainerRef.current;
  }, [mode, contentContainerRef]);

  const executeSearch = useCallback((
    query: string,
    options: SearchOptions,
    newIndex?: number,
  ) => {
    const container = getSearchContainer();
    if (!container) {
      domMatchesRef.current = [];
      clearHighlights();
      setState(prev => ({ ...prev, matchCount: 0, currentIndex: -1 }));
      return;
    }

    const matches = query ? findMatches(container, query, options) : [];
    domMatchesRef.current = matches;

    const idx = matches.length > 0
      ? Math.min(newIndex ?? 0, matches.length - 1)
      : -1;

    applyHighlights(matches, idx);
    if (idx >= 0) scrollToMatch(matches[idx]);

    setState(prev => ({
      ...prev,
      matchCount: matches.length,
      currentIndex: idx,
    }));
  }, [getSearchContainer]);

  searchParamsRef.current = state;

  useEffect(() => {
    const params = searchParamsRef.current;
    if (params.isOpen && params.query) {
      const timer = setTimeout(() => {
        executeSearch(params.query, {
          caseSensitive: params.caseSensitive,
          wholeWord: params.wholeWord,
          useRegex: params.useRegex,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mode, executeSearch]);

  const open = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      matchCount: 0,
      currentIndex: -1,
    }));
    domMatchesRef.current = [];
    clearHighlights();
  }, []);

  const setQueryText = useCallback((q: string) => {
    setState(prev => ({ ...prev, query: q }));
    executeSearch(q, {
      caseSensitive: state.caseSensitive,
      wholeWord: state.wholeWord,
      useRegex: state.useRegex,
    });
  }, [executeSearch, state.caseSensitive, state.wholeWord, state.useRegex]);

  const toggleCaseSensitive = useCallback(() => {
    setState(prev => {
      const next = { ...prev, caseSensitive: !prev.caseSensitive };
      executeSearch(prev.query, {
        caseSensitive: next.caseSensitive,
        wholeWord: prev.wholeWord,
        useRegex: prev.useRegex,
      });
      return next;
    });
  }, [executeSearch]);

  const toggleWholeWord = useCallback(() => {
    setState(prev => {
      const next = { ...prev, wholeWord: !prev.wholeWord };
      executeSearch(prev.query, {
        caseSensitive: prev.caseSensitive,
        wholeWord: next.wholeWord,
        useRegex: prev.useRegex,
      });
      return next;
    });
  }, [executeSearch]);

  const toggleRegex = useCallback(() => {
    setState(prev => {
      const next = { ...prev, useRegex: !prev.useRegex };
      executeSearch(prev.query, {
        caseSensitive: prev.caseSensitive,
        wholeWord: prev.wholeWord,
        useRegex: next.useRegex,
      });
      return next;
    });
  }, [executeSearch]);

  const findNext = useCallback(() => {
    const matches = domMatchesRef.current;
    if (matches.length === 0) return;
    setState(prev => {
      const newIdx = prev.currentIndex + 1 >= matches.length ? 0 : prev.currentIndex + 1;
      applyHighlights(matches, newIdx);
      scrollToMatch(matches[newIdx]);
      return { ...prev, currentIndex: newIdx };
    });
  }, []);

  const findPrev = useCallback(() => {
    const matches = domMatchesRef.current;
    if (matches.length === 0) return;
    setState(prev => {
      const newIdx = prev.currentIndex - 1 < 0 ? matches.length - 1 : prev.currentIndex - 1;
      applyHighlights(matches, newIdx);
      scrollToMatch(matches[newIdx]);
      return { ...prev, currentIndex: newIdx };
    });
  }, []);

  const actions: SearchActions = {
    open,
    close,
    setQuery: setQueryText,
    toggleCaseSensitive,
    toggleWholeWord,
    toggleRegex,
    findNext,
    findPrev,
  };

  return { state, actions, searchInputRef };
}
