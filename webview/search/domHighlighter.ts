import { buildSearchRegex, type RegexOptions } from './regexUtils';

export type SearchOptions = RegexOptions;

export interface MatchRange {
  ranges: Range[];
}

interface TextSegment {
  node: Text;
  start: number;
  length: number;
}

function collectTextSegments(root: Element): { text: string; segments: TextSegment[] } {
  const segments: TextSegment[] = [];
  const chunks: string[] = [];
  let textLength = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const len = node.data.length;
    if (len === 0) continue;
    segments.push({ node, start: textLength, length: len });
    chunks.push(node.data);
    textLength += len;
  }
  return { text: chunks.join(''), segments };
}

function mapToRanges(from: number, to: number, segments: TextSegment[]): Range[] {
  const ranges: Range[] = [];
  for (const seg of segments) {
    const segEnd = seg.start + seg.length;
    if (segEnd <= from) continue;
    if (seg.start >= to) break;

    const rangeStart = Math.max(from, seg.start) - seg.start;
    const rangeEnd = Math.min(to, segEnd) - seg.start;

    const r = document.createRange();
    r.setStart(seg.node, rangeStart);
    r.setEnd(seg.node, rangeEnd);
    ranges.push(r);
  }
  return ranges;
}

export function findMatches(
  container: Element,
  query: string,
  options: SearchOptions,
): MatchRange[] {
  const regex = buildSearchRegex(query, options);
  if (!regex) return [];

  const { text, segments } = collectTextSegments(container);
  if (!text) return [];

  const matches: MatchRange[] = [];
  let m: RegExpExecArray | null;
  let iterations = 0;
  while ((m = regex.exec(text)) !== null && iterations < 50000) {
    iterations++;
    if (m[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    const from = m.index;
    const to = from + m[0].length;
    const ranges = mapToRanges(from, to, segments);
    if (ranges.length > 0) {
      matches.push({ ranges });
    }
  }
  return matches;
}

const MATCH_KEY = 'vd-search-match';
const CURRENT_KEY = 'vd-search-current';

function getHighlights(): Map<string, any> | null {
  const css = globalThis.CSS as any;
  if (css && 'highlights' in css) return css.highlights;
  return null;
}

function createHighlight(...ranges: AbstractRange[]): any {
  return new (globalThis as any).Highlight(...ranges);
}

export function applyHighlights(matches: MatchRange[], currentIndex: number): void {
  const highlights = getHighlights();
  if (!highlights) return;

  const allRanges: AbstractRange[] = [];
  for (const m of matches) {
    for (const r of m.ranges) allRanges.push(r);
  }

  highlights.set(MATCH_KEY, createHighlight(...allRanges));

  if (currentIndex >= 0 && currentIndex < matches.length) {
    const current = matches[currentIndex];
    highlights.set(CURRENT_KEY, createHighlight(...current.ranges));
  } else {
    highlights.delete(CURRENT_KEY);
  }
}

export function clearHighlights(): void {
  const highlights = getHighlights();
  if (!highlights) return;
  highlights.delete(MATCH_KEY);
  highlights.delete(CURRENT_KEY);
}

export function scrollToMatch(match: MatchRange): void {
  if (match.ranges.length === 0) return;
  const firstRange = match.ranges[0];
  const el = firstRange.startContainer.parentElement;
  if (!el || typeof el.scrollIntoView !== 'function') return;

  if (typeof firstRange.getBoundingClientRect !== 'function') {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }

  const rect = firstRange.getBoundingClientRect();
  const viewportH = window.innerHeight;

  if (rect.top < 60 || rect.bottom > viewportH - 20) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
