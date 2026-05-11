# 架构设计

> Vibe Documents 采用 VS Code Webview Extension 的标准双进程架构，扩展宿主运行在 Node.js 进程中，UI 渲染在独立的 Webview（Chromium）进程中。

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code / Cursor                         │
│                                                              │
│  ┌──────────────────────┐    ┌────────────────────────────┐  │
│  │   Extension Host     │    │      Webview (Chromium)     │  │
│  │   (Node.js 进程)      │    │      (Browser 进程)         │  │
│  │                      │    │                            │  │
│  │  ┌────────────────┐  │    │  ┌──────────────────────┐  │  │
│  │  │ extension.ts   │  │    │  │     App.tsx           │  │  │
│  │  │ 命令注册        │  │    │  │  ┌────────────────┐  │  │  │
│  │  └───────┬────────┘  │    │  │  │   Toolbar      │  │  │  │
│  │          │            │    │  │  └────────────────┘  │  │  │
│  │  ┌───────▼────────┐  │    │  │  ┌────────────────┐  │  │  │
│  │  │previewProvider │  │◄──►│  │  │  Preview Mode  │  │  │  │
│  │  │ 面板管理        │  │消息│  │  │  (Streamdown)  │  │  │  │
│  │  │ 文件监听        │  │通信│  │  ├────────────────┤  │  │  │
│  │  │ 编辑同步        │  │    │  │  │  WYSIWYG Mode │  │  │  │
│  │  └───────┬────────┘  │    │  │  │  (Milkdown)   │  │  │  │
│  │          │            │    │  │  └────────────────┘  │  │  │
│  │  ┌───────▼────────┐  │    │  │                      │  │  │
│  │  │   utils.ts     │  │    │  │                      │  │  │
│  │  │ HTML 模板       │  │    │  │                      │  │  │
│  │  │ nonce 生成      │  │    │  └──────────────────────┘  │  │
│  │  └────────────────┘  │    │                            │  │
│  └──────────────────────┘    └────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                  文件系统 (.md 文件)                       ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 进程模型

### Extension Host（扩展宿主）

运行环境：Node.js

职责：
- **命令注册** — 注册 `showPreview`、`showPreviewToSide`、`toggleMode` 三个命令
- **面板生命周期管理** — 创建、复用、销毁 Webview 面板
- **文件监听** — 监听 `.md` 文件的文件系统变更和编辑器内变更
- **双向消息通信** — 推送内容到 Webview、接收 Webview 的编辑回写
- **安全策略** — CSP（Content Security Policy）配置、nonce 生成

### Webview（前端）

运行环境：Chromium 沙箱

职责：
- **内容渲染** — 通过 Streamdown 渲染 Markdown 为 HTML
- **富文本编辑** — 通过 Milkdown（ProseMirror）提供 WYSIWYG 编辑
- **主题适配** — 通过 CSS 变量桥接 VS Code 主题

---

## 数据流

### 文件 → 预览（只读方向）

```
文件变更
  │
  ├─ FileSystemWatcher.onDidChange ──┐
  │                                   ▼
  └─ workspace.onDidChangeTextDocument ──► sendContent()
                                              │
                                              ▼
                                     openTextDocument(uri)
                                              │
                                              ▼
                                     panel.webview.postMessage({
                                       type: 'update',
                                       content: markdown,
                                       baseUri: resourceBaseUri
                                     })
                                              │
                                              ▼
                                     Webview: window.message 事件
                                              │
                                       ┌──────┴──────┐
                                       ▼             ▼
                                   Preview:      Editor:
                                   Streamdown    replaceAll()
                                   重新渲染       更新内容
```

### 编辑 → 文件（写回方向）

```
用户在 Webview 编辑
  │
  └─ Milkdown: listenerCtx.markdownUpdated()
          │
          ▼
     postMessage({ type: 'edit', content })
          │
          ▼
  Extension: onDidReceiveMessage
          │
          ▼
  workspace.applyEdit(WorkspaceEdit)
          │
          ▼
  文件内容更新
```

### 防循环机制

编辑同步存在潜在的无限循环风险（Webview 编辑 → 文件更新 → 触发变更事件 → 推送回 Webview → 再次触发编辑事件...）。项目通过以下策略避免循环：

1. **`isUpdatingFromWebview` 标志** — Extension Host 侧设置一个布尔标志，在处理 Webview 回写期间阻止 `sendContent()` 重复推送
2. **`isExternalUpdate` 标志** — Webview 侧在接收外部更新时设置标志，阻止 Milkdown 的变更监听器触发回写
3. **`lastSentContent` 去重** — Webview 侧缓存上次发送的内容，相同内容不重复发送
4. **内容比对** — 推送前和接收时都做字符串相等性检查
5. **定时器保护** — `isUpdatingFromWebview` 通过 `setTimeout(100ms)` 延迟重置，确保异步操作完成

---

## 安全模型

### Content Security Policy

Webview 通过严格的 CSP 限制资源加载：

```
default-src 'none';
img-src ${cspSource} https: data: blob:;
media-src ${cspSource} https: blob:;
script-src 'nonce-${nonce}' 'unsafe-eval';
style-src ${cspSource} 'unsafe-inline';
font-src ${cspSource} https: data:;
```

- **脚本** — 仅允许带正确 nonce 的 `<script>` 标签执行（`'unsafe-eval'` 用于 Mermaid 等库）
- **样式** — 允许内联样式（Streamdown / Milkdown 动态生成的样式需要此权限）
- **图片/媒体** — 允许从扩展资源、HTTPS、data URI 和 blob URL 加载
- **字体** — 允许从扩展资源、HTTPS 和 data URI 加载

### Nonce 机制

每次创建面板时生成 32 位随机字符串，确保只有扩展注入的脚本可以执行。

### localResourceRoots

限制 Webview 可访问的本地文件范围：
- 扩展的 `dist/` 目录（构建产物）
- 当前 Markdown 文件所在目录（用于相对路径图片）
- 工作区根目录

---

## 模块依赖关系

```
extension.ts
  └─► previewProvider.ts
        └─► utils.ts (getNonce, buildPreviewHtml, resolveImageSrc)

index.tsx (入口)
  └─► App.tsx
        ├─► hooks.tsx (useVsCodeMessages, useMarkdownComponents)
        │     └─► utils.ts (resolveImageSrc)
        ├─► Toolbar.tsx
        └─► MilkdownEditor.tsx
```

> `utils.ts` 中的 `resolveImageSrc` 同时被 Extension Host 和 Webview 使用，是唯一的跨进程共享模块。

---

## 相关文档

- [扩展宿主层](./Extension-Host.md) — Extension Host 详细实现
- [Webview UI 层](./Webview-UI.md) — Webview 详细实现
- [编辑器模式](./Editor-Modes.md) — 两种模式的技术细节
