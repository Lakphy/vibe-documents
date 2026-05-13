# API 参考

> 本文档列出 Vibe Documents 的所有公共 API，包括 VS Code 命令、消息协议、核心类型与工具函数。

---

## VS Code 命令

扩展共注册 **5 个命令**：

### `vibeDocuments.showPreview`

在当前编辑器列打开 Vibe Editor（按 `fileType` 自动路由到 markdown/csv/excalidraw viewType）。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.showPreview` |
| 标题 | Vibe: Open Markdown Preview |
| 图标 | `$(open-preview)` |
| 参数 | `uri?: vscode.Uri` |
| 快捷键 | `Ctrl+Shift+V` / `Cmd+Shift+V`（`when: editorLangId == markdown`） |
| 内部行为 | `vscode.openWith(uri, viewType, { viewColumn: Active })` |

### `vibeDocuments.showPreviewToSide`

在侧边列打开 Vibe Editor。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.showPreviewToSide` |
| 标题 | Vibe: Open Markdown Preview to the Side |
| 图标 | `$(open-preview)` |
| 参数 | `uri?: vscode.Uri` |
| 快捷键 | （无，仅可通过命令面板调用） |
| 内部行为 | `vscode.openWith(uri, viewType, { viewColumn: Beside })` |

### `vibeDocuments.showExcalidrawPreview`

打开 `.excalidraw` 文件的 Vibe Editor。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.showExcalidrawPreview` |
| 标题 | Vibe: Open Excalidraw Editor |
| 图标 | `$(open-preview)` |
| 快捷键 | `Ctrl+Shift+V` / `Cmd+Shift+V`（`when: resourceExtname == .excalidraw`） |

### `vibeDocuments.showCsvPreview`

打开 `.csv` 文件的 Vibe Editor。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.showCsvPreview` |
| 标题 | Vibe: Open CSV Preview |
| 图标 | `$(open-preview)` |
| 快捷键 | `Ctrl+Shift+V` / `Cmd+Shift+V`（`when: resourceExtname == .csv`） |

### `vibeDocuments.toggleMode`

