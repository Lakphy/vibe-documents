import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyHighlights, clearHighlights, scrollToMatch } from '../search/domHighlighter';
import type { MatchRange } from '../search/domHighlighter';

describe('domHighlighter - with CSS.highlights mock', () => {
  let highlightsMap: Map<string, any>;

  beforeEach(() => {
    highlightsMap = new Map();
    (globalThis as any).CSS = { highlights: highlightsMap };
    (globalThis as any).Highlight = class {
      ranges: AbstractRange[];
      constructor(...ranges: AbstractRange[]) {
        this.ranges = ranges;
      }
    };
  });

  it('applyHighlights 将所有 ranges 设置到 match key', () => {
    const r1 = document.createRange();
    const r2 = document.createRange();
    const matches: MatchRange[] = [{ ranges: [r1] }, { ranges: [r2] }];
    applyHighlights(matches, -1);
    expect(highlightsMap.has('vd-search-match')).toBe(true);
    expect(highlightsMap.has('vd-search-current')).toBe(false);
  });

  it('applyHighlights 设置 current 高亮', () => {
    const r = document.createRange();
    const matches: MatchRange[] = [{ ranges: [r] }];
    applyHighlights(matches, 0);
    expect(highlightsMap.has('vd-search-current')).toBe(true);
  });

  it('applyHighlights 索引越界时仅清除 current', () => {
    const r = document.createRange();
    const matches: MatchRange[] = [{ ranges: [r] }];
    applyHighlights(matches, 5);
    expect(highlightsMap.has('vd-search-match')).toBe(true);
    expect(highlightsMap.has('vd-search-current')).toBe(false);
  });

  it('clearHighlights 删除两个 key', () => {
    highlightsMap.set('vd-search-match', {});
    highlightsMap.set('vd-search-current', {});
    clearHighlights();
    expect(highlightsMap.size).toBe(0);
  });
});

describe('scrollToMatch', () => {
  it('当 range 在视口外时调用 scrollIntoView', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);
    const scrollSpy = vi.fn();
    (div as any).scrollIntoView = scrollSpy;

    const textNode = div.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, textNode.length);

    // 强制 getBoundingClientRect 返回视口外位置
    range.getBoundingClientRect = vi.fn(() => ({
      top: -100,
      bottom: -90,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as any;

    scrollToMatch({ ranges: [range] });
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('当 range 在视口内时不调用 scrollIntoView', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);
    const scrollSpy = vi.fn();
    (div as any).scrollIntoView = scrollSpy;

    const textNode = div.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, textNode.length);

    range.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      bottom: 200,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as any;

    scrollToMatch({ ranges: [range] });
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
