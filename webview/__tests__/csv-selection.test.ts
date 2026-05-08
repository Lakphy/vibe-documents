import { describe, it, expect } from 'vitest';
import { getSelectionRange, isCellInSelection } from '../csv/useSelection';
import type { Selection } from '../csv/types';

describe('getSelectionRange', () => {
  it('start 在 end 左上时直接返回', () => {
    const sel: Selection = { start: { row: 1, col: 1 }, end: { row: 3, col: 3 } };
    expect(getSelectionRange(sel)).toEqual({ minRow: 1, maxRow: 3, minCol: 1, maxCol: 3 });
  });

  it('start 在 end 右下时正确交换', () => {
    const sel: Selection = { start: { row: 5, col: 4 }, end: { row: 2, col: 1 } };
    expect(getSelectionRange(sel)).toEqual({ minRow: 2, maxRow: 5, minCol: 1, maxCol: 4 });
  });

  it('单个单元格选区', () => {
    const sel: Selection = { start: { row: 2, col: 3 }, end: { row: 2, col: 3 } };
    expect(getSelectionRange(sel)).toEqual({ minRow: 2, maxRow: 2, minCol: 3, maxCol: 3 });
  });
});

describe('isCellInSelection', () => {
  const sel: Selection = { start: { row: 1, col: 1 }, end: { row: 3, col: 3 } };

  it('选区内的单元格返回 true', () => {
    expect(isCellInSelection(2, 2, sel)).toBe(true);
  });

  it('选区边界上的单元格返回 true', () => {
    expect(isCellInSelection(1, 1, sel)).toBe(true);
    expect(isCellInSelection(3, 3, sel)).toBe(true);
    expect(isCellInSelection(1, 3, sel)).toBe(true);
    expect(isCellInSelection(3, 1, sel)).toBe(true);
  });

  it('选区外的单元格返回 false', () => {
    expect(isCellInSelection(0, 0, sel)).toBe(false);
    expect(isCellInSelection(4, 2, sel)).toBe(false);
    expect(isCellInSelection(2, 4, sel)).toBe(false);
  });

  it('selection 为 null 时返回 false', () => {
    expect(isCellInSelection(2, 2, null)).toBe(false);
  });

  it('反向选区也能正确判断', () => {
    const reverseSel: Selection = { start: { row: 3, col: 3 }, end: { row: 1, col: 1 } };
    expect(isCellInSelection(2, 2, reverseSel)).toBe(true);
    expect(isCellInSelection(0, 0, reverseSel)).toBe(false);
  });
});
