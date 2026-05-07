# 编辑器模式

> Vibe Documents 提供三种编辑模式，每种模式使用不同的渲染引擎，针对不同使用场景优化。

---

## 模式概览

| 模式 | 引擎 | 可编辑 | 适用场景 |
|------|------|--------|----------|
| **Preview** | Streamdown | 否 | 阅读文档，查看最终效果 |
| **WYSIWYG** | Milkdown (ProseMirror) | 是 | 所见即所得编辑，非技术用户友好 |
| **Source** | CodeMirror 6 | 是 | 直接编辑 Markdown 源码，适合熟悉语法的用户 |

---

## Preview 模式（预览）

### 渲染引擎

使用 [Streamdown](https://github.com/nicepkg/streamdown) 库将 Markdown 渲染为 React 组件。

### 插件体系

```typescript
const plugins = {
  mermaid,                    // @streamdown/mermaid — Mermaid 图表
  code: createCodePlugin({    // @streamdown/code — Shiki 代码高亮
    themes: ['github-light', 'github-dark'],
  }),
  math,                       // @streamdown/math — KaTeX 数学公式
  cjk,                        // @streamdown/cjk — CJK 排版优化
};
```

### 自定义组件

通过 `useMarkdownComponents()` Hook 自定义以下元素的渲染：

#### 图片组件

```typescript
img: (props) => {
  const src = resolveImageSrc(props.src || '', baseUri);
  return <img {...rest} src={src} loading="lazy" />;
}
```

- 自动解析相对路径为 Webview URI
- 添加懒加载属性

#### 链接组件

```typescript
a: (props) => (
  <a {...props} className="markdown-link" target="_blank" rel="noopener noreferrer" />
)
```

- 所有链接在新窗口打开
- 添加安全属性防止 `window.opener` 漏洞

#### 表格组件

```typescript
table: (props) => (
  <div className="markdown-table-container">
    <div className="markdown-table-wrapper">
      <table className="markdown-table" {...props} />
    </div>
  </div>
)
```

- 包裹双层容器实现水平滚动
- 圆角边框和 hover 效果

### 代码高亮双主题

Shiki 代码插件生成包含 `.shiki-light` 和 `.shiki-dark` 两套样式的代码块。CSS 根据 VS Code 主题自动切换：

```css
html.vscode-light .shiki .shiki-dark { display: none; }
html.vscode-dark .shiki .shiki-light { display: none; }
```

---

## WYSIWYG 模式（所见即所得）

### 渲染引擎

使用 [Milkdown](https://milkdown.dev/) v7（基于 ProseMirror）实现富文本编辑。

### 组件结构

```
MilkdownEditor
└── MilkdownProvider         // Milkdown React 上下文
    └── MilkdownEditorInner  // 实际编辑器
        └── Milkdown         // ProseMirror 视图
```

### 插件配置

```typescript
Editor.make()
  .use(commonmark)    // CommonMark 基础语法
  .use(gfm)           // GitHub Flavored Markdown
  .use(listener)      // 内容变更监听
  .use(history)       // 撤销/重做
  .use(clipboard)     // 剪贴板支持
  .use(indent)        // 缩进
  .use(trailing)      // 尾部空行
  .use(math)          // KaTeX 数学公式
  .use(diagram)       // Mermaid 图表
```

### 内容同步机制

#### 内容初始化

Milkdown 使用 `defaultValueCtx` 设置初始 Markdown 内容：

```typescript
ctx.set(defaultValueCtx, initialContent);
```

#### 编辑 → 回写

通过 `listenerCtx.markdownUpdated` 监听内容变更：

```typescript
ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
  if (isExternalUpdate.current) return;      // 忽略外部更新
  if (markdown === prevMarkdown) return;      // 内容未变
  if (markdown === lastSentContent.current) return;  // 去重
  lastSentContent.current = markdown;
  getVsCode().postMessage({ type: 'edit', content: markdown });
});
```

#### 外部更新 → 编辑器

监听 `message` 事件，使用 `replaceAll()` 更新编辑器内容：

```typescript
const currentMarkdown = editor.action(getMarkdown());
if (currentMarkdown === msg.content) return;  // 内容未变则跳过

isExternalUpdate.current = true;
editor.action(replaceAll(msg.content));
isExternalUpdate.current = false;
```

### 防循环策略

| 标志 | 用途 |
|------|------|
| `isExternalUpdate` | Ref 标志，外部更新时为 `true`，阻止 `markdownUpdated` 回写 |
| `lastSentContent` | Ref 缓存上次发送的内容，相同内容不重复发送 |
| 内容比对 | 更新前检查 `getMarkdown() === msg.content` |

---

## Source 模式（源码）

### 渲染引擎

使用 [CodeMirror 6](https://codemirror.net/) 实现纯文本编辑。

### 扩展配置

```typescript
const state = EditorState.create({
  doc: content,
  extensions: [
    lineNumbers(),              // 行号
    highlightActiveLine(),      // 当前行高亮
    highlightActiveLineGutter(), // 行号栏当前行高亮
    history(),                  // 撤销/重做
    keymap.of([...defaultKeymap, ...historyKeymap]),  // 快捷键
    markdown(),                 // Markdown 语法支持
    theme,                      // 自定义主题
    updateListener,             // 内容变更监听
    EditorView.lineWrapping,    // 自动换行
  ],
});
```

### 主题适配

CodeMirror 主题使用 VS Code CSS 变量，确保与宿主编辑器视觉一致：

```typescript
const theme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--vscode-editor-background)',
    color: 'var(--vscode-editor-foreground)',
    fontSize: 'var(--vscode-editor-font-size)',
    fontFamily: 'var(--vscode-editor-font-family)',
  },
  '.cm-content': {
    caretColor: 'var(--vscode-editorCursor-foreground)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--vscode-editorGutter-background)',
    color: 'var(--vscode-editorLineNumber-foreground)',
  },
  // ... 更多样式映射
});
```

### 内容同步机制

#### 编辑 → 回写

通过 `EditorView.updateListener` 监听文档变更：

```typescript
const updateListener = EditorView.updateListener.of((update) => {
  if (!update.docChanged) return;
  if (isExternalUpdate.current) return;
  const newContent = update.state.doc.toString();
  if (newContent === lastSentContent.current) return;
  lastSentContent.current = newContent;
  getVsCode().postMessage({ type: 'edit', content: newContent });
});
```

#### 外部更新 → 编辑器

监听 `message` 事件，通过 `dispatch()` 替换整个文档：

```typescript
view.dispatch({
  changes: {
    from: 0,
    to: view.state.doc.length,
    insert: msg.content,
  },
});
```

### 防循环策略

与 WYSIWYG 模式相同的三重保护：`isExternalUpdate` + `lastSentContent` + 内容比对。

---

## 模式切换行为

### 工具栏切换

点击 Toolbar 按钮直接设置目标模式。

### 快捷键循环切换

`Cmd+Shift+E` → Extension Host 发送 `toggleMode` 消息 → Webview 循环切换：

```
preview → wysiwyg → source → preview → ...
```

### 切换时的数据流

模式切换时 React 条件渲染会卸载旧组件、挂载新组件。新组件通过 `content` prop 获取当前最新内容，无需额外的同步操作。

---

## 相关文档

- [Webview UI 层](./Webview-UI.md) — 组件树与 Hooks
- [样式系统](./Styling-System.md) — 各模式的样式实现
- [架构设计](./Architecture.md) — 数据流与防循环机制
