# 扩展宿主层

> 扩展宿主层运行在 Node.js 进程中，负责命令注册、Custom Text Editor 生命周期管理和 TextDocument 双向同步。

---

## 文件概览

| 文件 | 职责 |
|------|------|
| `src/extension.ts` | 扩展入口，注册 Custom Text Editor provider、CodeLens 和命令 |
| `src/customTextEditorProvider.ts` | 基于 `CustomTextEditorProvider` 承载 Markdown、CSV、Excalidraw 的 Webview editor |
| `src/editorTypes.ts` | 文件类型与 custom editor `viewType` 映射 |
| `src/textDocumentEdits.ts` | 将完整文本变化转换为增量 `WorkspaceEdit` |
| `src/webviewHost.ts` | Webview HTML、资源根目录和 baseUri 配置 |
| `src/utils.ts` | nonce 生成、HTML 模板构建、图片路径解析 |

---

## extension.ts — 扩展入口

### 激活条件

扩展在打开支持语言、执行 Vibe 命令，或 VS Code 需要创建 custom editor 时激活：

- `onLanguage:markdown`
- `onLanguage:csv`
- `onLanguage:excalidraw`
- `onCustomEditor:vibeDocuments.markdownEditor`
- `onCustomEditor:vibeDocuments.csvEditor`
- `onCustomEditor:vibeDocuments.excalidrawEditor`

### Custom Editor 注册

`activate()` 注册三个 `CustomTextEditorProvider` viewType，全部使用 `priority: "option"` 的 manifest 声明，因此不会覆盖 VS Code 原生文本编辑器默认打开方式。

```typescript
vscode.window.registerCustomEditorProvider(
  CUSTOM_EDITOR_VIEW_TYPES.markdown,
  provider,
  {
    webviewOptions: { retainContextWhenHidden: true },
    supportsMultipleEditorsPerDocument: true,
  }
);
```

### 命令打开逻辑

Vibe 命令通过 `vscode.openWith` 打开对应 custom editor：

```typescript
vscode.commands.executeCommand(
  'vscode.openWith',
  targetUri,
  getCustomEditorViewType(targetUri.fsPath),
  { viewColumn: column }
);
```

这让双击文件仍保持原生编辑器体验；只有用户显式选择 Vibe 命令、CodeLens、右键菜单或 `Reopen With...` 时才进入 Vibe editor。

---

## customTextEditorProvider.ts — Custom Text Editor

### 文档模型

Vibe editor 使用 VS Code 标准 `TextDocument` 作为唯一文档模型。Webview 不再通过 `openTextDocument(uri)` 自行打开原文件，也不再创建普通 `WebviewPanel`。这样 dirty 状态、保存、hot exit、revert 和多 editor 同步都由 VS Code 原生工作副本承担。

### 打开流程

```
resolveCustomTextEditor(document, panel)
  │
  ├── 1. 配置 webview HTML、脚本、样式和 localResourceRoots
  ├── 2. webview ready 后发送 document.getText()
  ├── 3. 监听 webview edit/save 消息
  └── 4. 监听 onDidChangeTextDocument 同步外部变化和 split editor
```

### 编辑回写

Webview 发送完整内容，扩展宿主将它转换为增量 edit：

```typescript
const applied = await applyTextDocumentContent(document, content);
```

`applyTextDocumentContent()` 内部使用 `fast-diff` 生成插入/删除操作，避免全量替换。

### 保存

Webview 的 `Cmd+S` / `Ctrl+S` 会先 flush 当前前端内容，再调用：

```typescript
await document.save();
```

因为这是 custom editor 传入的 `TextDocument`，保存不会额外拉起原生文本 tab。

### 模式切换

`toggleMode()` 遍历当前 custom editor panels，向 active panel 发送：

```typescript
panel.webview.postMessage({ type: 'toggleMode' });
```

---

## webviewHost.ts — Webview 宿主配置

`configureEditorWebview()` 统一配置：

- `enableScripts: true`
- dist 与 webview-assets 资源根
- 当前文件目录与 workspace folders
- CSP、CSS、JS 和 root 容器 HTML

`getResourceBaseUri()` 用于让 Webview 解析 Markdown 中的相对图片路径。

---

## utils.ts — 工具函数

### getNonce()

生成 32 位随机字符串，用于 CSP nonce。

### buildPreviewHtml()

构建 Webview 的 HTML 模板，包含 CSP、CSS、`<div id="root">` 和带 nonce 的 script 标签。

### resolveImageSrc()

解析图片 URL：

- HTTP(S) URL 和 data URI 直接返回
- 相对路径拼接 `baseUri` 前缀

---

## 相关文档

- [架构设计](./Architecture.md) — 整体架构与数据流
- [Webview UI 层](./Webview-UI.md) — Webview 侧的实现
- [API 参考](./API-Reference.md) — 命令和消息协议
