import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCsvStore } from '../csv/store';

describe('useCsvStore - branch coverage', () => {
  const sampleCsv = 'a,b,c\n1,2,3\n4,5,6\n7,8,9';

  it('DELETE_ROW 在仅剩 1 行时不变', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a,b\n1,2'));
    const before = result.current.state.rows;
    act(() => result.current.dispatch({ type: 'DELETE_ROW', at: 0 }));
    expect(result.current.state.rows).toEqual(before);
  });

  it('DELETE_COL 在仅剩 1 列时不变', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a\n1\n2'));
    const before = result.current.state.headers;
    act(() => result.current.dispatch({ type: 'DELETE_COL', at: 0 }));
    expect(result.current.state.headers).toEqual(before);
  });

  it('UNDO 回到上一个状态', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'X' }));
    expect(result.current.state.rows[0][0]).toBe('X');
    act(() => result.current.dispatch({ type: 'UNDO' }));
    expect(result.current.state.rows[0][0]).toBe('1');
  });

  it('REDO 恢复被撤销的状态', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'X' }));
    act(() => result.current.dispatch({ type: 'UNDO' }));
    act(() => result.current.dispatch({ type: 'REDO' }));
    expect(result.current.state.rows[0][0]).toBe('X');
  });

  it('REPLACE_CURRENT 替换当前匹配并更新匹配列表', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('h\nfoo\nfoo'));
    act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'foo', replaceText: 'bar' } }));
    expect(result.current.state.search.matches.length).toBe(2);
    act(() => result.current.dispatch({ type: 'REPLACE_CURRENT' }));
    expect(result.current.state.rows[0][0]).toBe('bar');
    expect(result.current.state.search.matches.length).toBe(1);
  });

  it('REPLACE_CURRENT 在无匹配时不变', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('h\nfoo'));
    const before = result.current.state.rows;
    act(() => result.current.dispatch({ type: 'REPLACE_CURRENT' }));
    expect(result.current.state.rows).toEqual(before);
  });

  it('REPLACE_ALL 替换所有匹配', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('h\nfoo\nfoo\nbar'));
    act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'foo', replaceText: 'X' } }));
    act(() => result.current.dispatch({ type: 'REPLACE_ALL' }));
    expect(result.current.state.rows[0][0]).toBe('X');
    expect(result.current.state.rows[1][0]).toBe('X');
    expect(result.current.state.rows[2][0]).toBe('bar');
    expect(result.current.state.search.matches.length).toBe(0);
  });

  it('REPLACE_ALL 在 query 为空时不变', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('h\nfoo'));
    const before = result.current.state.rows;
    act(() => result.current.dispatch({ type: 'REPLACE_ALL' }));
    expect(result.current.state.rows).toEqual(before);
  });

  it('MOVE_ROW 移动行并清除排序', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: 0, direction: 'asc' } }));
    act(() => result.current.dispatch({ type: 'MOVE_ROW', from: 0, to: 2 }));
    expect(result.current.state.rows[2]).toEqual(['1', '2', '3']);
    expect(result.current.state.sort.direction).toBeNull();
  });

  it('MOVE_ROW from === to 时不变', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    const before = result.current.state.rows;
    act(() => result.current.dispatch({ type: 'MOVE_ROW', from: 1, to: 1 }));
    expect(result.current.state.rows).toBe(before);
  });

  it('MOVE_COL 同时移动表头和列宽', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    act(() => result.current.dispatch({ type: 'SET_COLUMN_WIDTH', col: 0, width: 200 }));
    act(() => result.current.dispatch({ type: 'MOVE_COL', from: 0, to: 2 }));
    expect(result.current.state.headers).toEqual(['b', 'c', 'a']);
    expect(result.current.state.rows[0]).toEqual(['2', '3', '1']);
    expect(result.current.state.columnWidths[2]).toBe(200);
  });

  it('MOVE_COL from === to 时不变', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    const before = result.current.state.headers;
    act(() => result.current.dispatch({ type: 'MOVE_COL', from: 1, to: 1 }));
    expect(result.current.state.headers).toBe(before);
  });

  it('PASTE_CELLS 超出当前行时自动扩展', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a,b\n1,2'));
    act(() =>
      result.current.dispatch({
        type: 'PASTE_CELLS',
        startRow: 0,
        startCol: 0,
        data: [['X', 'Y'], ['Z', 'W'], ['P', 'Q']],
      })
    );
    expect(result.current.state.rows.length).toBe(3);
    expect(result.current.state.rows[2]).toEqual(['P', 'Q']);
  });

  it('PASTE_CELLS 超出列数时忽略多余列', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a,b\n1,2'));
    act(() =>
      result.current.dispatch({
        type: 'PASTE_CELLS',
        startRow: 0,
        startCol: 1,
        data: [['X', 'Y', 'Z']],
      })
    );
    expect(result.current.state.rows[0]).toEqual(['1', 'X']);
  });

  it('SET_EDITING_CELL 设置正在编辑的单元格', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    act(() => result.current.dispatch({ type: 'SET_EDITING_CELL', cell: { row: 0, col: 1 } }));
    expect(result.current.state.editingCell).toEqual({ row: 0, col: 1 });
  });

  it('SET_SELECTION 设置选区', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    const sel = { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } };
    act(() => result.current.dispatch({ type: 'SET_SELECTION', selection: sel }));
    expect(result.current.state.selection).toEqual(sel);
  });

  it('SET_COLUMN_WIDTH 更新单列宽度', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    act(() => result.current.dispatch({ type: 'SET_COLUMN_WIDTH', col: 1, width: 300 }));
    expect(result.current.state.columnWidths[1]).toBe(300);
  });

  it('SET_CONTEXT_MENU 显示/隐藏右键菜单', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent(sampleCsv));
    act(() =>
      result.current.dispatch({
        type: 'SET_CONTEXT_MENU',
        menu: { visible: true, x: 10, y: 20, targetCell: { row: 0, col: 0 } },
      })
    );
    expect(result.current.state.contextMenu.visible).toBe(true);
    expect(result.current.state.contextMenu.targetCell).toEqual({ row: 0, col: 0 });
  });

  it('SET_CELL 增量维护搜索匹配并夹紧当前索引', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a,b\nfoo,x\nbar,y\nbaz,z'));
    act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'ba' } }));
    act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { currentMatchIndex: 1 } }));

    act(() => result.current.dispatch({ type: 'SET_CELL', row: 1, col: 0, value: 'nope' }));

    expect(result.current.state.search.matches).toEqual([{ row: 2, col: 0 }]);
    expect(result.current.state.search.currentMatchIndex).toBe(0);

    act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 1, value: 'BAX' }));

    expect(result.current.state.search.matches).toEqual([
      { row: 0, col: 1 },
      { row: 2, col: 0 },
    ]);
  });

  it('结构性编辑后根据最新行列重新计算搜索匹配', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a,b\nkeep,target\nmove,no'));
    act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'target' } }));

    act(() => result.current.dispatch({ type: 'INSERT_ROW', at: 0 }));
    expect(result.current.state.search.matches).toEqual([{ row: 1, col: 1 }]);

    act(() => result.current.dispatch({ type: 'DELETE_COL', at: 0 }));
    expect(result.current.state.search.matches).toEqual([{ row: 1, col: 0 }]);

    act(() => result.current.dispatch({
      type: 'PASTE_CELLS',
      startRow: 0,
      startCol: 0,
      data: [['target']],
    }));
    expect(result.current.state.search.matches).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);

    act(() => result.current.dispatch({ type: 'MOVE_ROW', from: 1, to: 0 }));
    expect(result.current.state.search.matches).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ]);
  });

  it('SET_DATA 会保留搜索词并刷新外部内容中的匹配', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a,b\nold,value'));
    act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'new' } }));
    expect(result.current.state.search.matches).toEqual([]);

    act(() => result.current.initFromContent('a,b\nnew,value\nother,new'));

    expect(result.current.state.search.matches).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(result.current.state.search.currentMatchIndex).toBe(0);
  });

  it('排序数字列时空值视为字符串排序', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('h\n10\n\n5'));
    act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: 0, direction: 'asc' } }));
    expect(result.current.state.rows.length).toBe(3);
  });

  it('UNDO 无历史时不报错', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a\n1'));
    expect(() => act(() => result.current.dispatch({ type: 'UNDO' }))).not.toThrow();
  });

  it('REDO 无可重做记录时不报错', () => {
    const { result } = renderHook(() => useCsvStore(''));
    act(() => result.current.initFromContent('a\n1'));
    expect(() => act(() => result.current.dispatch({ type: 'REDO' }))).not.toThrow();
  });
});
