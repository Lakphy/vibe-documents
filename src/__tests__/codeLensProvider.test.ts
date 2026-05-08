import { describe, it, expect, vi } from 'vitest';
import { PreviewCodeLensProvider, type FileType } from '../codeLensProvider';
import * as vscode from 'vscode';

function createMockDocument(fileName: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(`/test/${fileName}`),
    fileName: `/test/${fileName}`,
  } as unknown as vscode.TextDocument;
}

describe('PreviewCodeLensProvider', () => {
  describe('markdown 类型', () => {
    it('返回包含 showPreview 命令的 CodeLens', () => {
      const provider = new PreviewCodeLensProvider('markdown');
      const doc = createMockDocument('readme.md');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses).toHaveLength(1);
      expect(lenses[0].command?.command).toBe('vibeDocuments.showPreview');
    });

    it('标题包含 Open Vibe Preview', () => {
      const provider = new PreviewCodeLensProvider('markdown');
      const doc = createMockDocument('readme.md');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses[0].command?.title).toContain('Open Vibe Preview');
    });

    it('默认类型为 markdown', () => {
      const provider = new PreviewCodeLensProvider();
      const doc = createMockDocument('readme.md');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses[0].command?.command).toBe('vibeDocuments.showPreview');
    });
  });

  describe('excalidraw 类型', () => {
    it('返回包含 showExcalidrawPreview 命令的 CodeLens', () => {
      const provider = new PreviewCodeLensProvider('excalidraw');
      const doc = createMockDocument('diagram.excalidraw');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses).toHaveLength(1);
      expect(lenses[0].command?.command).toBe('vibeDocuments.showExcalidrawPreview');
    });

    it('标题包含 Open Excalidraw Editor', () => {
      const provider = new PreviewCodeLensProvider('excalidraw');
      const doc = createMockDocument('diagram.excalidraw');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses[0].command?.title).toContain('Open Excalidraw Editor');
    });
  });

  describe('csv 类型', () => {
    it('返回包含 showCsvPreview 命令的 CodeLens', () => {
      const provider = new PreviewCodeLensProvider('csv');
      const doc = createMockDocument('data.csv');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses).toHaveLength(1);
      expect(lenses[0].command?.command).toBe('vibeDocuments.showCsvPreview');
    });

    it('标题包含 Open CSV Preview', () => {
      const provider = new PreviewCodeLensProvider('csv');
      const doc = createMockDocument('data.csv');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses[0].command?.title).toContain('Open CSV Preview');
    });
  });

  describe('通用行为', () => {
    it('CodeLens 范围始终在文档顶部', () => {
      const types: FileType[] = ['markdown', 'excalidraw', 'csv'];
      types.forEach(type => {
        const provider = new PreviewCodeLensProvider(type);
        const doc = createMockDocument('test.md');
        const lenses = provider.provideCodeLenses(doc);
        const range = lenses[0].range;
        expect(range.start.line).toBe(0);
        expect(range.start.character).toBe(0);
      });
    });

    it('CodeLens 参数包含文档 URI', () => {
      const provider = new PreviewCodeLensProvider('csv');
      const doc = createMockDocument('data.csv');
      const lenses = provider.provideCodeLenses(doc);

      expect(lenses[0].command?.arguments).toEqual([doc.uri]);
    });
  });
});