在 Markdown 的 Preview / WYSIWYG 之间循环。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.toggleMode` |
| 标题 | Vibe: Toggle Preview/Edit Mode |
| 图标 | `$(edit)` |
| 快捷键 | `Ctrl+Shift+E` / `Cmd+Shift+E`（`when: vibeDocumentsPreviewFocused`） |
| 内部行为 | 向当前 `active` 的 Webview 面板发送 `{type:'toggleMode'}` |

---

## 菜单配置

### `editor/title`

```json
[
  { "command": "vibeDocuments.showPreview",          "when": "editorLangId == markdown",          "group": "navigation" },
  { "command": "vibeDocuments.showExcalidrawPreview","when": "resourceExtname == .excalidraw",    "group": "navigation" },
  { "command": "vibeDocuments.showCsvPreview",       "when": "resourceExtname == .csv",           "group": "navigation" }
]
```

### `explorer/context`

```json
[
  { "command": "vibeDocuments.showPreview",          "when": "resourceLangId == markdown",        "group": "navigation" },
  { "command": "vibeDocuments.showExcalidrawPreview","when": "resourceExtname == .excalidraw",    "group": "navigation" },
  { "command": "vibeDocuments.showCsvPreview",       "when": "resourceExtname == .csv",           "group": "navigation" }
]
```

---

## Custom Editors

```json
[
  { "viewType": "vibeDocuments.markdownEditor",   "selector": [{"filenamePattern":"*.md"}, {"filenamePattern":"*.markdown"}], "priority": "option" },
  { "viewType": "vibeDocuments.csvEditor",        "selector": [{"filenamePattern":"*.csv"}],        "priority": "option" },
  { "viewType": "vibeDocuments.excalidrawEditor", "selector": [{"filenamePattern":"*.excalidraw"}], "priority": "option" }
]
```

注册选项（`registerCustomEditorProvider` 的第三个参数）：

```typescript
{
  webviewOptions: { retainContextWhenHidden: true },
  supportsMultipleEditorsPerDocument: true,
}
```

---

## 激活事件

```json
[
  "onLanguage:markdown",
  "onLanguage:csv",
  "onLanguage:excalidraw",
  "onCustomEditor:vibeDocuments.markdownEditor",
  "onCustomEditor:vibeDocuments.csvEditor",
  "onCustomEditor:vibeDocuments.excalidrawEditor",
  "onCommand:vibeDocuments.showExcalidrawPreview",
  "onCommand:vibeDocuments.showCsvPreview"
]
```

---

## 消息协议

Extension Host 和 Webview 之间通过 `postMessage` 通信。

### Extension → Webview

#### `update`

```typescript
{
  type: 'update',
  content: string,
  baseUri: string,         // dirname(uri) 的 webview URI 字符串
  fileType: 'markdown' | 'csv' | 'excalidraw'
}
```

触发时机：
- Webview 发送 `{type:'ready'}` 后（强制推送一次）
- `workspace.onDidChangeTextDocument`（且 uri 匹配本面板）

#### `toggleMode`

```typescript
{ type: 'toggleMode' }
```

触发时机：执行 `vibeDocuments.toggleMode` 命令。仅 Markdown 编辑器响应。

### Webview → Extension

#### `ready`

```typescript
{ type: 'ready' }
```

Webview 挂载完成后立即发送，由 `useVsCodeMessages()` 中的 effect 触发。

#### `edit`

```typescript
{ type: 'edit', content: string }
```

将 Webview 中修改后的完整内容回写。扩展端调用 `applyTextDocumentContent()` 用 `fast-diff` 生成增量 `WorkspaceEdit`。

#### `save`

```typescript
{ type: 'save', content?: string }
```

带 `content` 时先执行 edit，再调 `document.save()`；不带时直接 save。

---

## 核心类型

### `FileType`

```typescript
type FileType = 'markdown' | 'csv' | 'excalidraw';
```

### `EditorMode`（仅 Markdown）

```typescript
type EditorMode = 'preview' | 'wysiwyg';
```

### `VsCodeMessage`

```typescript
interface VsCodeMessage {
  type: string;
  content?: string;
  baseUri?: string;
  fileType?: FileType;
}
```

### `HtmlTemplateParams`

```typescript
interface HtmlTemplateParams {
  cspSource: string;
  nonce: string;
  scriptUri: string;
  cssUri: string;
}
```

### `CUSTOM_EDITOR_VIEW_TYPES`

```typescript
const CUSTOM_EDITOR_VIEW_TYPES = {
  markdown:   'vibeDocuments.markdownEditor',
  csv:        'vibeDocuments.csvEditor',
  excalidraw: 'vibeDocuments.excalidrawEditor',
} as const;
```

---

## 核心类

### `VibeCustomTextEditorProvider`

```typescript
class VibeCustomTextEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(context: vscode.ExtensionContext)
  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void>
  toggleMode(): void
}
```

### `PreviewCodeLensProvider`

```typescript
class PreviewCodeLensProvider implements vscode.CodeLensProvider {
  constructor(fileType: FileType)
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[]
}
```

构造函数参数 `fileType` 默认值为 `'markdown'`。每个文件返回单个 CodeLens（范围固定 `Range(0,0,0,0)`），标题与命令依据 `fileType`：

| fileType | title | command |
|----------|-------|---------|
| markdown | `$(open-preview)  Open Vibe Preview` | `vibeDocuments.showPreview` |
| csv | `$(open-preview)  Open CSV Preview` | `vibeDocuments.showCsvPreview` |
| excalidraw | `$(open-preview)  Open Excalidraw Editor` | `vibeDocuments.showExcalidrawPreview` |

CodeLens 的 `arguments` 始终为 `[document.uri]`。

---

## 工具函数

### `getNonce(): string`

生成长度 32、字符集 `A-Za-z0-9` 的随机字符串。

### `buildPreviewHtml(params: HtmlTemplateParams): string`

构建完整 HTML 文档，含 CSP `<meta>`、CSS `<link>`、`<div id="root"></div>` 和带 nonce 的 `<script type="module">`。CSP：

```
default-src 'none';
img-src ${cspSource} https: data: blob:;
media-src ${cspSource} https: blob:;
script-src ${cspSource} 'nonce-${nonce}' 'unsafe-eval';
style-src ${cspSource} 'unsafe-inline';
font-src ${cspSource} https: data:;
```

### `resolveImageSrc(src, baseUri): string`

- 空 `src` → 原样
- 以 `http`、`https`、`data:` 开头 → 原样
- 空 `baseUri` → 原样
- 其他 → `${baseUri}/${src}`

### `inferFileType(fsPath): FileType`

按文件扩展名（大小写不敏感）返回：`.csv → 'csv'`、`.excalidraw → 'excalidraw'`、其他 → `'markdown'`。

### `getCustomEditorViewType(fsPath): string`

返回 `CUSTOM_EDITOR_VIEW_TYPES[inferFileType(fsPath)]`。

### `applyTextDocumentContent(document, content): Promise<boolean>`

基于 `fast-diff` 生成最小 `WorkspaceEdit` 并应用。无变化时直接返回 `true`；`applyEdit` 失败时返回 `false`。

---

## Webview Hooks

### `useVsCodeMessages()`

```typescript
function useVsCodeMessages(): {
  content: string;
  baseUri: string;
  fileType: FileType;
}
```

订阅 `update` 消息；在 mount 时 `postMessage({type:'ready'})` 触发首次推送。

### `useMarkdownComponents(baseUri)`

```typescript
function useMarkdownComponents(baseUri: string): {
  img: React.FC<React.ImgHTMLAttributes<HTMLImageElement>>;
  a: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  table: React.FC<React.TableHTMLAttributes<HTMLTableElement>>;
}
```

按 `baseUri` 缓存 Streamdown 自定义组件映射。

### `useVsCodeTheme()`

返回 `isDark: boolean`，由 `ThemeContext` 监听 `<html>` 类变化得出。

---

## Webview 总线

### `subscribe<K>(type, handler): () => void`

注册到全局消息总线（`webview/messageBus.ts`），返回取消订阅函数。已知 `type`：`'update'`、`'toggleMode'`。

---

## Webview 面板配置

```typescript
{
  enableScripts: true,
  localResourceRoots: [
    <extensionPath>/dist,
    <extensionPath>/dist/webview-assets,
    dirname(uri.fsPath),
    ...workspaceFolders,
  ],
}
// 注册选项：
{
  webviewOptions: { retainContextWhenHidden: true },
  supportsMultipleEditorsPerDocument: true,
}
```

---

## 相关文档

- [扩展宿主层](./Extension-Host.md) — API 的实现细节
- [Webview UI 层](./Webview-UI.md) — Hooks 和组件实现
- [架构设计](./Architecture.md) — 消息通信流程
