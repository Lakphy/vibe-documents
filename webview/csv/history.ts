/**
 * 通用撤销/重做栈
 * 存储状态快照（headers + rows），限制最大栈深度避免内存溢出
 */

export interface Snapshot {
  headers: string[];
  rows: string[][];
}

const MAX_HISTORY = 100;

export class UndoRedoStack {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];

  push(snapshot: Snapshot) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(current: Snapshot): Snapshot | null {
    if (this.undoStack.length === 0) return null;
    const prev = this.undoStack.pop()!;
    this.redoStack.push(current);
    return prev;
  }

  redo(current: Snapshot): Snapshot | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(current);
    return next;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
