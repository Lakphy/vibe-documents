import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { createTextDocumentEdit } from '../textDocumentEdits';

function createDocument(content: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.file('/test/file.md'),
    getText: () => content,
    positionAt: (offset: number) => new vscode.Position(0, offset),
  } as unknown as vscode.TextDocument;
}

describe('textDocumentEdits', () => {
  it('相同内容不生成 edit', () => {
    const result = createTextDocumentEdit(createDocument('# Same'), '# Same');

    expect(result.hasChanges).toBe(false);
    expect((result.edit as any).getEdits()).toEqual([]);
  });

  it('插入文本时生成 insert edit', () => {
    const result = createTextDocumentEdit(createDocument('# Hello World'), '# Hello Vibe World');
    const edits = (result.edit as any).getEdits();

    expect(result.hasChanges).toBe(true);
    expect(edits.some((edit: any) => edit.type === 'insert')).toBe(true);
  });

  it('删除文本时生成 delete edit', () => {
    const result = createTextDocumentEdit(createDocument('# Hello World'), '# Hello');
    const edits = (result.edit as any).getEdits();

    expect(result.hasChanges).toBe(true);
    expect(edits.some((edit: any) => edit.type === 'delete')).toBe(true);
  });

  it('复杂变更使用增量 edit 而非全量替换', () => {
    const result = createTextDocumentEdit(
      createDocument('name,value\nA,1\nB,2\n'),
      'name,value\nA,10\nC,3\n'
    );
    const edits = (result.edit as any).getEdits();

    expect(result.hasChanges).toBe(true);
    expect(edits.length).toBeGreaterThan(0);
    expect(edits.every((edit: any) => edit.type !== 'replace')).toBe(true);
  });
});
