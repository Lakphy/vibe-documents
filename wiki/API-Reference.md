# API 参考

本页列出当前源码和 `package.json` 中存在的命令、消息、类型和工具函数。

## VS Code 命令

| 命令 ID | 标题 | 快捷键 | 代码行为 |
| --- | --- | --- | --- |
| `vibeDocuments.showPreview` | `Vibe: Open Markdown Preview` | `Ctrl/Cmd+Shift+V`，`editorLangId == markdown` | 当前列调用 `vscode.openWith()` |
| `vibeDocuments.showPreviewToSide` | `Vibe: Open Markdown Preview to the Side` | 无 | 侧边列调用 `vscode.openWith()` |
| `vibeDocuments.toggleMode` | `Vibe: Toggle Preview/Edit Mode` | `Ctrl/Cmd+Shift+E`，`vibeDocumentsPreviewFocused` | provider 向 active panel 发送 `toggleMode` |
| `vibeDocuments.showExcalidrawPreview` | `Vibe: Open Excalidraw Editor` | `Ctrl/Cmd+Shift+V`，`resourceExtname == .excalidraw` | 当前列调用 `vscode.openWith()` |
| `vibeDocuments.showCsvPreview` | `Vibe: Open CSV Preview` | `Ctrl/Cmd+Shift+V`，`resourceExtname == .csv` | 当前列调用 `vscode.openWith()` |

四个打开命令都会通过目标 URI 的扩展名调用 `getCustomEditorViewType()`。`.csv` 返回 CSV viewType，`.excalidraw` 返回 Excalidraw viewType，其他路径返回 Markdown viewType。

## 菜单

`editor/title` 菜单包含 Markdown、CSV 和 Excalidraw 三个打开命令。Markdown 的 when 条件是 `editorLangId == markdown`，CSV 和 Excalidraw 的 when 条件分别是 `resourceExtname == .csv` 和 `resourceExtname == .excalidraw`。

`explorer/context` 菜单包含相同三个打开命令。Markdown 的 when 条件是 `resourceLangId == markdown`，CSV 和 Excalidraw 仍按 `resourceExtname` 匹配。

## Custom Editors

| viewType | displayName | selector | priority |
| --- | --- | --- | --- |
| `vibeDocuments.markdownEditor` | `Vibe Markdown Editor` | `*.md`、`*.markdown` | `option` |
| `vibeDocuments.csvEditor` | `Vibe CSV Editor` | `*.csv` | `option` |
| `vibeDocuments.excalidrawEditor` | `Vibe Excalidraw Editor` | `*.excalidraw` | `option` |

运行时注册选项是：

```ts
{
  webviewOptions: { retainContextWhenHidden: true },
  supportsMultipleEditorsPerDocument: true,
}
```

## 语言贡献

`package.json` 只额外贡献了 `excalidraw` 语言，扩展名为 `.excalidraw`，alias 为 `Excalidraw`。Markdown 和 CSV 使用 VS Code 已有语言。

## 消息协议

### Extension -> Webview: `update`

```ts
{
  type: 'update',
  content: string,
  baseUri: string,
  fileType: 'markdown' | 'csv' | 'excalidraw'
}
```

`ready` 后会强制发送一次 update。匹配当前 panel 文档的 `onDidChangeTextDocument` 会在 50ms 合并后发送 update。

### Extension -> Webview: `toggleMode`

```ts
{ type: 'toggleMode' }
```

该消息由 `vibeDocuments.toggleMode` 触发。当前只有 Markdown 的 `MarkdownPreview` 订阅并处理它。

### Webview -> Extension: `ready`

```ts
{ type: 'ready' }
```

`useVsCodeMessages()` 挂载时发送，用于请求首次内容推送。

### Webview -> Extension: `edit`

```ts
{ type: 'edit', content: string }
```

扩展端把完整 content 转为增量 `WorkspaceEdit` 并应用到当前 `TextDocument`。

### Webview -> Extension: `save`

```ts
{ type: 'save', content?: string }
```

如果携带 content，扩展端先应用该内容，再调用 `document.save()`。如果没有携带 content，扩展端直接调用 `document.save()`。

## 核心类型

```ts
type FileType = 'markdown' | 'excalidraw' | 'csv';
type EditorMode = 'preview' | 'wysiwyg';

interface VsCodeMessage {
  type: string;
  content?: string;
  baseUri?: string;
  fileType?: FileType;
}

interface HtmlTemplateParams {
  cspSource: string;
  nonce: string;
  scriptUri: string;
  cssUri: string;
}
```

`useVsCodeMessages()` 返回：

```ts
{
  content: string;
  baseUri: string;
  fileType: FileType;
  hasReceivedUpdate: boolean;
}
```

## 常量

```ts
const CUSTOM_EDITOR_VIEW_TYPES = {
  markdown: 'vibeDocuments.markdownEditor',
  csv: 'vibeDocuments.csvEditor',
  excalidraw: 'vibeDocuments.excalidrawEditor',
};

const CODE_HIGHLIGHT_THEMES = ['vitesse-light', 'vitesse-dark'];
```

## 类

### `VibeCustomTextEditorProvider`

```ts
class VibeCustomTextEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(context: vscode.ExtensionContext)
  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Promise<void>
  toggleMode(): void
}
```

`resolveCustomTextEditor()` 配置 Webview、监听文档变化、处理 Webview 消息并在 dispose 时清理资源。`toggleMode()` 只向第一个 active panel 发送消息。

### `PreviewCodeLensProvider`

```ts
class PreviewCodeLensProvider implements vscode.CodeLensProvider {
  constructor(fileType: FileType = 'markdown')
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[]
}
```

`provideCodeLenses()` 返回一个 CodeLens，范围固定为第一行起点，参数为 `[document.uri]`。

## 工具函数

| 函数 | 行为 |
| --- | --- |
| `inferFileType(fsPath)` | `.csv` -> `csv`，`.excalidraw` -> `excalidraw`，其他 -> `markdown` |
| `getCustomEditorViewType(fsPath)` | 返回 `CUSTOM_EDITOR_VIEW_TYPES[inferFileType(fsPath)]` |
| `getNonce()` | 返回 32 位 `A-Za-z0-9` 字符串 |
| `buildPreviewHtml(params)` | 生成含 CSP、CSS link、`#root` 和 module script 的完整 HTML |
| `resolveImageSrc(src, baseUri)` | 空值、`http`、`https`、`data:` 原样返回；相对路径拼接 `${baseUri}/${src}` |
| `createTextDocumentEdit(document, nextContent)` | 返回 `{ edit, hasChanges }` |
| `applyTextDocumentContent(document, nextContent)` | 无变化返回 true，有变化时调用 `vscode.workspace.applyEdit()` |

## CSV Store 返回值

`useCsvStore(initialContent)` 返回：

```ts
{
  state,
  dispatch,
  initFromContent,
  serialize,
  sortedRows,
  sortedToSourceMap,
  canUndo,
  canRedo,
}
```

`initialContent` 参数不会在 hook 初始化时自动解析。实际解析由 `CsvViewer` 在 content 到达后调用 `initFromContent()`。

## Webview Message Bus

`subscribe(type, handler)` 注册全局 message bus 监听并返回取消订阅函数。当前类型映射包含 `update` 和 `toggleMode`。模块内部只在首次订阅时给 `window` 添加一个 `message` listener。
