# 样式系统

Webview 的项目样式集中在 `webview/styles/main.css`。第三方样式由入口或 lazy 模块导入，Vite 会把入口 CSS 输出为 `webview.css`，把 lazy 模块产生的 CSS 输出到 `chunks/`。

## 样式导入

入口文件 `webview/index.tsx` 导入三类样式：

```ts
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';
import './styles/main.css';
```

Excalidraw 样式由使用 Excalidraw 的模块自己导入：

- `webview/ExcalidrawEditor.tsx`
- `webview/ExcalidrawBlock.tsx`

## main.css 开头

`main.css` 以 Tailwind v4 开头：

```css
@import "tailwindcss";
@source "../../node_modules/streamdown/dist";
```

`@source` 让 Tailwind 扫描 Streamdown 的 dist 输出，从而生成 Streamdown 内部使用的工具类。

## 设计令牌

`@theme` 块定义三组颜色变量：

| 命名 | 用途 |
| --- | --- |
| `--color-foreground`、`--color-muted` 等 | Streamdown 语义色彩，必须匹配 Streamdown 内部类名 |
| `--color-vsc-*` | VS Code 主题变量的项目内映射 |
| `--color-cursor-*` | 项目自定义的文本、背景和边框层级 |

这些 token 都直接或间接来自 `--vscode-*` 变量，因此 Webview 会跟随 VS Code 主题变化。

## 根布局

`#root` 默认设置 `max-w-[900px] mx-auto px-8 pt-4 pb-16`。当根节点包含 `.excalidraw-fullscreen-container` 或 `.csv-viewer-container` 时，CSS 使用 `:has()` 把布局切到 `max-w-none p-0 m-0`，让 CSV 和 Excalidraw 占满 Webview。

## 共享排版

`.vd-typography` 是 Markdown Preview 和 Milkdown WYSIWYG 共用的排版层。它定义标题、段落、链接、行内代码、代码块、blockquote、列表、任务复选框、表格和图片等基础样式。`MarkdownPreview` 中的 `.markdown-section` 和 WYSIWYG 中的 ProseMirror 容器都使用这套样式。

## Streamdown 覆盖

`main.css` 针对 `data-streamdown` 属性覆盖 Streamdown 输出。当前代码覆盖了代码块、代码块操作栏、blockquote、链接、SVG、Mermaid 标签和任务复选框等元素。

## Shiki 主题切换

高亮结果中可能包含 `.shiki-light` 和 `.shiki-dark`。CSS 同时兼容 `body` 和 `html` 上的 VS Code 主题类：

```css
body.vscode-light .shiki .shiki-dark,
body:not(.vscode-dark):not(.vscode-high-contrast) .shiki .shiki-dark,
html.vscode-light .shiki .shiki-dark,
html:not(.vscode-dark):not(.vscode-high-contrast) .shiki .shiki-dark { display: none; }

body.vscode-dark .shiki .shiki-light,
body.vscode-high-contrast .shiki .shiki-light,
html.vscode-dark .shiki .shiki-light,
html.vscode-high-contrast .shiki .shiki-light { display: none; }
```

CSS 还为 dark/high-contrast 下带 `--shiki-dark` style 的 token 强制使用暗色 token。

## 组件区域

`main.css` 包含以下主要区域：

- Base reset 和滚动条。
- `.vd-typography` 共享排版。
- Markdown 容器、编辑容器和空状态。
- Toolbar。
- Streamdown 和 Shiki 覆盖。
- Mermaid 预览、全屏和缩放控制。
- Markdown 内嵌 Excalidraw 渲染。
- 独立 Excalidraw 全屏容器。
- CSV 工具栏、虚拟网格、单元格、编辑器、上下文菜单和拖拽指示线。
- 搜索面板和 DOM 高亮样式。
- Milkdown/ProseMirror 覆盖。

## 主题来源

`ThemeContext` 不读取 CSS 变量。它只监听 `document.body` 的 class，并把 `vscode-dark` 或 `vscode-high-contrast` 映射为 `isDark = true`。Mermaid 和 Excalidraw 组件用这个布尔值选择暗色配置。

## 修改规则

新增项目样式应优先放入 `main.css` 并复用已有 `--color-vsc-*` 或 `--color-cursor-*` token。新增会被 Streamdown 使用的 Tailwind 颜色类时，应先在 `@theme` 中声明对应 `--color-*` 变量。
