import { describe, it, expect, beforeEach } from 'vitest';
import { UndoRedoStack, type Snapshot } from '../csv/history';

describe('UndoRedoStack', () => {
  let stack: UndoRedoStack;

  const snap1: Snapshot = { headers: ['a'], rows: [['1']] };
  const snap2: Snapshot = { headers: ['a'], rows: [['2']] };
  const snap3: Snapshot = { headers: ['a'], rows: [['3']] };
  const current: Snapshot = { headers: ['a'], rows: [['current']] };

  beforeEach(() => {
    stack = new UndoRedoStack();
  });

  describe('初始状态', () => {
    it('不能撤销', () => {
      expect(stack.canUndo()).toBe(false);
    });

    it('不能重做', () => {
      expect(stack.canRedo()).toBe(false);
    });

    it('undo 返回 null', () => {
      expect(stack.undo(current)).toBeNull();
    });

    it('redo 返回 null', () => {
      expect(stack.redo(current)).toBeNull();
    });
  });

  describe('push', () => {
    it('push 后可以撤销', () => {
      stack.push(snap1);
      expect(stack.canUndo()).toBe(true);
    });

    it('push 清空重做栈', () => {
      stack.push(snap1);
      stack.undo(current);
      expect(stack.canRedo()).toBe(true);
      stack.push(snap2);
      expect(stack.canRedo()).toBe(false);
    });
  });

  describe('undo', () => {
    it('返回上一个快照', () => {
      stack.push(snap1);
      const result = stack.undo(current);
      expect(result).toEqual(snap1);
    });

    it('连续 undo 依次返回', () => {
      stack.push(snap1);
      stack.push(snap2);
      expect(stack.undo(current)).toEqual(snap2);
      expect(stack.undo(snap2)).toEqual(snap1);
    });

    it('undo 后 canRedo 为 true', () => {
      stack.push(snap1);
      stack.undo(current);
      expect(stack.canRedo()).toBe(true);
    });

    it('undo 到底后 canUndo 为 false', () => {
      stack.push(snap1);
      stack.undo(current);
      expect(stack.canUndo()).toBe(false);
    });
  });

  describe('redo', () => {
    it('返回撤销前的状态', () => {
      stack.push(snap1);
      stack.undo(current);
      const result = stack.redo(snap1);
      expect(result).toEqual(current);
    });

    it('连续 redo 依次返回', () => {
      stack.push(snap1);
      stack.push(snap2);
      stack.undo(current);
      stack.undo(snap2);
      expect(stack.redo(snap1)).toEqual(snap2);
      expect(stack.redo(snap2)).toEqual(current);
    });
  });

  describe('容量限制', () => {
    it('超过 100 步后最早的记录被丢弃', () => {
      for (let i = 0; i < 105; i++) {
        stack.push({ headers: ['h'], rows: [[String(i)]] });
      }
      let count = 0;
      let snapshot: Snapshot | null = current;
      while (stack.canUndo()) {
        snapshot = stack.undo(snapshot!);
        count++;
      }
      expect(count).toBe(100);
    });
  });

  describe('clear', () => {
    it('清空后不能撤销或重做', () => {
      stack.push(snap1);
      stack.push(snap2);
      stack.clear();
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
    });
  });
});
