# 架构设计

> Vibe Documents 采用 VS Code Webview Extension 的标准双进程架构。扩展宿主运行在 Node.js 进程中，UI 渲染在独立的 Webview（Chromium）进程中。扩展使用 **Custom Text Editor** 接口承载所有支持的文件类型（Markdown / CSV / Excalidraw），文档模型由 VS Code 注入的 `TextDocument` 统一管理。

---

## 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│                     VS Code / Cursor                          │
│                                                               │
│  ┌──────────────────────┐    ┌────────────────────────────┐   │
│  │   Extension Host     │    │      Webview (Chromium)    │   │
│  │   (Node.js 进程)      │    │      (Browser 进程)         │   │
│  │                      │    │                            │   │
│  │  ┌────────────────┐  │    │  ┌──────────────────────┐  │   │
│  │  │ extension.ts   │  │    │  │       App.tsx         │  │   │
│  │  │ 5 命令 + Custom│  │    │  │  按 fileType 路由      │  │   │
│  │  │  Editor 注册   │  │    │  └──────────────────────┘  │   │
│  │  └───────┬────────┘  │    │   ┌──────────────────┐    │   │
│  │          │           │     │  │ Markdown:         │    │   │
│  │  ┌───────▼────────┐  │◄───►│  │  Preview (Stream- │    │   │
│  │  │ Custom Text    │  │消息 │  │  down)            │    │   │
│  │  │ EditorProvider │  │通信 │  │  WYSIWYG (Milk-   │    │   │
│  │  │ (单例处理 3 种  │  │     │  │  down)            │    │   │
│  │  │  viewType)     │  │     │  ├──────────────────┤    │   │
│  │  └───────┬────────┘  │     │  │ CSV: CsvViewer    │    │   │
│  │          │           │     │  │ Excalidraw:       │    │   │
│  │  ┌───────▼────────┐  │     │  │  ExcalidrawEditor │    │   │
│  │  │textDocumentEdits│ │     │  └──────────────────┘    │   │
│  │  │ (fast-diff 增量)│ │     │                          │   │
│  │  ├────────────────┤  │     │                          │   │
│  │  │ webviewHost.ts │  │     │                          │   │
│  │  │ utils.ts       │  │     │                          │   │
│  │  └────────────────┘  │     │                          │   │
│  └──────────────────────┘    └────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐    │
│  │                  文件系统 (.md / .csv / .excalidraw)   │    │
│  └───────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

---

## 进程模型

### Extension Host（扩展宿主）

运行环境：Node.js（VS Code 主进程）

职责：
- **命令注册** — 注册 `showPreview`、`showPreviewToSide`、`showExcalidrawPreview`、`showCsvPreview`、`toggleMode` 共 5 个命令
- **Custom Text Editor 注册** — 注册 `vibeDocuments.markdownEditor` / `vibeDocuments.csvEditor` / `vibeDocuments.excalidrawEditor` 三个 `viewType`，全部 `priority: option`，由同一个 `VibeCustomTextEditorProvider` 实例处理
- **CodeLens 注册** — 在文件顶部注入 "Open with Vibe..." 行级按钮（按 language 注册 Markdown，按 `**/*.csv` / `**/*.excalidraw` glob 注册 CSV 和 Excalidraw）
- **文档同步** — 监听 VS Code 注入的 `TextDocument` 的 `onDidChangeTextDocument`，推送到 Webview
- **双向消息通信** — 处理 Webview 发来的 `ready` / `edit` / `save` 消息，串行执行以避免交错
- **安全策略** — CSP（Content Security Policy）配置、`nonce` 生成

### Webview（前端）

运行环境：Chromium 沙箱

职责：
- **fileType 路由** — `App.tsx` 根据消息中的 `fileType` 渲染 Markdown / CSV / Excalidraw 三类编辑器（CSV 和 Excalidraw 使用 `React.lazy` 懒加载）
- **Markdown 渲染** — 通过 Streamdown 渲染只读 Preview；通过 Milkdown 提供 WYSIWYG 编辑
- **CSV 编辑** — `webview/csv/` 模块用 `useReducer` + `UndoRedoStack` 实现完整的表格编辑能力
- **Excalidraw** — `ExcalidrawEditor` 全屏编辑；`ExcalidrawBlock` 用作 Markdown 内嵌渲染
- **主题适配** — 通过 CSS 变量（Tailwind v4 `@theme`）桥接 VS Code 主题 token

---

## 数据流

### 文件 → Webview（同步方向）

```
TextDocument 变化
  │
  └─ workspace.onDidChangeTextDocument（仅当 uri 匹配本面板时）
        │
        ▼
     postDocumentContent()
        │  跳过：lastSentContent === content（且非 force）
        ▼
     panel.webview.postMessage({
       type: 'update',
       content,
       baseUri,
       fileType,     // 'markdown' | 'csv' | 'excalidraw'
     })
        │
        ▼
     Webview: window 'message' 事件
        │
        ▼
     useVsCodeMessages() 暴露 { content, baseUri, fileType }
        │
  ┌─────┴─────┬─────────────┐
  ▼           ▼             ▼
Markdown    CSV        Excalidraw
```

