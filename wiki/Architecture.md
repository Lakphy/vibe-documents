# 架构设计

Vibe Documents 使用 VS Code Custom Text Editor 架构。扩展宿主运行在 Node.js Extension Host 中，React 应用运行在 Webview 中，文件内容始终以 VS Code 注入的 `TextDocument` 为准。

## 总览

```text
VS Code Extension Host
├── extension.ts
│   ├── 注册 3 个 Custom Editor viewType
│   ├── 注册 3 个 CodeLensProvider
│   └── 注册 5 个命令
├── customTextEditorProvider.ts
│   ├── 配置 Webview
│   ├── 监听 TextDocument 变化
│   ├── 处理 ready/edit/save
│   └── 向 active panel 发送 toggleMode
├── textDocumentEdits.ts
│   └── fast-diff -> WorkspaceEdit
└── webviewHost.ts / utils.ts
    └── HTML、CSP、资源根和 baseUri

Webview
├── index.tsx
│   └── ThemeProvider + App
├── App.tsx
│   └── 首次 update 后按 fileType 懒加载编辑器
├── MarkdownPreview.tsx
│   ├── Streamdown Preview
│   ├── Milkdown WYSIWYG lazy
│   ├── SearchWidget
│   ├── MermaidBlock lazy
│   └── ExcalidrawBlock lazy
├── CsvViewer.tsx
│   └── csv/* reducer、虚拟网格和工具栏
└── ExcalidrawEditor.tsx
    └── @excalidraw/excalidraw lazy
```

## Extension Host 职责

`activate()` 创建一个 `VibeCustomTextEditorProvider` 实例，并把它注册给 Markdown、CSV 和 Excalidraw 三个 viewType。注册选项使用 `retainContextWhenHidden: true` 和 `supportsMultipleEditorsPerDocument: true`。CodeLens 按 Markdown language selector、`**/*.csv` 和 `**/*.excalidraw` 注册。命令统一调用 `vscode.openWith()`，再由 `getCustomEditorViewType()` 根据扩展名选择 viewType。

## Webview 职责

`App.tsx` 通过 `useVsCodeMessages()` 等待扩展宿主的首个 `update`。在收到 update 前只显示 `Loading...`，收到后根据 `fileType` 渲染 Markdown、CSV 或 Excalidraw。三个编辑器组件都通过 `React.lazy()` 加载，Markdown 内部的 Milkdown、Mermaid 和 Excalidraw 块也按需加载。

## 文件到 Webview

```text
TextDocument change
  -> workspace.onDidChangeTextDocument
  -> uri 与当前 panel 文档匹配
  -> 50ms 内合并多次变化
  -> 如果内容不同于 lastSentContent，则 postMessage(update)
  -> messageBus 分发 update
  -> useVsCodeMessages 更新 content/baseUri/fileType/hasReceivedUpdate
  -> App/编辑器重新渲染
```

`ready` 消息会清除待发送的批量更新，并调用 `postDocumentContent(true)` 强制推送当前文档内容。这个路径用于 Webview 首次挂载，不受 `lastSentContent` 去重影响。

## Webview 到文件

```text
Webview edit
  -> postMessage({ type: 'edit', content })
  -> customTextEditorProvider 串行队列
  -> applyTextDocumentContent(document, content)
  -> createTextDocumentEdit 使用 fast-diff 生成 insert/delete
  -> vscode.workspace.applyEdit(edit)
```

Markdown WYSIWYG 在 Milkdown 的 `markdownUpdated` 回调中发送 edit。CSV 在状态变化后 500ms debounce 序列化并发送 edit。Excalidraw 在 `onChange` 后 300ms debounce 序列化并发送 edit。三个编辑器都在保存快捷键路径上提供当前内容给 `useSaveShortcut()`。

## 保存流程

Webview 拦截 `Ctrl/Cmd+S` 并发送 `{ type: 'save', content? }`。扩展端如果收到 `content`，先调用 `applyTextDocumentContent()`，成功后再调用 `document.save()`。如果 apply 或 save 失败，扩展端会通过 `vscode.window.showErrorMessage()` 报错。

## 防循环策略

| 层 | 策略 |
| --- | --- |
| Extension Host | 每个面板保存 `lastSentContent`，内容未变时不重复发送 update |
| Extension Host | `edit` 和 `save` 进入 Promise 队列串行执行 |
| Markdown WYSIWYG | `isExternalUpdate` 阻止 `replaceAll()` 产生回写 |
| Markdown WYSIWYG | `lastSentContent` 和 `prevMarkdown` 去重 |
| CSV | `lastContentRef` 和 `isExternalUpdate` 区分外部刷新与本地编辑 |
| Excalidraw | `lastSentRef`、pending scene 和 external version 避免重复发送 |

## 安全模型

`buildPreviewHtml()` 生成带 CSP 的 HTML。CSP 允许 Webview 自身资源、HTTPS 图片/媒体、`data:`、`blob:`、带 nonce 的 module script、`unsafe-eval`、内联样式和字体资源。`unsafe-eval` 保留给 Mermaid、KaTeX 或依赖运行时表达式编译的库。

```text
default-src 'none';
img-src ${cspSource} https: data: blob:;
media-src ${cspSource} https: blob:;
script-src ${cspSource} 'nonce-${nonce}' 'unsafe-eval';
style-src ${cspSource} 'unsafe-inline';
font-src ${cspSource} https: data:;
```

`localResourceRoots` 包含 `<extensionPath>/dist`、`<extensionPath>/dist/webview-assets`、当前文件所在目录和所有 workspace folder。Markdown 图片的相对路径会用当前文件目录生成的 Webview URI 作为 `baseUri`。

## 性能策略

主 Webview bundle 只负责启动、主题和路由。Markdown 预览、CSV、Excalidraw、Milkdown、Mermaid 和 Markdown 内嵌 Excalidraw 都被拆成懒加载路径。Shiki 高亮器只加载当前语言和 `vitesse-light` / `vitesse-dark` 主题，并缓存高亮器、结果和等待中的 callback。Mermaid 在进入视口附近后渲染，按配置和代码缓存 SVG。CSV 使用行列虚拟化，并在单元格编辑时增量维护搜索匹配。

## 相关文档

- [Extension Host](./Extension-Host.md)
- [Webview UI](./Webview-UI.md)
- [Build and Development](./Build-and-Development.md)
