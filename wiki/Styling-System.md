# 样式系统

> Vibe Documents 的样式系统通过 CSS 变量桥接实现 VS Code 主题自适应，完美复刻 Cursor 的 Markdown 渲染风格。

---

## 样式文件一览

| 文件 | 职责 | 加载顺序 |
|------|------|----------|
| `katex/dist/katex.min.css` | KaTeX 数学公式样式 | 1（第三方库） |
| `streamdown/styles.css` | Streamdown 基础样式 | 2（第三方库） |
| `theme-bridge.css` | Cursor 设计令牌 → VS Code 变量桥接 | 3 |
| `streamdown-controls.css` | Streamdown 控件和 Tailwind 工具类 | 4 |
| `toolbar.css` | 工具栏样式 | 5 |
| `milkdown-overrides.css` | Milkdown WYSIWYG 编辑器样式覆盖 | 6 |
| `cursor-markdown.css` | Cursor 风格 Markdown 样式（最高优先级） | 7 |

> CSS 加载顺序决定了样式优先级。`cursor-markdown.css` 最后加载，其规则拥有最高覆盖权。

---

## 设计令牌系统 — theme-bridge.css

这是整个样式系统的基石。定义了一套 `--cursor-*` 命名空间的 CSS 变量，它们映射到 VS Code 注入的 `--vscode-*` 变量。

### 颜色调色板

```css
:root {
  --cursor-red:     var(--vscode-charts-red, #f14c4c);
  --cursor-orange:  var(--vscode-charts-orange, #d18616);
  --cursor-yellow:  var(--vscode-charts-yellow, #cca700);
  --cursor-green:   var(--vscode-charts-green, #89d185);
  --cursor-cyan:    var(--vscode-terminal-ansiCyan, #29b8db);
  --cursor-blue:    var(--vscode-terminal-ansiBlue, #3794ff);
  --cursor-magenta: var(--vscode-terminal-ansiMagenta, #bc89bd);
  --cursor-purple:  var(--vscode-charts-purple, #b180d7);
}
```

### 文本颜色层级

使用 `color-mix()` 函数创建不同透明度层级：

```css
--cursor-text-primary:    var(--vscode-foreground, #cccccc);           /* 100% */
--cursor-text-secondary:  color-mix(in srgb, foreground 74%, transparent);
--cursor-text-tertiary:   color-mix(in srgb, foreground 54%, transparent);
--cursor-text-quaternary: color-mix(in srgb, foreground 36%, transparent);
```

### 背景色层级

```css
--cursor-bg-primary:    color-mix(in srgb, foreground 20%, transparent);
--cursor-bg-secondary:  color-mix(in srgb, foreground 14%, transparent);
--cursor-bg-tertiary:   color-mix(in srgb, foreground 8%, transparent);
--cursor-bg-quaternary: color-mix(in srgb, foreground 6%, transparent);
--cursor-bg-elevated:   var(--vscode-dropdown-background);
```

### 边框颜色层级

```css
--cursor-stroke-primary:    color-mix(in srgb, foreground 20%, transparent);
--cursor-stroke-secondary:  color-mix(in srgb, foreground 12%, transparent);
--cursor-stroke-tertiary:   color-mix(in srgb, foreground 8%, transparent);
--cursor-stroke-quaternary: color-mix(in srgb, foreground 4%, transparent);
```

> 这套层级系统确保明暗主题下都有合适的对比度，因为所有透明度都基于 `--vscode-foreground` 计算。

---

## Streamdown 控件样式 — streamdown-controls.css

### Tailwind 工具类模拟

Streamdown 内部使用 Tailwind 类名，但 Webview 中没有 Tailwind 运行时。此文件手工实现了 Streamdown 依赖的所有工具类：

```css
.flex { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
.rounded-lg { border-radius: 0.5rem; }
/* ... 约 80+ 工具类 */
```

### 语义颜色令牌

映射 Streamdown 的语义变量到 VS Code 主题：

```css
:root {
  --color-foreground:          var(--vscode-editor-foreground);
  --color-muted-foreground:    var(--cursor-text-tertiary);
  --color-background:          var(--vscode-editor-background);
  --color-muted:               var(--cursor-bg-tertiary);
  --color-primary:             var(--vscode-button-background);
  --color-primary-foreground:  var(--vscode-button-foreground);
  --color-border:              var(--cursor-stroke-tertiary);
  --color-card:                var(--cursor-bg-elevated);
}
```

### 代码块操作按钮

复制按钮等操作按钮默认隐藏，hover 时显示：

