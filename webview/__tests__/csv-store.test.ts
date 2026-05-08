import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCsvStore } from '../csv/store';

describe('useCsvStore', () => {
  const sampleCsv = 'name,age,city\nAlice,30,NYC\nBob,25,LA\nCharlie,35,SF';

  describe('初始化', () => {
    it('initFromContent 正确解析 CSV', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      expect(result.current.state.headers).toEqual(['name', 'age', 'city']);
      expect(result.current.state.rows.length).toBe(3);
      expect(result.current.state.rows[0]).toEqual(['Alice', '30', 'NYC']);
    });

    it('初始化后列宽已设置', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      expect(result.current.state.columnWidths[0]).toBeDefined();
      expect(result.current.state.columnWidths[1]).toBeDefined();
      expect(result.current.state.columnWidths[2]).toBeDefined();
    });
  });

  describe('SET_CELL', () => {
    it('修改指定单元格', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 1, value: '31' }));

      expect(result.current.state.rows[0][1]).toBe('31');
    });

    it('不影响其他单元格', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 1, value: '31' }));

      expect(result.current.state.rows[0][0]).toBe('Alice');
      expect(result.current.state.rows[1][1]).toBe('25');
    });
  });

  describe('INSERT_ROW / DELETE_ROW', () => {
    it('在指定位置插入空行', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'INSERT_ROW', at: 1 }));

      expect(result.current.state.rows.length).toBe(4);
      expect(result.current.state.rows[1]).toEqual(['', '', '']);
      expect(result.current.state.rows[2]).toEqual(['Bob', '25', 'LA']);
    });

    it('删除指定行', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'DELETE_ROW', at: 1 }));

      expect(result.current.state.rows.length).toBe(2);
      expect(result.current.state.rows[0]).toEqual(['Alice', '30', 'NYC']);
      expect(result.current.state.rows[1]).toEqual(['Charlie', '35', 'SF']);
    });
  });

  describe('INSERT_COL / DELETE_COL', () => {
    it('在指定位置插入列', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'INSERT_COL', at: 1 }));

      expect(result.current.state.headers.length).toBe(4);
      expect(result.current.state.headers[1]).toContain('Column');
      expect(result.current.state.rows[0][1]).toBe('');
      expect(result.current.state.rows[0][2]).toBe('30');
    });

    it('删除指定列', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'DELETE_COL', at: 1 }));

      expect(result.current.state.headers).toEqual(['name', 'city']);
      expect(result.current.state.rows[0]).toEqual(['Alice', 'NYC']);
    });
  });

  describe('排序', () => {
    it('按数字列升序排序', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: 1, direction: 'asc' } }));

      expect(result.current.sortedRows[0][0]).toBe('Bob');
      expect(result.current.sortedRows[1][0]).toBe('Alice');
      expect(result.current.sortedRows[2][0]).toBe('Charlie');
    });

    it('按字符串列降序排序', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: 0, direction: 'desc' } }));

      expect(result.current.sortedRows[0][0]).toBe('Charlie');
      expect(result.current.sortedRows[2][0]).toBe('Alice');
    });

    it('direction 为 null 时不排序', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: -1, direction: null } }));

      expect(result.current.sortedRows[0][0]).toBe('Alice');
    });
  });

  describe('搜索', () => {
    it('设置 query 后自动计算匹配', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'alice' } }));

      expect(result.current.state.search.matches.length).toBe(1);
      expect(result.current.state.search.matches[0]).toEqual({ row: 0, col: 0 });
    });

    it('搜索不区分大小写', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'ALICE' } }));

      expect(result.current.state.search.matches.length).toBe(1);
    });

    it('空 query 无匹配', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: '' } }));

      expect(result.current.state.search.matches.length).toBe(0);
    });
  });

  describe('PASTE_CELLS', () => {
    it('粘贴多个单元格到指定位置', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({
        type: 'PASTE_CELLS',
        startRow: 0,
        startCol: 0,
        data: [['X', 'Y'], ['Z', 'W']],
      }));

      expect(result.current.state.rows[0][0]).toBe('X');
      expect(result.current.state.rows[0][1]).toBe('Y');
      expect(result.current.state.rows[1][0]).toBe('Z');
      expect(result.current.state.rows[1][1]).toBe('W');
    });
  });

  describe('serialize', () => {
    it('序列化当前数据为 CSV 文本', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent('a,b\n1,2'));

      expect(result.current.serialize()).toBe('a,b\n1,2');
    });
  });

  describe('排序 + 编辑索引映射', () => {
    it('sortedToSourceMap 在无排序时为恒等映射', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      expect(result.current.sortedToSourceMap).toEqual([0, 1, 2]);
    });

    it('排序后 sortedToSourceMap 正确映射', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: 1, direction: 'asc' } }));

      const map = result.current.sortedToSourceMap;
      expect(result.current.sortedRows[0][0]).toBe('Bob');
      expect(map[0]).toBe(1);
      expect(result.current.sortedRows[1][0]).toBe('Alice');
      expect(map[1]).toBe(0);
      expect(result.current.sortedRows[2][0]).toBe('Charlie');
      expect(map[2]).toBe(2);
    });

    it('通过 sortedToSourceMap 编辑正确修改源数据', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: 1, direction: 'asc' } }));

      const sourceRow = result.current.sortedToSourceMap[0];
      act(() => result.current.dispatch({ type: 'SET_CELL', row: sourceRow, col: 0, value: 'Modified' }));

      expect(result.current.state.rows[1][0]).toBe('Modified');
      expect(result.current.state.rows[0][0]).toBe('Alice');
    });

    it('排序后通过映射删除正确的源行', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));
      act(() => result.current.dispatch({ type: 'SET_SORT', sort: { columnIndex: 1, direction: 'asc' } }));

      const sourceRow = result.current.sortedToSourceMap[0];
      act(() => result.current.dispatch({ type: 'DELETE_ROW', at: sourceRow }));

      expect(result.current.state.rows.length).toBe(2);
      expect(result.current.state.rows.find(r => r[0] === 'Bob')).toBeUndefined();
    });
  });

  describe('REPLACE_ALL 安全性', () => {
    it('包含正则特殊字符的 query 不报错', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent('a,b\nfoo(bar),test'));
      act(() => result.current.dispatch({ type: 'SET_SEARCH', search: { query: 'foo(bar)', replaceText: 'baz' } }));

      expect(() => {
        act(() => result.current.dispatch({ type: 'REPLACE_ALL' }));
      }).not.toThrow();

      expect(result.current.state.rows[0][0]).toBe('baz');
    });
  });

  describe('dispatchWithHistory 函数引用稳定性', () => {
    it('多次 rerender 后 dispatch 引用不变', () => {
      const { result, rerender } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      const firstDispatch = result.current.dispatch;
      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'X' }));

      rerender();
      expect(result.current.dispatch).toBe(firstDispatch);

      act(() => result.current.dispatch({ type: 'SET_CELL', row: 1, col: 0, value: 'Y' }));
      rerender();
      expect(result.current.dispatch).toBe(firstDispatch);
    });

    it('initFromContent 引用也是稳定的', () => {
      const { result, rerender } = renderHook(() => useCsvStore(''));
      const firstInit = result.current.initFromContent;
      act(() => result.current.initFromContent(sampleCsv));
      rerender();
      expect(result.current.initFromContent).toBe(firstInit);
    });
  });

  describe('undo / redo', () => {
    it('SET_CELL 后可以 undo 恢复原值', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      expect(result.current.state.rows[0][0]).toBe('Alice');

      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'NewValue' }));
      expect(result.current.state.rows[0][0]).toBe('NewValue');

      act(() => result.current.dispatch({ type: 'UNDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('Alice');
    });

    it('undo 后可以 redo 恢复修改', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'Changed' }));
      act(() => result.current.dispatch({ type: 'UNDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('Alice');

      act(() => result.current.dispatch({ type: 'REDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('Changed');
    });

    it('INSERT_ROW 后 undo 恢复行数', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      expect(result.current.state.rows.length).toBe(3);

      act(() => result.current.dispatch({ type: 'INSERT_ROW', at: 1 }));
      expect(result.current.state.rows.length).toBe(4);

      act(() => result.current.dispatch({ type: 'UNDO' } as any));
      expect(result.current.state.rows.length).toBe(3);
    });

    it('DELETE_ROW 后 undo 恢复被删除的行', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      act(() => result.current.dispatch({ type: 'DELETE_ROW', at: 0 }));
      expect(result.current.state.rows[0][0]).toBe('Bob');

      act(() => result.current.dispatch({ type: 'UNDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('Alice');
      expect(result.current.state.rows.length).toBe(3);
    });

    it('无操作时 undo 不报错', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      expect(() => {
        act(() => result.current.dispatch({ type: 'UNDO' } as any));
      }).not.toThrow();

      expect(result.current.state.rows[0][0]).toBe('Alice');
    });

    it('连续多次编辑后可以逐步 undo', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'V1' }));
      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'V2' }));
      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'V3' }));

      act(() => result.current.dispatch({ type: 'UNDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('V2');

      act(() => result.current.dispatch({ type: 'UNDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('V1');

      act(() => result.current.dispatch({ type: 'UNDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('Alice');
    });

    it('新编辑清空 redo 栈', () => {
      const { result } = renderHook(() => useCsvStore(''));
      act(() => result.current.initFromContent(sampleCsv));

      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'V1' }));
      act(() => result.current.dispatch({ type: 'UNDO' } as any));

      act(() => result.current.dispatch({ type: 'SET_CELL', row: 0, col: 0, value: 'V2' }));

      act(() => result.current.dispatch({ type: 'REDO' } as any));
      expect(result.current.state.rows[0][0]).toBe('V2');
    });
  });
});
