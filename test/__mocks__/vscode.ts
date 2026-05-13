import { vi } from 'vitest';

export const Uri = {
  file: (path: string) => ({
    fsPath: path,
    toString: () => `file://${path}`,
    scheme: 'file',
    path,
  }),
  parse: (str: string) => ({
    fsPath: str.replace('file://', ''),
    toString: () => str,
    scheme: 'file',
    path: str.replace('file://', ''),
  }),
};

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
}

const createMockDisposable = () => ({ dispose: vi.fn() });

const createMockWebview = () => ({
  html: '',
  cspSource: 'https://mock-csp-source',
  options: undefined as any,
  asWebviewUri: vi.fn((uri: any) => ({
    ...uri,
    toString: () => `https://webview-uri${uri.path || uri.fsPath}`,
  })),
  postMessage: vi.fn().mockResolvedValue(true),
  onDidReceiveMessage: vi.fn(() => createMockDisposable()),
});

const createMockPanel = () => {
  const webview = createMockWebview();
  let disposeCallback: (() => void) | undefined;
  return {
    webview,
    reveal: vi.fn(),
    dispose: vi.fn(() => disposeCallback?.()),
    onDidDispose: vi.fn((cb: () => void) => {
      disposeCallback = cb;
      return createMockDisposable();
    }),
    onDidChangeViewState: vi.fn(() => createMockDisposable()),
    iconPath: undefined as any,
    title: '',
    viewType: 'vibeDocuments.preview',
    active: true,
    visible: true,
    viewColumn: ViewColumn.Active,
    _disposeCallback: () => disposeCallback?.(),
  };
};

export const window = {
  createWebviewPanel: vi.fn((_viewType: string, title: string) => {
    const panel = createMockPanel();
    panel.title = title;
    return panel;
  }),
  registerCustomEditorProvider: vi.fn((_viewType: string, _provider: any, _options?: any) => createMockDisposable()),
  activeTextEditor: undefined as any,
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
};

const createMockFileSystemWatcher = () => ({
  onDidChange: vi.fn(() => createMockDisposable()),
  onDidCreate: vi.fn(() => createMockDisposable()),
  onDidDelete: vi.fn(() => createMockDisposable()),
  dispose: vi.fn(),
});

export const workspace = {
  openTextDocument: vi.fn().mockResolvedValue({
    getText: () => '# Test Markdown\n\nHello world',
    uri: Uri.file('/test/file.md'),
    fileName: '/test/file.md',
    isDirty: false,
    save: vi.fn().mockResolvedValue(true),
  }),
  createFileSystemWatcher: vi.fn(() => createMockFileSystemWatcher()),
  onDidChangeTextDocument: vi.fn(() => createMockDisposable()),
  onDidSaveTextDocument: vi.fn(() => createMockDisposable()),
  workspaceFolders: [{ uri: Uri.file('/test/workspace') }],
  applyEdit: vi.fn().mockResolvedValue(true),
};

export class WorkspaceEdit {
  private _edits: Array<{ type: 'replace' | 'insert' | 'delete'; uri: any; range?: any; position?: any; newText?: string }> = [];
  replace(uri: any, range: any, newText: string) {
    this._edits.push({ type: 'replace', uri, range, newText });
  }
  insert(uri: any, position: any, newText: string) {
    this._edits.push({ type: 'insert', uri, position, newText });
  }
  delete(uri: any, range: any) {
    this._edits.push({ type: 'delete', uri, range });
  }
  getEdits() {
    return this._edits;
  }
}

export class Range {
  public readonly start: { line: number; character: number };
  public readonly end: { line: number; character: number };
  constructor(startLine: number | any, startChar?: number | any, endLine?: number, endChar?: number) {
    if (typeof startLine === 'number' && typeof startChar === 'number') {
      this.start = { line: startLine, character: startChar };
      this.end = { line: endLine ?? startLine, character: endChar ?? startChar };
    } else {
      this.start = startLine;
      this.end = startChar;
    }
  }
}

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

export class CodeLens {
  public readonly range: Range;
  public readonly command?: any;
  constructor(range: Range, command?: any) {
    this.range = range;
    this.command = command;
  }
}

export const commands = {
  registerCommand: vi.fn((command: string, callback: (...args: any[]) => any) => {
    return { command, callback, dispose: vi.fn() };
  }),
  executeCommand: vi.fn().mockResolvedValue(undefined),
};

export const languages = {
  registerCodeLensProvider: vi.fn((_selector: any, _provider: any) => {
    return { dispose: vi.fn() };
  }),
};

export class ThemeIcon {
  constructor(public readonly id: string) {}
}

export class RelativePattern {
  constructor(
    public readonly base: any,
    public readonly pattern: string
  ) {}
}

export { createMockPanel, createMockWebview };
