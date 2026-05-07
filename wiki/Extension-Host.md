# 扩展宿主层

> 扩展宿主层运行在 Node.js 进程中，负责命令注册、Webview 面板生命周期管理和文件双向同步。

---

## 文件概览

| 文件 | 职责 |
|------|------|
| `src/extension.ts` | 扩展入口，注册三个命令 |
| `src/previewProvider.ts` | Webview 面板的创建、管理和消息通信 |
| `src/utils.ts` | 工具函数：nonce 生成、HTML 模板构建、图片路径解析 |

---

## extension.ts — 扩展入口

### 激活条件

扩展在打开 Markdown 文件时自动激活（`onLanguage:markdown`）。

### 命令注册

`activate()` 函数注册三个命令并推入 `context.subscriptions` 自动管理生命周期：

| 命令 ID | 功能 | 打开位置 |
|---------|------|----------|
| `vibeDocuments.showPreview` | 打开预览 | 当前编辑器列 (`ViewColumn.Active`) |
| `vibeDocuments.showPreviewToSide` | 侧边打开预览 | 侧边列 (`ViewColumn.Beside`) |
| `vibeDocuments.toggleMode` | 切换模式 | N/A（操作已有面板） |

### URI 解析逻辑

`showPreview` 和 `showPreviewToSide` 命令支持两种调用方式：
1. **传入 URI** — 从右键菜单调用时，VS Code 会传入文件 URI
2. **无 URI** — 从命令面板调用时，回退到 `activeTextEditor.document.uri`

```typescript
const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
```

---

## previewProvider.ts — 面板管理

### MarkdownPreviewProvider 类

核心类，管理所有预览面板的生命周期。

#### 面板存储

```typescript
private panels = new Map<string, vscode.WebviewPanel>();
```

以 URI 字符串为 key 存储面板实例，实现面板复用：已存在的面板直接 `reveal()`，不重复创建。

#### showPreview() 方法

面板创建流程：

```
showPreview(uri, column)
  │
  ├── 1. 检查是否已有面板 → 有则 reveal() 并返回
  │
  ├── 2. 创建 WebviewPanel
  │   ├── enableScripts: true         // 允许执行脚本
  │   ├── retainContextWhenHidden: true // 隐藏时保留状态
  │   └── localResourceRoots: [...]    // 限制资源访问范围
  │
  ├── 3. 注册 onDidDispose 回调（清理 panels Map 和监听器）
  │
  ├── 4. 构建 Webview URI（webview.js + webview.css）
  │
  ├── 5. 生成 nonce，构建 HTML 模板并设置 webview.html
  │
  ├── 6. 注册消息接收处理器（onDidReceiveMessage）
  │
  ├── 7. 首次推送文件内容（sendContent()）
  │
  ├── 8. 创建文件系统监听器（FileSystemWatcher）
  │
  └── 9. 注册文本编辑器变更监听器（onDidChangeTextDocument）
```

#### sendContent() 方法

异步读取文件内容并推送到 Webview：

```typescript
const doc = await vscode.workspace.openTextDocument(uri);
const content = doc.getText();
const resourceBaseUri = panel.webview.asWebviewUri(
  vscode.Uri.file(path.dirname(uri.fsPath))
);
panel.webview.postMessage({
  type: 'update',
  content,
  baseUri: resourceBaseUri.toString(),
});
```

`baseUri` 用于 Webview 中解析相对路径的图片资源。

#### 编辑回写

接收 Webview 的 `edit` 消息，通过 `WorkspaceEdit` API 将内容写回文件：

```typescript
panel.webview.onDidReceiveMessage(async (msg) => {
  if (msg.type === 'edit' && typeof msg.content === 'string') {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      doc.positionAt(0),
      doc.positionAt(currentText.length)
    );
    edit.replace(uri, fullRange, msg.content);
    await vscode.workspace.applyEdit(edit);
  }
});
```

采用全量替换策略（替换整个文档内容），简化了 diff 计算复杂度。

#### toggleMode() 方法

遍历所有面板，找到 `active` 状态的面板并发送 `toggleMode` 消息：

```typescript
toggleMode() {
  for (const [, panel] of this.panels) {
    if (panel.active) {
      panel.webview.postMessage({ type: 'toggleMode' });
      return;
    }
  }
}
```

#### 文件监听双保险

同时监听两种文件变更事件，确保各种场景下都能更新：

| 监听器 | 触发场景 |
|--------|----------|
| `FileSystemWatcher` | 外部工具（git、终端等）修改文件 |
| `onDidChangeTextDocument` | VS Code 编辑器内编辑文件 |

---

## utils.ts — 工具函数

### getNonce()

生成 32 位随机字符串，用于 CSP nonce：

```typescript
const NONCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const NONCE_LENGTH = 32;
```

### buildPreviewHtml()

构建 Webview 的 HTML 模板，包含：
- CSP meta 标签
- CSS 链接
- `<div id="root">` 容器
- 带 nonce 的 script 标签

### resolveImageSrc()

解析图片 URL：
- HTTP(S) URL 和 data URI 直接返回
- 相对路径拼接 `baseUri` 前缀

```typescript
export function resolveImageSrc(src: string, baseUri: string): string {
  if (!src) return src;
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  if (!baseUri) return src;
  return `${baseUri}/${src}`;
}
```

---

## 面板生命周期

```
创建 ─────► 活跃 ─────► 隐藏 ─────► 销毁
  │                 ▲        │
  │                 │        │
  │              reveal()    │
  │                 │        │
  │                 └────────┘
  │                retainContextWhenHidden
  │
  └────── onDidDispose ──► 清理 Map + 释放监听器
```

`retainContextWhenHidden: true` 确保面板被其他标签页遮挡时不会销毁 Webview 状态。

---

## 相关文档

- [架构设计](./Architecture.md) — 整体架构与数据流
- [Webview UI 层](./Webview-UI.md) — Webview 侧的实现
- [API 参考](./API-Reference.md) — 命令和消息协议