```css
[data-streamdown="code-block-actions"] button {
  opacity: 0;
  transition: opacity 0.15s;
}

pre:hover [data-streamdown="code-block-actions"] button {
  opacity: 1;
}
```

### Shiki 双主题

```css
html.vscode-light .shiki .shiki-dark { display: none; }
html.vscode-dark .shiki .shiki-light { display: none; }
```

VS Code Webview 会在 `<html>` 标签上自动设置 `vscode-light` 或 `vscode-dark` 类，Shiki 生成的双套高亮代码通过 CSS 显示对应主题。

---

## Cursor Markdown 样式 — cursor-markdown.css

逆向工程自 Cursor 的 `workbench.desktop.main.css`，实现了 Cursor 风格的 Markdown 渲染。

### 全局基础

```css
html, body {
  background-color: var(--vscode-editor-background);
  color: var(--markdown-foreground);
  font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, ...);
  -webkit-font-smoothing: antialiased;
}

#root {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 32px 64px;
}
```

### 标题样式

六级标题使用递减字号和一致的视觉风格：

| 级别 | 字号 | 边框 | 上边距 |
|------|------|------|--------|
| H1 | 1.6em | 底部边框 | 24px |
| H2 | 1.3em | 底部边框 | 20px |
| H3 | 1.15em | 无 | 18px |
| H4 | 1.05em | 无 | 16px |
| H5 | 0.95em | 无 | 14px |
| H6 | 0.85em | 无 | 12px |

H1 和 H2 有底部分隔线（`border-bottom`），与 GitHub 风格一致。

### 代码样式

行内代码使用 `color-mix()` 创建半透明背景：

```css
code:not(pre code) {
  background-color: color-mix(
    in srgb,
    var(--vscode-textCodeBlock-background) 80%,
    var(--vscode-input-placeholderForeground)
  );
  color: var(--vscode-textPreformat-foreground, #d7ba7d);
  border-radius: 4px;
  padding: 1.5px 4px;
}
```

### 引用块

左侧彩色边框 + 半透明背景：

```css
blockquote {
  background: var(--vscode-textBlockQuote-background);
  border-left: 4px solid var(--vscode-textBlockQuote-border);
  border-radius: 0 4px 4px 0;
}
```

### 表格

圆角边框、hover 行高亮、响应式水平滚动：

```css
.markdown-table-container {
  border-radius: 6px;
  border: 1px solid var(--cursor-stroke-tertiary);
  overflow: hidden;
}
```

### 自定义滚动条

与 VS Code 编辑器保持一致的滚动条样式：

```css
::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background);
  border-radius: 5px;
}
```

---

## Milkdown 样式覆盖 — milkdown-overrides.css

覆盖 Milkdown / ProseMirror 的默认样式，使 WYSIWYG 模式的视觉效果与 Preview 模式一致。

### 主题重置

```css
.milkdown {
  --color-surface: var(--vscode-editor-background) !important;
  --color-primary: var(--vscode-textLink-foreground) !important;
  --color-solid: var(--vscode-editor-foreground) !important;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}
```

### 布局容器

```css
.vd-milkdown-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 32px 64px;
}
```

### ProseMirror 样式

`.ProseMirror` 下的所有元素样式与 `.markdown-section` 保持一致，包括标题、段落、代码块、引用、表格等。

---

## 工具栏样式 — toolbar.css

### 固定定位

```css
.vd-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}
```

### 按钮组

分组容器使用圆角背景，按钮切换使用 active 状态样式：

```css
.vd-toolbar-group {
  background: var(--cursor-bg-tertiary);
  border-radius: 6px;
  padding: 2px;
}

.vd-toolbar-btn--active {
  background: var(--vscode-editor-background);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
```

---

## 主题适配原理

```
VS Code 主题引擎
  │
  ├── 注入 --vscode-* CSS 变量到 Webview <html>
  ├── 设置 html.vscode-light / html.vscode-dark 类
  │
  ▼
theme-bridge.css
  │
  ├── 映射为 --cursor-* 设计令牌
  │
  ▼
各样式文件
  │
  ├── 使用 --cursor-* 和 --vscode-* 变量
  ├── 明暗主题自动适配
  └── 所有颜色保持与宿主编辑器一致
```

> 不需要手动检测主题。VS Code 自动注入变量和 CSS 类，所有样式通过变量引用自动跟随主题切换。

---

## 相关文档

- [架构设计](./Architecture.md) — 安全模型和 CSP
- [编辑器模式](./Editor-Modes.md) — 各模式的样式需求
- [贡献指南](./Contributing.md) — 添加新样式的规范
