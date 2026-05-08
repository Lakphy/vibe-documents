import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  createSearchExtension,
  setQuery,
  getMatches,
  getCurrentIndex,
  navigateMatch,
  replaceMatch,
  replaceAllMatches,
} from '../search/cmSearchBridge';

function createView(doc: string): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [createSearchExtension()],
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  return new EditorView({ state, parent: container });
}

describe('cmSearchBridge', () => {
  let view: EditorView;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    view?.destroy();
  });

  describe('createSearchExtension + setQuery', () => {
    it('初始状态无匹配', () => {
      view = createView('hello world');
      expect(getMatches(view.state)).toEqual([]);
      expect(getCurrentIndex(view.state)).toBe(-1);
    });

    it('设置查询后找到匹配', () => {
      view = createView('hello world hello');
      setQuery(view, { search: 'hello', caseSensitive: false, wholeWord: false, useRegex: false });
      const matches = getMatches(view.state);
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ from: 0, to: 5 });
      expect(matches[1]).toEqual({ from: 12, to: 17 });
    });

    it('大小写不敏感搜索', () => {
      view = createView('Hello HELLO hello');
      setQuery(view, { search: 'hello', caseSensitive: false, wholeWord: false, useRegex: false });
      expect(getMatches(view.state)).toHaveLength(3);
    });

    it('大小写敏感搜索', () => {
      view = createView('Hello HELLO hello');
      setQuery(view, { search: 'hello', caseSensitive: true, wholeWord: false, useRegex: false });
      const matches = getMatches(view.state);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ from: 12, to: 17 });
    });

    it('全词匹配', () => {
      view = createView('foobar foo bar');
      setQuery(view, { search: 'foo', caseSensitive: false, wholeWord: true, useRegex: false });
      const matches = getMatches(view.state);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toEqual({ from: 7, to: 10 });
    });

    it('正则搜索', () => {
      view = createView('cat bat hat mat');
      setQuery(view, { search: '[cbh]at', caseSensitive: false, wholeWord: false, useRegex: true });
      expect(getMatches(view.state)).toHaveLength(3);
    });

    it('无效正则返回空匹配', () => {
      view = createView('hello');
      setQuery(view, { search: '[invalid', caseSensitive: false, wholeWord: false, useRegex: true });
      expect(getMatches(view.state)).toEqual([]);
    });

    it('空查询返回空匹配', () => {
      view = createView('hello');
      setQuery(view, { search: '', caseSensitive: false, wholeWord: false, useRegex: false });
      expect(getMatches(view.state)).toEqual([]);
    });

    it('设置查询后 currentIndex 初始为 0', () => {
      view = createView('aaa');
      setQuery(view, { search: 'a', caseSensitive: false, wholeWord: false, useRegex: false });
      expect(getCurrentIndex(view.state)).toBe(0);
    });
  });

  describe('navigateMatch', () => {
    it('next 从 0 前进到 1', () => {
      view = createView('aa bb aa');
      setQuery(view, { search: 'aa', caseSensitive: false, wholeWord: false, useRegex: false });
      expect(getCurrentIndex(view.state)).toBe(0);

      const idx = navigateMatch(view, 'next');
      expect(idx).toBe(1);
      expect(getCurrentIndex(view.state)).toBe(1);
    });

    it('next 在末尾回绕到 0', () => {
      view = createView('x y x');
      setQuery(view, { search: 'x', caseSensitive: false, wholeWord: false, useRegex: false });
      navigateMatch(view, 'next'); // 0 -> 1
      const idx = navigateMatch(view, 'next'); // 1 -> 0 (wrap)
      expect(idx).toBe(0);
    });

    it('prev 从 0 回绕到末尾', () => {
      view = createView('a b a b a');
      setQuery(view, { search: 'a', caseSensitive: false, wholeWord: false, useRegex: false });
      const idx = navigateMatch(view, 'prev'); // 0 -> 2 (last)
      expect(idx).toBe(2);
    });

    it('无匹配时返回 -1', () => {
      view = createView('hello');
      setQuery(view, { search: 'xyz', caseSensitive: false, wholeWord: false, useRegex: false });
      const idx = navigateMatch(view, 'next');
      expect(idx).toBe(-1);
    });
  });

  describe('replaceMatch', () => {
    it('替换当前匹配', () => {
      view = createView('foo bar foo');
      setQuery(view, { search: 'foo', caseSensitive: false, wholeWord: false, useRegex: false });
      replaceMatch(view, 'baz');
      expect(view.state.doc.toString()).toBe('baz bar foo');
    });

    it('无匹配时替换不报错', () => {
      view = createView('hello');
      setQuery(view, { search: 'xyz', caseSensitive: false, wholeWord: false, useRegex: false });
      expect(() => replaceMatch(view, 'baz')).not.toThrow();
      expect(view.state.doc.toString()).toBe('hello');
    });
  });

  describe('replaceAllMatches', () => {
    it('替换所有匹配', () => {
      view = createView('foo bar foo baz foo');
      setQuery(view, { search: 'foo', caseSensitive: false, wholeWord: false, useRegex: false });
      replaceAllMatches(view, 'x');
      expect(view.state.doc.toString()).toBe('x bar x baz x');
    });

    it('无匹配时替换不报错', () => {
      view = createView('hello');
      setQuery(view, { search: 'xyz', caseSensitive: false, wholeWord: false, useRegex: false });
      expect(() => replaceAllMatches(view, 'baz')).not.toThrow();
      expect(view.state.doc.toString()).toBe('hello');
    });
  });

  describe('文档变更后自动更新匹配', () => {
    it('编辑文档后匹配数量更新', () => {
      view = createView('foo bar');
      setQuery(view, { search: 'foo', caseSensitive: false, wholeWord: false, useRegex: false });
      expect(getMatches(view.state)).toHaveLength(1);

      view.dispatch({
        changes: { from: view.state.doc.length, insert: ' foo' },
      });
      expect(getMatches(view.state)).toHaveLength(2);
    });
  });
});
