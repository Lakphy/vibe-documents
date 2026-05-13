# 编辑器模式

> 本文档介绍 Markdown 的两种渲染模式。CSV 和 Excalidraw 各自只有单一编辑器，不在本文档讨论范围内。

---

## 模式概览

| 模式 | 引擎 | 可编辑 | 适用场景 |
|------|------|--------|----------|
| **Preview** | Streamdown | 否 | 阅读、查看最终效果 |
| **WYSIWYG** | Milkdown v7 (ProseMirror) | 是 | 所见即所得编辑 |

---

## Preview 模式（预览）

### 渲染引擎

使用 [Streamdown](https://www.npmjs.com/package/streamdown) 将 Markdown 渲染为 React 组件树。

### 插件体系

```typescript
const plugins = useMemo(() => ({
  code: codePlugin,    // @streamdown/code 自定义封装，加载 Shiki 双主题
  math,                // @streamdown/math — KaTeX
  cjk,                 // @streamdown/cjk — CJK 排版
  renderers: [
    { language: 'mermaid',    component: MermaidRenderer },
    { language: 'excalidraw', component: ExcalidrawRenderer },
  ],
}), [MermaidRenderer]);
```

Mermaid 在 Preview 中作为代码块语言渲染（由 `MermaidBlock.tsx` 提供缩放、全屏、复制源码等高级功能），并非通过传统的 `streamdown/mermaid` 插件参数。

Streamdown 顶层 props 包括：

```tsx
<Streamdown
  components={components}
  plugins={plugins}
  mermaid={mermaidOptions}            // 仅传递主题配置给内置 mermaid 主题
  shikiTheme={CODE_HIGHLIGHT_THEMES}  // ['github-light', 'github-dark']
  icons={lucideIcons}
>
  {content}
</Streamdown>
```

### 自定义组件（`useMarkdownComponents`）

| 组件 | 行为 |
|------|------|
| `img` | `resolveImageSrc(src, baseUri)` 解析相对路径 + `loading="lazy"` |
| `a` | `target="_blank"` + `rel="noopener noreferrer"` |
| `table` | `markdown-table-container` / `markdown-table-wrapper` 实现水平滚动 |

### 代码高亮双主题

Shiki 配置 `['github-light', 'github-dark']`。CSS（`webview/styles/main.css`）根据 `<html>` 上的 `vscode-light` / `vscode-dark` 类切换显示哪一套高亮 DOM。

---

## WYSIWYG 模式（所见即所得）

### 渲染引擎

使用 [Milkdown](https://milkdown.dev/) v7（基于 ProseMirror）。

### 组件结构

```
MilkdownEditor
└── MilkdownProvider
    └── Milkdown （ProseMirror 视图）
```

### 插件清单

`MilkdownEditor.tsx` 实际使用的插件（参见源码 import）：

```typescript
Editor.make()
  .use(commonmark)      // CommonMark 基础语法
  .use(gfm)             // GitHub Flavored Markdown（删除线、表格等）
  .use(listener)        // 内容变更监听（markdownUpdated）
  .use(history)         // Undo/Redo
  .use(clipboard)       // 剪贴板
  .use(indent)          // 缩进
  .use(trailing)        // 尾随空行管理
  .use(codeBlockNodeView)   // 自定义 NodeView（来自 editableCodeBlockNodeView.ts）
  .use(tableNodeView)       // 自定义 table / row / header 等 NodeView
  // ...
```

`MilkdownEditor` 不直接 `.use(math)` 或 `.use(diagram)`：数学公式和图表在 WYSIWYG 模式下以原始代码块形式编辑（通过自定义 `codeBlockNodeView` 提供编辑友好的语法高亮）。

### 内容同步机制

#### 初始化

```typescript
ctx.set(defaultValueCtx, initialContent);
```

#### 编辑 → 回写

```typescript
ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
  if (isExternalUpdate.current) return;
  if (markdown === prevMarkdown) return;
  if (markdown === lastSentContent.current) return;
  lastSentContent.current = markdown;
  getVsCodeApi()?.postMessage({ type: 'edit', content: markdown });
});
```

#### 外部更新 → 编辑器

```typescript
const currentMarkdown = editor.action(getMarkdown());
if (currentMarkdown === msg.content) return;
isExternalUpdate.current = true;
editor.action(replaceAll(msg.content));
isExternalUpdate.current = false;
```

### 防循环策略

| 标志 | 用途 |
|------|------|
| `isExternalUpdate` | 外部更新时为 `true`，阻止 `markdownUpdated` 触发回写 |
| `lastSentContent` | 缓存上次发送的内容，相同内容不重复发送 |
| 内容比对 | `markdown === prevMarkdown` 和 `getMarkdown() === msg.content` |

---

## 模式切换

### 工具栏切换

`Toolbar.tsx` 按钮直接调用 `setMode(targetMode)`。

### 快捷键循环切换

`Ctrl/Cmd+Shift+E` → 扩展宿主 `provider.toggleMode()` → `panel.webview.postMessage({type:'toggleMode'})` → `messageBus.subscribe('toggleMode')` 切换：

```
preview → wysiwyg → preview → ...
```

### 切换时的挂载策略

- **Preview** 始终挂载（`display: block | none`）
- **WYSIWYG** 首次访问时进入 `visitedModes`，挂载后保留；后续切换通过 `display` 显隐而非卸载，避免重复初始化 ProseMirror

---

## 相关文档

- [Webview UI 层](./Webview-UI.md) — 组件树与 Hooks
- [样式系统](./Styling-System.md) — 各模式的样式实现
- [架构设计](./Architecture.md) — 数据流与防循环机制
