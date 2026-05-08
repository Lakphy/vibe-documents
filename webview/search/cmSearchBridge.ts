import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { StateEffect, StateField, type Extension, type EditorState, RangeSetBuilder } from '@codemirror/state';
import { buildSearchRegex } from './regexUtils';

export interface CmSearchQuery {
  search: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export interface CmMatch {
  from: number;
  to: number;
}

const setSearchQuery = StateEffect.define<CmSearchQuery>();
const setCurrentMatch = StateEffect.define<number>();

function computeMatches(state: EditorState, query: CmSearchQuery): CmMatch[] {
  const regex = buildSearchRegex(query.search, query);
  if (!regex) return [];

  const text = state.doc.toString();
  const matches: CmMatch[] = [];
  let m: RegExpExecArray | null;
  let iterations = 0;
  while ((m = regex.exec(text)) !== null && iterations < 50000) {
    iterations++;
    if (m[0].length === 0) { regex.lastIndex++; continue; }
    matches.push({ from: m.index, to: m.index + m[0].length });
  }
  return matches;
}

interface SearchState {
  query: CmSearchQuery;
  matches: CmMatch[];
  currentIndex: number;
}

const emptyQuery: CmSearchQuery = { search: '', caseSensitive: false, wholeWord: false, useRegex: false };

const searchStateField = StateField.define<SearchState>({
  create() {
    return { query: emptyQuery, matches: [], currentIndex: -1 };
  },
  update(value, tr) {
    let changed = false;
    let newQuery = value.query;
    let newIndex = value.currentIndex;

    for (const e of tr.effects) {
      if (e.is(setSearchQuery)) {
        newQuery = e.value;
        changed = true;
      }
      if (e.is(setCurrentMatch)) {
        newIndex = e.value;
      }
    }

    if (changed || tr.docChanged) {
      const matches = computeMatches(tr.state, newQuery);
      const idx = matches.length === 0 ? -1 : Math.min(newIndex, matches.length - 1);
      return { query: newQuery, matches, currentIndex: Math.max(idx, matches.length > 0 ? 0 : -1) };
    }

    if (newIndex !== value.currentIndex) {
      return { ...value, currentIndex: newIndex };
    }

    return value;
  },
});

const matchMark = Decoration.mark({ class: 'cm-vd-search-match' });
const currentMark = Decoration.mark({ class: 'cm-vd-search-match cm-vd-search-current' });

function buildDecorations(state: EditorState): DecorationSet {
  const { matches, currentIndex } = state.field(searchStateField);
  if (matches.length === 0) return Decoration.none;

  const builder = new RangeSetBuilder<Decoration>();
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (m.from >= state.doc.length) continue;
    const to = Math.min(m.to, state.doc.length);
    builder.add(m.from, to, i === currentIndex ? currentMark : matchMark);
  }
  return builder.finish();
}

const searchDecoPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.transactions.some(t => t.effects.some(e => e.is(setSearchQuery) || e.is(setCurrentMatch)))) {
        this.decorations = buildDecorations(update.state);
      }
    }
  },
  { decorations: v => v.decorations },
);

export function createSearchExtension(): Extension {
  return [searchStateField, searchDecoPlugin];
}

export function setQuery(view: EditorView, query: CmSearchQuery): void {
  view.dispatch({ effects: setSearchQuery.of(query) });
}

export function getSearchState(state: EditorState): SearchState {
  return state.field(searchStateField);
}

export function getMatches(state: EditorState): CmMatch[] {
  return state.field(searchStateField).matches;
}

export function getCurrentIndex(state: EditorState): number {
  return state.field(searchStateField).currentIndex;
}

export function navigateMatch(view: EditorView, direction: 'next' | 'prev'): number {
  const { matches, currentIndex } = view.state.field(searchStateField);
  if (matches.length === 0) return -1;

  let newIndex: number;
  if (direction === 'next') {
    newIndex = currentIndex + 1 >= matches.length ? 0 : currentIndex + 1;
  } else {
    newIndex = currentIndex - 1 < 0 ? matches.length - 1 : currentIndex - 1;
  }

  const match = matches[newIndex];
  view.dispatch({
    effects: setCurrentMatch.of(newIndex),
    selection: { anchor: match.from, head: match.to },
    scrollIntoView: true,
  });

  return newIndex;
}

export function replaceMatch(view: EditorView, replacement: string): void {
  const { matches, currentIndex } = view.state.field(searchStateField);
  if (currentIndex < 0 || currentIndex >= matches.length) return;
  const match = matches[currentIndex];

  view.dispatch({
    changes: { from: match.from, to: match.to, insert: replacement },
  });
}

export function replaceAllMatches(view: EditorView, replacement: string): void {
  const { matches } = view.state.field(searchStateField);
  if (matches.length === 0) return;

  const changes = [...matches].reverse().map(m => ({
    from: m.from,
    to: m.to,
    insert: replacement,
  }));

  view.dispatch({ changes });
}
