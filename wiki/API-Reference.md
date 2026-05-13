# API 参考

> 本文档列出 Vibe Documents 的所有公共 API，包括 VS Code 命令、消息协议和核心类型定义。

---

## VS Code 命令

### vibeDocuments.showPreview

在当前编辑器列打开 Markdown 预览。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.showPreview` |
| 显示标题 | Vibe: Open Markdown Preview |
| 图标 | `$(open-preview)` |
| 参数 | `uri?: vscode.Uri` — 可选，目标文件 URI |
| 触发位置 | 命令面板、资源管理器右键菜单 |

参数为空时自动使用当前活动编辑器的文档 URI。两者都为空时不执行任何操作。

### vibeDocuments.showPreviewToSide

在侧边列打开 Markdown 预览。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.showPreviewToSide` |
| 显示标题 | Vibe: Open Markdown Preview to the Side |
| 图标 | `$(open-preview)` |
| 参数 | `uri?: vscode.Uri` |
| 快捷键 | `Ctrl+Shift+V` / `Cmd+Shift+V` |
| 触发条件 | `editorLangId == markdown` |
| 触发位置 | 命令面板、编辑器标题栏、快捷键 |

### vibeDocuments.toggleMode

循环切换预览模式（Preview → WYSIWYG → Preview）。

| 属性 | 值 |
|------|-----|
| 命令 ID | `vibeDocuments.toggleMode` |
| 显示标题 | Vibe: Toggle Preview/Edit Mode |
| 图标 | `$(edit)` |
| 快捷键 | `Ctrl+Shift+E` / `Cmd+Shift+E` |
| 触发条件 | `vibeDocumentsPreviewFocused` |

---

## 菜单配置

### editor/title

```json
{
  "command": "vibeDocuments.showPreviewToSide",
  "when": "editorLangId == markdown",
  "group": "navigation"
}
```

在 Markdown 文件的编辑器标题栏显示预览按钮。

### explorer/context

```json
{
  "command": "vibeDocuments.showPreview",
  "when": "resourceLangId == markdown",
  "group": "navigation"
}
```

在 Markdown 文件的资源管理器右键菜单中添加预览选项。

---

## 消息协议

Extension Host 和 Webview 之间通过 `postMessage` 进行通信。

### Extension → Webview

#### update 消息

推送文件内容到 Webview。

```typescript
{
  type: 'update',
  content: string,     // Markdown 原始内容
  baseUri: string,     // 文件所在目录的 Webview URI（用于解析图片路径）
}
```

触发时机：
- 面板首次创建
- 文件系统变更（FileSystemWatcher）
- 编辑器内文本变更（onDidChangeTextDocument）

#### toggleMode 消息

通知 Webview 切换编辑模式。

```typescript
{
  type: 'toggleMode'
}
```

触发时机：执行 `vibeDocuments.toggleMode` 命令。

### Webview → Extension

#### edit 消息

将 Webview 中编辑的内容回写到文件。

```typescript
{
  type: 'edit',
  content: string      // 修改后的完整 Markdown 内容
}
```

触发时机：
- Milkdown 编辑器内容变更（`markdownUpdated` 回调）

---

## 核心类型

### EditorMode

```typescript
type EditorMode = 'preview' | 'wysiwyg';
```

两种编辑模式的联合类型。

### VsCodeMessage

```typescript
interface VsCodeMessage {
  type: string;
  content?: string;
  baseUri?: string;
}
```

Webview 接收的 VS Code 消息格式。

### HtmlTemplateParams

```typescript
interface HtmlTemplateParams {
  cspSource: string;   // CSP 源，来自 webview.cspSource
  nonce: string;       // 32 位随机字符串
  scriptUri: string;   // webview.js 的 URI
  cssUri: string;      // webview.css 的 URI
}
```

构建 Webview HTML 模板的参数。

### ToolbarProps

```typescript
interface ToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}
```

### MilkdownEditorProps

```typescript
interface MilkdownEditorProps {
  content: string;     // 当前 Markdown 内容
}
```

## 核心类

### VibeCustomTextEditorProvider

Custom Text Editor 管理器，使用 VS Code 传入的 `TextDocument` 作为唯一文档模型。

```typescript
class VibeCustomTextEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(context: vscode.ExtensionContext)

  // VS Code 创建 custom editor 时调用
  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void>

  // 切换当前活动 custom editor 的编辑模式
  toggleMode(): void
}
```

---

## 工具函数

### getNonce()

```typescript
function getNonce(): string
```

生成 32 位随机字符串，字符集为 `A-Za-z0-9`。用于 CSP nonce。

### buildPreviewHtml(params)

```typescript
function buildPreviewHtml(params: HtmlTemplateParams): string
```

构建 Webview 的完整 HTML 文档，包含 CSP meta 标签、CSS 链接和脚本标签。

### resolveImageSrc(src, baseUri)

```typescript
function resolveImageSrc(src: string, baseUri: string): string
```

解析图片 URL：
- 空字符串 → 原样返回
- `http://` 或 `https://` → 原样返回
- `data:` URI → 原样返回
- 其他（相对路径）→ `${baseUri}/${src}`

---

## Hooks

### useVsCodeMessages()

```typescript
function useVsCodeMessages(): {
  content: string;     // 当前 Markdown 内容
  baseUri: string;     // 资源基础 URI
}
```

监听 Extension Host 的 `update` 消息，返回最新的内容和基础 URI。

### useMarkdownComponents(baseUri)

```typescript
function useMarkdownComponents(baseUri: string): {
  img: React.FC<React.ImgHTMLAttributes<HTMLImageElement>>;
  a: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
  table: React.FC<React.TableHTMLAttributes<HTMLTableElement>>;
}
```

返回 Streamdown 自定义组件映射。`baseUri` 变化时组件会重新生成。

---

## 激活事件

```json
{
  "activationEvents": ["onLanguage:markdown"]
}
```

扩展在首次打开 Markdown 文件时激活。激活后保持活跃状态直到 VS Code 关闭。

---

## Webview 面板配置

```typescript
{
  enableScripts: true,              // 允许执行脚本
  retainContextWhenHidden: true,    // 隐藏时保留 Webview 状态
  localResourceRoots: [
    extensionPath/dist,             // 构建产物
    dirname(uri.fsPath),            // Markdown 文件所在目录
    ...workspaceFolders,            // 工作区根目录
  ],
}
```

---

## 相关文档

- [扩展宿主层](./Extension-Host.md) — API 的实现细节
- [Webview UI 层](./Webview-UI.md) — Hooks 和组件实现
- [架构设计](./Architecture.md) — 消息通信流程
