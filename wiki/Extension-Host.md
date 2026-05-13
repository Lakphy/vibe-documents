# 扩展宿主层

扩展宿主层位于 `src/`，运行在 VS Code Extension Host 中。它不渲染 UI，只负责把文件、命令和 Webview 连接起来。

## 文件职责

| 文件 | 代码职责 |
| --- | --- |
| `src/extension.ts` | 创建 provider，注册 Custom Editors、CodeLens 和命令 |
| `src/customTextEditorProvider.ts` | 实现 `vscode.CustomTextEditorProvider`，处理 Webview 生命周期和双向同步 |
| `src/codeLensProvider.ts` | 为支持的文件返回第一行 CodeLens |
| `src/editorTypes.ts` | 定义 `FileType`、viewType 常量和扩展名推断 |
| `src/textDocumentEdits.ts` | 用 `fast-diff` 生成并应用增量 `WorkspaceEdit` |
| `src/webviewHost.ts` | 配置 Webview 资源根、脚本样式 URI 和 HTML |
| `src/utils.ts` | 提供 nonce、HTML 模板和图片路径解析 |

## 激活事件

`package.json` 声明的激活事件是：

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

当前清单没有为 `vibeDocuments.showPreview` 或 `vibeDocuments.showPreviewToSide` 单独声明 `onCommand` 激活事件；Markdown 场景依赖 `onLanguage:markdown` 和 custom editor 激活路径。

## Custom Editors

`activate()` 使用同一个 `VibeCustomTextEditorProvider` 注册三个 viewType：

| fileType | viewType | selector |
| --- | --- | --- |
| `markdown` | `vibeDocuments.markdownEditor` | `*.md`、`*.markdown` |
| `csv` | `vibeDocuments.csvEditor` | `*.csv` |
| `excalidraw` | `vibeDocuments.excalidrawEditor` | `*.excalidraw` |

三个注册都使用：

```ts
{
  webviewOptions: { retainContextWhenHidden: true },
  supportsMultipleEditorsPerDocument: true,
}
```

`package.json` 中的三个 custom editor 都是 `priority: "option"`，因此它们不会强制替代默认文本编辑器。

## 命令

| 命令 | 行为 |
| --- | --- |
| `vibeDocuments.showPreview` | 在当前编辑器列用 `vscode.openWith()` 打开推断出的 Vibe viewType |
| `vibeDocuments.showPreviewToSide` | 在侧边列用 `vscode.openWith()` 打开推断出的 Vibe viewType |
| `vibeDocuments.showExcalidrawPreview` | 在当前编辑器列打开推断出的 Vibe viewType |
| `vibeDocuments.showCsvPreview` | 在当前编辑器列打开推断出的 Vibe viewType |
| `vibeDocuments.toggleMode` | 向第一个 active Webview panel 发送 `{ type: 'toggleMode' }` |

四个打开命令共用 `openWithVibeEditor(uri, column)`。如果命令没有传入 URI，它会使用 `vscode.window.activeTextEditor?.document.uri`。如果无法得到目标 URI，它直接返回。

## CodeLens

`PreviewCodeLensProvider` 始终返回一个位于 `Range(0, 0, 0, 0)` 的 CodeLens。标题和命令由构造函数传入的 `fileType` 决定。

| fileType | title | command |
| --- | --- | --- |
| `markdown` | `$(open-preview)  Open Vibe Preview` | `vibeDocuments.showPreview` |
| `csv` | `$(open-preview)  Open CSV Preview` | `vibeDocuments.showCsvPreview` |
| `excalidraw` | `$(open-preview)  Open Excalidraw Editor` | `vibeDocuments.showExcalidrawPreview` |

CodeLens 的参数是当前 `document.uri`。

## Custom Text Editor 生命周期

`resolveCustomTextEditor(document, panel, token)` 的实际流程是：

1. 根据 `document.uri.fsPath` 推断 `fileType`。
2. 把 `panel` 加入 provider 的 panel 集合。
3. 设置 `panel.iconPath = new vscode.ThemeIcon('open-preview')`。
4. 调用 `configureEditorWebview(context, panel, document.uri)`。
5. 注册 `workspace.onDidChangeTextDocument`。
6. 注册 `panel.webview.onDidReceiveMessage`。
7. 注册 `panel.onDidDispose` 清理 pending timer、panel 集合和监听器。

## 文档推送

`postDocumentContent(force = false)` 会读取 `document.getText()`，并在非强制模式下跳过与 `lastSentContent` 相同的内容。推送消息包含 `type`、`content`、`baseUri` 和 `fileType`。

外部文档变更不会立即发送 update，而是调用 `scheduleDocumentContentPost()`。该函数用 50ms 定时器合并连续变化，只发送最后一次内容。`ready` 和 `dispose` 都会清理这个定时器。

## Webview 消息

| 消息 | 扩展端行为 |
| --- | --- |
| `{ type: 'ready' }` | 清理 pending update 并强制推送当前文档 |
| `{ type: 'edit', content }` | 串行调用 `applyTextDocumentContent(document, content)` |
| `{ type: 'save', content? }` | 如带 content 则先应用编辑，再调用 `document.save()` |
| 其他消息 | 返回 `undefined`，不做处理 |

`edit` 和 `save` 都进入 `webviewMessageQueue`，这样多个异步编辑和保存不会交错。

## 增量编辑

`createTextDocumentEdit(document, nextContent)` 读取当前文档全文，用 `fast-diff` 比较当前内容和目标内容。相等片段只推进 offset；删除片段调用 `edit.delete()`；插入片段调用 `edit.insert()`。没有变化时 `applyTextDocumentContent()` 直接返回 `true`。

## Webview 宿主配置

`configureEditorWebview()` 设置 `enableScripts: true`，并把以下路径加入 `localResourceRoots`：

- `<extensionPath>/dist`
- `<extensionPath>/dist/webview-assets`
- 当前资源所在目录
- 当前工作区中的所有 workspace folder

它固定引用 `dist/webview-assets/webview.js` 和 `dist/webview-assets/webview.css`，并用 `buildPreviewHtml()` 注入 CSP、CSS `<link>`、`#root` 和带 nonce 的 module script。

## 工具函数

`getNonce()` 生成 32 位 `A-Za-z0-9` 随机字符串。`resolveImageSrc(src, baseUri)` 对空值、`http`、`https` 和 `data:` 原样返回，对其他路径返回 `${baseUri}/${src}`。
