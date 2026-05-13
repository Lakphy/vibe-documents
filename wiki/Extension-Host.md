# 扩展宿主层

> 扩展宿主层运行在 Node.js 进程中，负责命令注册、Custom Text Editor 生命周期管理、CodeLens 注入和 `TextDocument` 双向同步。

---

## 文件概览

| 文件 | 职责 |
|------|------|
| `src/extension.ts` | 扩展入口，注册 3 个 Custom Text Editor、3 个 CodeLens、5 个命令 |
| `src/customTextEditorProvider.ts` | 单例 `VibeCustomTextEditorProvider` 处理 Markdown / CSV / Excalidraw 三种 viewType |
| `src/codeLensProvider.ts` | `PreviewCodeLensProvider` 在文件顶部插入 "Open with Vibe..." 行级按钮 |
| `src/editorTypes.ts` | `FileType` 类型、`inferFileType()`、`getCustomEditorViewType()` |
| `src/textDocumentEdits.ts` | `applyTextDocumentContent()` — 基于 `fast-diff` 的增量 `WorkspaceEdit` |
| `src/webviewHost.ts` | `configureEditorWebview()` — 配置 Webview 选项与注入 HTML；`getResourceBaseUri()` |
| `src/utils.ts` | `getNonce()`、`buildPreviewHtml()`、`resolveImageSrc()` |

---

## extension.ts — 扩展入口

### 激活事件

`package.json` 中声明 6 个 `activationEvents`，VS Code 在任一触发时激活扩展：

- `onLanguage:markdown`
- `onLanguage:csv`
- `onLanguage:excalidraw`
- `onCustomEditor:vibeDocuments.markdownEditor`
- `onCustomEditor:vibeDocuments.csvEditor`
- `onCustomEditor:vibeDocuments.excalidrawEditor`
- `onCommand:vibeDocuments.showExcalidrawPreview`
- `onCommand:vibeDocuments.showCsvPreview`

### Custom Editor 注册

`activate()` 内创建一个共享的 `VibeCustomTextEditorProvider` 实例，并依次注册 3 个 `viewType`：

```typescript
const provider = new VibeCustomTextEditorProvider(context);

context.subscriptions.push(
  vscode.window.registerCustomEditorProvider(
    CUSTOM_EDITOR_VIEW_TYPES.markdown, provider,
    { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true },
  ),
  vscode.window.registerCustomEditorProvider(
    CUSTOM_EDITOR_VIEW_TYPES.csv, provider,
    { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true },
  ),
  vscode.window.registerCustomEditorProvider(
    CUSTOM_EDITOR_VIEW_TYPES.excalidraw, provider,
    { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true },
  ),
  // ...
);
```

`package.json` 中所有 `customEditors` 条目均使用 `priority: "option"`，因此双击文件仍打开原生文本编辑器，仅在用户主动选择 Vibe 命令、CodeLens 或 `Reopen With...` 时才进入 Vibe Editor。

### CodeLens 注册

```typescript
vscode.languages.registerCodeLensProvider(
  { language: 'markdown' }, new PreviewCodeLensProvider('markdown'),
);
vscode.languages.registerCodeLensProvider(
  { pattern: '**/*.excalidraw' }, new PreviewCodeLensProvider('excalidraw'),
);
vscode.languages.registerCodeLensProvider(
  { pattern: '**/*.csv' }, new PreviewCodeLensProvider('csv'),
);
```

`PreviewCodeLensProvider` 根据 `fileType` 在第一行返回一个 `CodeLens`，分别对应 5 个命令中的 `showPreview` / `showCsvPreview` / `showExcalidrawPreview`。

### 命令

| 命令 ID | ViewColumn | 备注 |
|--------|------------|------|
| `vibeDocuments.showPreview` | `Active` | Markdown 在当前列打开 |
| `vibeDocuments.showPreviewToSide` | `Beside` | Markdown 在侧边列打开（注册了 `Ctrl/Cmd+Shift+V` 快捷键） |
| `vibeDocuments.showExcalidrawPreview` | `Active` | 触发条件 `resourceExtname == .excalidraw` |
| `vibeDocuments.showCsvPreview` | `Active` | 触发条件 `resourceExtname == .csv` |
| `vibeDocuments.toggleMode` | — | 调 `provider.toggleMode()` 切换 Markdown 模式 |

四个 `showXxx` 命令统一走辅助函数 `openWithVibeEditor(uri, column)`：

```typescript
const openWithVibeEditor = (uri: vscode.Uri | undefined, column: vscode.ViewColumn) => {
  const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
  if (!targetUri) return;
  return vscode.commands.executeCommand(
    'vscode.openWith',
    targetUri,
    getCustomEditorViewType(targetUri.fsPath),
    { viewColumn: column },
  );
};
```

