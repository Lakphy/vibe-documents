# 编辑器模式

本页只描述 Markdown 文件的两种模式。CSV 和 `.excalidraw` 文件没有 Preview/WYSIWYG 切换逻辑。

## 模式表

| 模式 | 组件 | 可编辑 | 说明 |
| --- | --- | --- | --- |
| `preview` | Streamdown | 否 | 默认模式，用于渲染 Markdown |
| `wysiwyg` | Milkdown | 是 | 首次切换时 lazy 加载，之后保持挂载 |

## 模式状态

`MarkdownPreview` 内部定义：

```ts
const MARKDOWN_MODES: EditorMode[] = ['preview', 'wysiwyg'];
const [mode, setMode] = useState<EditorMode>('preview');
const visitedModes = useRef(new Set<EditorMode>(['preview']));
```

Preview 一直存在于 DOM 中，只通过 `display` 控制可见性。WYSIWYG 只有在首次访问后才挂载，挂载后也通过 `display` 控制可见性。

## 模式切换入口

顶部 `Toolbar` 直接调用 `setMode(targetMode)`。扩展宿主的 `vibeDocuments.toggleMode` 命令会向当前 active panel 发送 `{ type: 'toggleMode' }`，`MarkdownPreview` 订阅该消息并在 `preview -> wysiwyg -> preview` 间循环。

## Preview 模式

Preview 模式使用 Streamdown。它把 Markdown 内容作为 children 传入 `<Streamdown>`，并配置自定义组件、插件、Mermaid 主题、Shiki 主题和 lucide icons。

Preview 会按内容启用插件：

| 条件 | 插件 |
| --- | --- |
| 内容匹配数学语法正则 | `@streamdown/math` |
| 内容包含 CJK 字符范围 | `@streamdown/cjk` |
| 始终 | `codePlugin` |
| 始终 | `mermaid` 和 `excalidraw` 代码块 renderer |

## Preview 中的特殊代码块

`mermaid` 代码块由 `MermaidBlock` 渲染。该组件负责懒渲染、缓存、源码视图、复制、全屏和缩放平移。`excalidraw` 代码块由 `ExcalidrawBlock` 渲染。该组件解析代码块中的 JSON，并在有效时加载 `@excalidraw/excalidraw` 的只读画布。

## WYSIWYG 模式

WYSIWYG 模式使用 Milkdown v7。当前代码启用 commonmark、gfm、listener、history、clipboard、indent、trailing、自定义代码块 NodeView、自定义表格 NodeView 和图片 NodeView。

WYSIWYG 不启用 Milkdown 数学插件，也不把 Mermaid 或 Excalidraw 变成专用编辑节点。数学、Mermaid 和 Excalidraw 内容在 WYSIWYG 中按 Markdown 文本或代码块编辑，最终渲染效果以 Preview 模式为准。

## 编辑回写

Milkdown 的 `markdownUpdated` 回调会在内容真的变化时发送 `{ type: 'edit', content: markdown }`。以下情况不会发送 edit：

- 当前更新来自外部 update。
- 新 Markdown 与 `prevMarkdown` 相同。
- 新 Markdown 与 `lastSentContent.current` 相同。

外部 update 到达时，Milkdown 会在编辑器已加载且内容不同的情况下执行 `replaceAll(msg.content)`。

## 搜索与全选

Markdown 模式下 `Ctrl/Cmd+F` 会打开 `SearchWidget`。搜索逻辑在 preview 模式优先搜索 `.markdown-section`，在 wysiwyg 模式优先搜索 `.ProseMirror`。`useCodeBlockSelectAll()` 在两种模式下都启用，用于实现代码块内的两阶段 `Ctrl/Cmd+A`。

## 空内容

当 content 为空且当前模式是 preview 时，`MarkdownPreview` 不渲染 Streamdown，而是显示 `Waiting for content...`。
