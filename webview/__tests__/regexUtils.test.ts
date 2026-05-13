import { describe, it, expect } from 'vitest';
import { escapeRegExp, buildSearchRegex } from '../search/regexUtils';

describe('escapeRegExp', () => {
  it('转义所有特殊字符', () => {
    const input = '.*+?^${}()|[]\\';
    const escaped = escapeRegExp(input);
    expect(new RegExp(escaped).test(input)).toBe(true);
  });

  it('普通字符串原样返回', () => {
    expect(escapeRegExp('hello world')).toBe('hello world');
  });

  it('空字符串返回空字符串', () => {
    expect(escapeRegExp('')).toBe('');
  });

  it('转义后的模式精确匹配源字符串', () => {
    const literal = 'a.b*c+d';
    const re = new RegExp(escapeRegExp(literal));
    expect(re.test('a.b*c+d')).toBe(true);
    expect(re.test('aXbXcXd')).toBe(false);
  });
});

describe('buildSearchRegex', () => {
  it('空 query 返回 null', () => {
    expect(buildSearchRegex('', { caseSensitive: false, wholeWord: false, useRegex: false })).toBeNull();
  });

  it('默认大小写不敏感（gi flags）', () => {
    const re = buildSearchRegex('foo', { caseSensitive: false, wholeWord: false, useRegex: false });
    expect(re).toBeInstanceOf(RegExp);
    expect(re!.flags).toBe('gi');
  });

  it('caseSensitive 时仅 g flag', () => {
    const re = buildSearchRegex('foo', { caseSensitive: true, wholeWord: false, useRegex: false });
    expect(re!.flags).toBe('g');
  });

  it('非正则模式自动转义', () => {
    const re = buildSearchRegex('a.b', { caseSensitive: false, wholeWord: false, useRegex: false });
    expect(re!.test('a.b')).toBe(true);
    re!.lastIndex = 0;
    expect(re!.test('aXb')).toBe(false);
  });

  it('useRegex 模式不转义', () => {
    const re = buildSearchRegex('a.b', { caseSensitive: false, wholeWord: false, useRegex: true });
    expect(re!.test('aXb')).toBe(true);
  });

  it('wholeWord 包裹 \\b', () => {
    const re = buildSearchRegex('foo', { caseSensitive: false, wholeWord: true, useRegex: false });
    expect(re!.test('foo bar')).toBe(true);
    re!.lastIndex = 0;
    expect(re!.test('foobar')).toBe(false);
  });

  it('无效正则返回 null', () => {
    expect(buildSearchRegex('[invalid', { caseSensitive: false, wholeWord: false, useRegex: true })).toBeNull();
  });

  it('wholeWord 配合 useRegex', () => {
    const re = buildSearchRegex('\\d+', { caseSensitive: false, wholeWord: true, useRegex: true });
    expect(re!.test('age 42')).toBe(true);
  });
});
