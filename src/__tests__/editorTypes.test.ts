import { describe, it, expect } from 'vitest';
import { inferFileType, getCustomEditorViewType, CUSTOM_EDITOR_VIEW_TYPES } from '../editorTypes';

describe('inferFileType', () => {
  it('csv → csv', () => {
    expect(inferFileType('/a/b.csv')).toBe('csv');
  });
  it('excalidraw → excalidraw', () => {
    expect(inferFileType('/a/b.excalidraw')).toBe('excalidraw');
  });
  it('md → markdown', () => {
    expect(inferFileType('/a/b.md')).toBe('markdown');
  });
  it('未知扩展名 → markdown', () => {
    expect(inferFileType('/a/b.txt')).toBe('markdown');
  });
  it('大小写不敏感', () => {
    expect(inferFileType('/a/b.CSV')).toBe('csv');
    expect(inferFileType('/a/b.Excalidraw')).toBe('excalidraw');
  });
});

describe('getCustomEditorViewType', () => {
  it('返回对应文件类型的 viewType', () => {
    expect(getCustomEditorViewType('/x.csv')).toBe(CUSTOM_EDITOR_VIEW_TYPES.csv);
    expect(getCustomEditorViewType('/x.md')).toBe(CUSTOM_EDITOR_VIEW_TYPES.markdown);
    expect(getCustomEditorViewType('/x.excalidraw')).toBe(CUSTOM_EDITOR_VIEW_TYPES.excalidraw);
  });
});

describe('CUSTOM_EDITOR_VIEW_TYPES', () => {
  it('包含三种 viewType 字符串', () => {
    expect(CUSTOM_EDITOR_VIEW_TYPES.markdown).toBe('vibeDocuments.markdownEditor');
    expect(CUSTOM_EDITOR_VIEW_TYPES.csv).toBe('vibeDocuments.csvEditor');
    expect(CUSTOM_EDITOR_VIEW_TYPES.excalidraw).toBe('vibeDocuments.excalidrawEditor');
  });
});
