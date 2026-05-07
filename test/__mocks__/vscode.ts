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
  }),
  createFileSystemWatcher: vi.fn(() => createMockFileSystemWatcher()),
  onDidChangeTextDocument: vi.fn(() => createMockDisposable()),
  workspaceFolders: [{ uri: Uri.file('/test/workspace') }],
  applyEdit: vi.fn().mockResolvedValue(true),
};

export class WorkspaceEdit {
  private edits: Array<{ uri: any; range: any; newText: string }> = [];
  replace(uri: any, range: any, newText: string) {
    this.edits.push({ uri, range, newText });
  }
  getEdits() {
    return this.edits;
  }
}

export class Range {
  constructor(
    public readonly start: any,
    public readonly end: any
  ) {}
}

export class Position {
  constructor(
    public readonly line: number,
    public readonly character: number
  ) {}
}

export const commands = {
  registerCommand: vi.fn((command: string, callback: (...args: any[]) => any) => {
    return { command, callback, dispose: vi.fn() };
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
