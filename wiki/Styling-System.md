# 样式系统

> Vibe Documents 仅在 Webview 中维护**单一** CSS 入口 `webview/styles/main.css`，采用 Tailwind CSS v4 + `@theme` 设计令牌的方式实现 VS Code 主题自适应。

---

## 文件清单

| 文件 | 类型 | 加载顺序 |
|------|------|----------|
| `katex/dist/katex.min.css` | 第三方 | 1 |
| `streamdown/styles.css` | 第三方 | 2 |
| `@excalidraw/excalidraw/index.css` | 第三方 | 3 |
| `webview/styles/main.css` | 项目唯一本地样式 | 4 |

CSS 导入顺序见 `webview/index.tsx`：

```typescript
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';
import '@excalidraw/excalidraw/index.css';
import './styles/main.css';
```

> 项目历史上曾拆分为 `theme-bridge.css` / `streamdown-controls.css` / `cursor-markdown.css` / `milkdown-overrides.css` / `toolbar.css`，已合并为单一 `main.css`，通过 Tailwind v4 的 `@theme {}` 机制声明设计令牌，自动生成对应工具类与 CSS 变量。

---

## main.css 结构

```css
@import "tailwindcss";

/* 让 Tailwind 扫描 Streamdown 的 dist 输出，识别其内部使用的工具类 */
@source "../../node_modules/streamdown/dist";

@theme {
  /* === Streamdown 语义色彩令牌 === */
  --color-foreground: var(--vscode-editor-foreground, #cccccc);
  --color-background: var(--vscode-editor-background, #1e1e1e);
  --color-muted: color-mix(in srgb, var(--vscode-foreground, #cccccc) 8%, transparent);
  --color-muted-foreground: color-mix(in srgb, var(--vscode-foreground, #cccccc) 54%, transparent);
  --color-primary: var(--vscode-button-background, #0e639c);
  --color-primary-foreground: var(--vscode-button-foreground, #ffffff);
  --color-sidebar: var(--vscode-sideBar-background, #252526);
  --color-border: color-mix(in srgb, var(--vscode-foreground, #cccccc) 8%, transparent);
  --color-card: var(--vscode-dropdown-background, #252526);

  /* === VS Code 原生映射（--color-vsc-* 命名空间） === */
  --color-vsc-bg: var(--vscode-editor-background, #1e1e1e);
  --color-vsc-fg: var(--vscode-editor-foreground, #cccccc);
  --color-vsc-link: var(--vscode-textLink-foreground, #3794ff);
  /* ... */

  /* === Cursor 设计令牌（--color-cursor-* 命名空间） === */
  --color-cursor-text-primary:    var(--vscode-foreground, #cccccc);
  --color-cursor-text-secondary:  color-mix(in srgb, var(--vscode-foreground) 74%, transparent);
  --color-cursor-text-tertiary:   color-mix(in srgb, var(--vscode-foreground) 54%, transparent);
  --color-cursor-text-quaternary: color-mix(in srgb, var(--vscode-foreground) 36%, transparent);
  --color-cursor-bg-primary:      color-mix(in srgb, var(--vscode-foreground) 20%, transparent);
  --color-cursor-bg-secondary:    color-mix(in srgb, var(--vscode-foreground) 14%, transparent);
  /* ... */
}

/* 之后是组件层的常规 CSS：
   .markdown-section、.markdown-table-container、.vd-toolbar-*、
   .ProseMirror 覆盖、滚动条、Mermaid 容器、CSV 网格等 */
```

---

## 设计令牌策略

### `@theme` 的双重作用

Tailwind v4 的 `@theme` 同时：

1. **生成原生 CSS 变量** —— 例如 `--color-foreground` 既可用 `var(--color-foreground)`，也对应工具类 `text-foreground`、`bg-foreground` 等
2. **生成原子工具类** —— Streamdown 内部使用如 `bg-sidebar`、`text-muted-foreground`、`border-border`，这些类名必须在 `@theme` 中以 `--color-<name>` 形式声明才能被 Tailwind 生成

### 命名空间

- `--color-foreground` / `--color-muted` / ... — Streamdown 内部约定（不可改名）
- `--color-vsc-*` — VS Code 主题变量的直接映射，供项目代码使用
- `--color-cursor-*` — Cursor 风格的语义化令牌（文本/背景/边框 4 级层级）

### 透明度层级

通过 `color-mix(in srgb, var(--vscode-foreground) X%, transparent)` 生成 4 级透明度文本/背景/边框令牌，无需为暗/亮主题分别维护两套颜色。

---

## 代码高亮双主题

Shiki 在编译期生成包含 `.shiki-light` 和 `.shiki-dark` 两套样式的代码块。`main.css` 根据 `<html>` 类切换显示：

```css
html.vscode-light .shiki .shiki-dark { display: none; }
html.vscode-dark  .shiki .shiki-light { display: none; }
```

`<html>` 类由 VS Code 自动注入，无需手动检测主题。

---

## 类名约定

| 前缀 | 用途 |
|------|------|
| `markdown-*` | Markdown 渲染（preview / WYSIWYG 共用） |
| `vd-*` | 项目自定义组件（如 `vd-toolbar`、`vd-typography`） |
| Tailwind 原子类 | UI 布局、间距、颜色（来自 `@theme` 生成） |
| `data-streamdown="..."` 属性选择器 | Streamdown 内部数据属性，用于精确定位其控件 |

---

## 主题适配原理

```
VS Code 主题引擎
  │
  ├── 注入 --vscode-* CSS 变量到 Webview <html>
  ├── 设置 html.vscode-light / html.vscode-dark 类
  │
  ▼
main.css @theme {} 块
  │
  ├── 将 --vscode-* 映射为 --color-* / --color-vsc-* / --color-cursor-*
  │
  ▼
Tailwind v4 生成工具类 + CSS 变量
  │
  ▼
Streamdown / Milkdown / 项目组件
  │
  └── 引用变量或工具类，自动跟随主题切换
```

---

## 相关文档

- [架构设计](./Architecture.md) — 安全模型和 CSP
- [编辑器模式](./Editor-Modes.md) — 各模式的样式需求
- [贡献指南](./Contributing.md) — 添加新样式的规范