### 编辑 → 文件（写回方向）

```
用户在 Webview 编辑
  │
  ├─ Markdown（Milkdown）: listenerCtx.markdownUpdated()
  ├─ CSV: store dispatch → serialize() → postMessage
  └─ Excalidraw: onChange → postMessage
          │
          ▼
     postMessage({ type: 'edit', content })
          │
          ▼
  Extension: onDidReceiveMessage
          │
          ▼
  applyTextDocumentContent(document, content)
          │  内部用 fast-diff 生成最小 insert/delete/replace 集合
          ▼
  workspace.applyEdit(WorkspaceEdit)
          │
          ▼
  VS Code 更新 TextDocument（脏标记由 VS Code 自动管理）
```

保存路径：Webview 发送 `{ type: 'save', content? }`，扩展先调用 `applyTextDocumentContent`（若带 `content`），再调用 `document.save()`。

### 防循环机制

编辑同步存在潜在的无限循环风险。项目通过以下策略避免：

1. **Extension Host `lastSentContent` 去重** — 每个面板缓存上次推给 Webview 的内容，相同则不重复推送（强制场景例外，如 `ready` 触发的首次推送）
2. **Webview 各编辑器内部去重** — Milkdown / CSV / Excalidraw 都各自记录 `lastSentContent`，在收到 `update` 时若与编辑器当前值相同则跳过
3. **`isExternalUpdate` 标志** — Milkdown 在 `replaceAll()` 期间设置标志，阻止 `markdownUpdated` 触发回写
4. **消息串行队列** — `customTextEditorProvider` 中 `webviewMessageQueue: Promise<unknown>` 串行执行 `edit` 和 `save`，避免保存时和编辑回写交错

---

## 安全模型

### Content Security Policy

`buildPreviewHtml()` 在 Webview HTML 中注入如下 CSP：

```
default-src 'none';
img-src ${cspSource} https: data: blob:;
media-src ${cspSource} https: blob:;
script-src ${cspSource} 'nonce-${nonce}' 'unsafe-eval';
style-src ${cspSource} 'unsafe-inline';
font-src ${cspSource} https: data:;
```

- **脚本** — 来自 webview 资源根的 JS 或带正确 `nonce` 的 `<script>` 标签可执行；`'unsafe-eval'` 用于 Mermaid / KaTeX 等运行时编译
- **样式** — 允许内联样式（Streamdown / Milkdown / Tailwind v4 动态注入）
- **图片/媒体** — 允许扩展资源、HTTPS、`data:` 和 `blob:`
- **字体** — 允许扩展资源、HTTPS 和 `data:`

### Nonce 机制

`getNonce()` 生成长度 32、字符集 `A-Za-z0-9` 的随机字符串，每次创建面板时重新生成。

### localResourceRoots

`configureEditorWebview()` 配置 Webview 可访问的本地文件范围：

- `<extensionPath>/dist`（构建产物根目录）
- `<extensionPath>/dist/webview-assets`（Vite 输出，存放 `webview.js` / `webview.css` / `fonts/`）
- 当前文件所在目录（用于解析 Markdown 中的相对路径图片）
- 所有工作区 `workspaceFolders`

---

## 模块依赖关系

```
extension.ts
  ├─► customTextEditorProvider.ts
  │     ├─► textDocumentEdits.ts (fast-diff)
  │     ├─► webviewHost.ts
  │     │     └─► utils.ts (getNonce, buildPreviewHtml)
  │     └─► editorTypes.ts (inferFileType)
  ├─► codeLensProvider.ts (PreviewCodeLensProvider × 3)
  └─► editorTypes.ts (CUSTOM_EDITOR_VIEW_TYPES, getCustomEditorViewType)

webview/index.tsx (入口)
  └─► App.tsx
        ├─► hooks.tsx
        ├─► messageBus.ts
        ├─► vscodeApi.ts
        ├─► Toolbar.tsx
        ├─► search/{useSearch, SearchWidget, domHighlighter, regexUtils}
        ├─► MermaidBlock.tsx / ExcalidrawBlock.tsx
        ├─► MilkdownEditor.tsx (lazy)
        ├─► ExcalidrawEditor.tsx (lazy)
        └─► CsvViewer.tsx (lazy)
              └─► csv/{store, parser, history, VirtualGrid, ...}
```

> `src/utils.ts` 中的 `resolveImageSrc` 被 Webview 端通过 `import '../src/utils'` 直接使用，是唯一的跨进程共享模块。

---

## 相关文档

- [扩展宿主层](./Extension-Host.md) — Extension Host 详细实现
- [Webview UI 层](./Webview-UI.md) — Webview 详细实现
- [编辑器模式](./Editor-Modes.md) — Markdown 两种模式的技术细节
