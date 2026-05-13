# Webview UI 层

Webview UI 是一个 React 18 应用。入口文件只挂载 `ThemeProvider` 和 `App`，具体编辑器在收到扩展宿主的首个 `update` 后才按文件类型加载。

## 入口

`webview/index.tsx` 导入：

```ts
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';
import './styles/main.css';
```

Excalidraw 的 CSS 不在入口文件中导入。全屏 Excalidraw 编辑器和 Markdown 内嵌 Excalidraw 渲染器分别在自己的 lazy 模块中导入 `@excalidraw/excalidraw/index.css`。

## 根组件

`App.tsx` 只负责路由和保存快捷键：

1. 调用 `useVsCodeMessages()` 获取 `content`、`baseUri`、`fileType` 和 `hasReceivedUpdate`。
2. 用 `useDeferredValue()` 延迟消费 content。
3. 调用 `useSaveShortcut()` 安装保存快捷键。
4. 在 `hasReceivedUpdate` 为 false 时显示 `Loading...`。
5. 按 `fileType` lazy 渲染 `MarkdownPreview`、`CsvViewer` 或 `ExcalidrawEditor`。

## 消息 Hook

`useVsCodeMessages()` 挂载时订阅 `messageBus` 的 `update` 消息，并向 VS Code API 发送 `{ type: 'ready' }`。只有当 update 消息携带 `content !== undefined` 时，它才会更新状态并把 `hasReceivedUpdate` 设为 true。未携带 `baseUri` 或 `fileType` 的 update 会保留旧值。

## MarkdownPreview

`MarkdownPreview.tsx` 管理 Markdown 的两种模式、搜索、代码块全选和 Streamdown 插件。

| 逻辑 | 代码行为 |
| --- | --- |
| 初始模式 | `preview` |
| 模式集合 | `['preview', 'wysiwyg']` |
| 工具栏 | `Toolbar` 直接调用 `setMode()` |
| 快捷键切换 | 订阅 `toggleMode` 消息，在两种模式间循环 |
| WYSIWYG 挂载 | 首次访问后加入 `visitedModes`，之后只用 `display` 隐藏 |
| Markdown 搜索 | `Ctrl/Cmd+F` 打开 `SearchWidget` |
| 代码块全选 | preview 和 wysiwyg 均启用 `useCodeBlockSelectAll()` |

当 content 为空且模式为 preview 时，组件显示 `Waiting for content...`。

## Streamdown 配置

`MarkdownPreview` 给 Streamdown 传入：

- `components`：来自 `useMarkdownComponents(baseUri)`。
- `plugins.code`：来自 `codePlugin`。
- `plugins.math`：仅当内容看起来包含 `$...$`、`$$...$$`、`\(` 或 `\[` 时加入。
- `plugins.cjk`：仅当内容包含 CJK 相关字符时加入。
- `plugins.renderers`：为 `mermaid` 和 `excalidraw` 代码块注册 lazy renderer。
- `mermaid`：传递与 VS Code 暗色状态匹配的 Mermaid 主题配置。
- `shikiTheme`：传递 `CODE_HIGHLIGHT_THEMES`。
- `icons`：传递 Streamdown 需要的 lucide icon 映射。

## Markdown 组件覆盖

`useMarkdownComponents(baseUri)` 返回三个组件：

| 标签 | 行为 |
| --- | --- |
| `img` | 用 `resolveImageSrc()` 解析相对路径，并设置 `loading="lazy"` |
| `a` | 设置 `className="markdown-link"`、`target="_blank"` 和 `rel="noopener noreferrer"` |
| `table` | 包裹 `markdown-table-container` 和 `markdown-table-wrapper`，内部 table 使用 `markdown-table` |

## Shiki 高亮

`webview/codeHighlighter.ts` 创建 Streamdown code highlighter 插件。插件暴露 `getThemes()`、`getSupportedLanguages()`、`supportsLanguage()` 和 `highlight()`。支持语言由 `languageLoaders` 定义，常用别名由 `languageAliases` 映射到内置语言。

`highlight()` 对文本或未知语言同步返回 plaintext tokens。对支持的语言先返回 `null`，随后懒加载 Shiki 高亮器并通过 callback 返回结果。相同代码、语言和主题组合会走结果缓存；同一个 in-flight 请求会把多个 callback 合并到一个 Set 中。

## MermaidBlock

`MermaidBlock.tsx` 渲染 Markdown 中的 `mermaid` 代码块。组件在浏览器支持 IntersectionObserver 时会等到块进入 `rootMargin: '300px'` 范围再渲染。渲染结果按 `configKey + normalizedCode` 缓存。配置变化时才调用 `mermaid.initialize()`。

Mermaid 预览支持源码/预览切换、复制源码、全屏、鼠标滚轮缩放、触控板平移、拖拽平移和重置视图。渲染失败时显示 `Mermaid render error`，不会打开全屏。

## MilkdownEditor

`MilkdownEditor.tsx` 使用 Milkdown v7。它启用 commonmark、gfm、listener、history、clipboard、indent、trailing、自定义代码块 NodeView、自定义表格 NodeView 和图片 NodeView。它没有启用 Milkdown 数学或图表插件；特殊语言代码块在 WYSIWYG 中以代码块形式编辑。

Milkdown 内容变更时发送 `{ type: 'edit', content: markdown }`。外部 update 到达时，如果编辑器当前 Markdown 与消息内容不同，则用 `replaceAll()` 替换，并用 `isExternalUpdate` 阻止回写循环。

## CSV 编辑器

`CsvViewer.tsx` 使用 `useCsvStore()` 管理 CSV 数据、历史栈、排序和搜索。初次有内容但没有 headers 时会调用 `initFromContent(content)`。外部 content 与 `lastContentRef` 不同时会重新解析。内部编辑会在 500ms 后序列化并发送 edit。

`VirtualGrid.tsx` 使用 `@tanstack/react-virtual` 分别虚拟化行和列。排序后的可视行通过 `sortedToSourceMap` 映射回源行；编辑、粘贴、删除和搜索高亮都使用这个映射保持源数据正确。

## Excalidraw 编辑器

`ExcalidrawEditor.tsx` 解析 `.excalidraw` JSON。空 content 显示 `Waiting for content...`，JSON 解析失败显示 `Invalid Excalidraw JSON. Please fix the file content.`。有效内容会传给 lazy 加载的 `Excalidraw` 组件。`onChange` 保存 pending scene，并在 300ms 后序列化为 `{ type: 'excalidraw', version: 2, elements, appState, files }`。

## 主题

`ThemeProvider` 监听 `document.body` 上的 `vscode-dark` 和 `vscode-high-contrast` 类。只要 body 包含其中任意一个类，`useIsDark()` 返回 true。

## VS Code API

`getVsCodeApi()` 缓存 `acquireVsCodeApi()` 的返回值。环境中没有 `acquireVsCodeApi` 时返回 `undefined`，测试和普通浏览器环境不会抛错。