---

## customTextEditorProvider.ts — Custom Text Editor

### 文档模型

`VibeCustomTextEditorProvider` 实现 `vscode.CustomTextEditorProvider` 接口。VS Code 在用户打开支持的文件时调用 `resolveCustomTextEditor(document, panel, token)`，将工作副本 `TextDocument` 传入。Vibe 不再自行 `openTextDocument(uri)`，因此脏标记、保存、hot exit、revert、`supportsMultipleEditorsPerDocument` 多 editor 同步全部由 VS Code 原生承担。

### 打开流程

```
resolveCustomTextEditor(document, panel)
  │
  ├── 1. this.panels.add(panel)
  ├── 2. panel.iconPath = ThemeIcon('open-preview')
  ├── 3. configureEditorWebview(context, panel, document.uri)
  ├── 4. 注册 onDidReceiveMessage（处理 ready / edit / save）
  ├── 5. 注册 onDidChangeTextDocument（uri 匹配时推送 update）
  └── 6. 注册 onDidDispose（清理监听并从 panels 集合移除）
```

### 内容推送

```typescript
const postDocumentContent = (force = false) => {
  const content = document.getText();
  if (!force && content === lastSentContent) return;
  lastSentContent = content;
  panel.webview.postMessage({
    type: 'update',
    content,
    baseUri: getResourceBaseUri(panel, document.uri),
    fileType,    // 由 inferFileType(document.uri.fsPath) 解析
  });
};
```

`ready` 消息（Webview 挂载完成后发送）走 `postDocumentContent(true)` 强制推送一次，绕过去重；其余触发场景（文件变更）走常规去重路径。

### 编辑回写

Webview 发送 `{ type: 'edit', content }`，扩展通过 `applyTextDocumentContent()` 将完整内容转换为增量 `WorkspaceEdit`，避免全量 replace 带来的 prosemirror selection 抖动：

```typescript
const applied = await applyTextDocumentContent(document, content);
if (applied) lastSentContent = content;
```

`edit` 和 `save` 消息在 `webviewMessageQueue` 中串行执行，避免 save 时与新到的 edit 交错。

### 保存

```typescript
const saveDocument = async (content?: string) => {
  const applied = typeof content === 'string'
    ? await applyContentFromWebview(content)
    : true;
  if (!applied) {
    vscode.window.showErrorMessage(`Failed to apply changes before saving ${document.fileName}.`);
    return;
  }
  const saved = await document.save();
  if (!saved) {
    vscode.window.showErrorMessage(`Failed to save ${document.fileName}.`);
  }
};
```

### 模式切换

`toggleMode()` 遍历 `this.panels`，向第一个 `active` 面板发送 `{ type: 'toggleMode' }`（用于 Markdown 在 Preview/WYSIWYG 之间循环；CSV 和 Excalidraw 编辑器忽略该消息）。

---

## webviewHost.ts — Webview 宿主配置

`configureEditorWebview(context, panel, resourceUri)`：

- 设置 `enableScripts: true`
- 设置 `localResourceRoots`：
  - `<extensionPath>/dist`
  - `<extensionPath>/dist/webview-assets`
  - 当前文件所在目录
  - 所有 `workspaceFolders`
- 通过 `panel.webview.asWebviewUri()` 解析 `dist/webview-assets/webview.js` 和 `dist/webview-assets/webview.css`
- 调用 `buildPreviewHtml()` 注入完整 HTML（含 CSP、`<link rel="stylesheet">`、`<div id="root"></div>` 和带 nonce 的 `<script type="module">`）

`getResourceBaseUri(panel, resourceUri)` 返回 `dirname(resourceUri.fsPath)` 的 Webview URI 字符串，用于解析 Markdown 中的相对图片路径。

---

## utils.ts — 工具函数

### `getNonce()`

生成长度 32、字符集 `A-Za-z0-9` 的随机字符串。

### `buildPreviewHtml(params)`

构建 Webview 的 HTML 模板。`params` 字段：`cspSource`、`nonce`、`scriptUri`、`cssUri`。HTML 包含完整的 CSP `<meta>`（见[架构设计 - 安全模型](./Architecture.md#安全模型)）。

### `resolveImageSrc(src, baseUri)`

解析图片 URL：

- 空字符串 → 原样返回
- `http://` / `https://` / `data:` 前缀 → 原样返回
- 空 `baseUri` → 原样返回
- 其他情况（相对路径）→ `${baseUri}/${src}`

> 注意：此函数同时被 Webview 通过 `import '../src/utils'` 使用。

---

## 相关文档

- [架构设计](./Architecture.md) — 整体架构与数据流
- [Webview UI 层](./Webview-UI.md) — Webview 侧的实现
- [API 参考](./API-Reference.md) — 命令和消息协议
