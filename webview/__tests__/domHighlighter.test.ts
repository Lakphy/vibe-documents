import { describe, it, expect, beforeEach } from 'vitest';
import { findMatches, applyHighlights, clearHighlights, scrollToMatch } from '../search/domHighlighter';
import type { SearchOptions, MatchRange } from '../search/domHighlighter';

function makeContainer(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

const defaultOpts: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
};

describe('findMatches', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('空查询返回空数组', () => {
    container = makeContainer('<p>hello world</p>');
    expect(findMatches(container, '', defaultOpts)).toEqual([]);
  });

  it('匹配单个文本节点中的单个结果', () => {
    container = makeContainer('<p>hello world</p>');
    const matches = findMatches(container, 'world', defaultOpts);
    expect(matches).toHaveLength(1);
    expect(matches[0].ranges).toHaveLength(1);
    expect(matches[0].ranges[0].toString()).toBe('world');
  });

  it('匹配多个结果', () => {
    container = makeContainer('<p>foo bar foo baz foo</p>');
    const matches = findMatches(container, 'foo', defaultOpts);
    expect(matches).toHaveLength(3);
    matches.forEach(m => {
      expect(m.ranges[0].toString()).toBe('foo');
    });
  });

  it('默认大小写不敏感', () => {
    container = makeContainer('<p>Hello HELLO hello</p>');
    const matches = findMatches(container, 'hello', defaultOpts);
    expect(matches).toHaveLength(3);
  });

  it('大小写敏感模式', () => {
    container = makeContainer('<p>Hello HELLO hello</p>');
    const matches = findMatches(container, 'hello', {
      ...defaultOpts,
      caseSensitive: true,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].ranges[0].toString()).toBe('hello');
  });

  it('全词匹配模式', () => {
    container = makeContainer('<p>foobar foo bar</p>');
    const matches = findMatches(container, 'foo', {
      ...defaultOpts,
      wholeWord: true,
    });
    expect(matches).toHaveLength(1);
    expect(matches[0].ranges[0].toString()).toBe('foo');
  });

  it('正则模式', () => {
    container = makeContainer('<p>cat bat hat mat</p>');
    const matches = findMatches(container, '[cbh]at', {
      ...defaultOpts,
      useRegex: true,
    });
    expect(matches).toHaveLength(3);
  });

  it('无效正则返回空数组', () => {
    container = makeContainer('<p>hello</p>');
    const matches = findMatches(container, '[invalid', {
      ...defaultOpts,
      useRegex: true,
    });
    expect(matches).toEqual([]);
  });

  it('跨多个文本节点匹配', () => {
    container = makeContainer('<p><em>hel</em>lo world</p>');
    const matches = findMatches(container, 'hello', defaultOpts);
    expect(matches).toHaveLength(1);
    // 跨节点匹配会产生多个 Range
    expect(matches[0].ranges.length).toBeGreaterThanOrEqual(1);
  });

  it('对特殊正则字符进行转义（非正则模式）', () => {
    container = makeContainer('<p>price is $100.00 total</p>');
    const matches = findMatches(container, '$100.00', defaultOpts);
    expect(matches).toHaveLength(1);
  });

  it('空容器返回空结果', () => {
    container = makeContainer('');
    const matches = findMatches(container, 'test', defaultOpts);
    expect(matches).toEqual([]);
  });

  it('多个嵌套 DOM 元素中的匹配', () => {
    container = makeContainer('<div><p>alpha</p><p>beta</p><p>alpha</p></div>');
    const matches = findMatches(container, 'alpha', defaultOpts);
    expect(matches).toHaveLength(2);
  });

  it('零宽正则匹配不会陷入死循环（lastIndex 自增）', () => {
    container = makeContainer('<p>abc</p>');
    // \b 是零宽匹配，依赖 lastIndex++ 续行
    const matches = findMatches(container, '\\b', { caseSensitive: true, wholeWord: false, useRegex: true });
    expect(Array.isArray(matches)).toBe(true);
  });
});

describe('applyHighlights', () => {
  it('无 CSS.highlights API 时不抛错', () => {
    const mockRange = document.createRange();
    const matches: MatchRange[] = [{ ranges: [mockRange] }];
    expect(() => applyHighlights(matches, 0)).not.toThrow();
  });
});

describe('clearHighlights', () => {
  it('无 CSS.highlights API 时不抛错', () => {
    expect(() => clearHighlights()).not.toThrow();
  });
});

describe('scrollToMatch', () => {
  it('空 ranges 不抛错', () => {
    expect(() => scrollToMatch({ ranges: [] })).not.toThrow();
  });
});
