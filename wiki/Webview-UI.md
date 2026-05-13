# Webview UI 层

> Webview UI 层是一个运行在 Chromium 沙箱中的 React 19 应用，根据消息中的 `fileType` 路由到 Markdown / CSV / Excalidraw 三类编辑器。

---

## 文件概览

| 文件 | 职责 |
|------|------|
| `webview/index.tsx` | React 入口，挂载 `<ThemeProvider><App /></ThemeProvider>` 并导入全局 CSS |
| `webview/App.tsx` | 根组件：fileType 路由、模式切换、搜索拦截、Streamdown 插件配置 |
| `webview/Toolbar.tsx` | Markdown 模式切换按钮 |
| `webview/MilkdownEditor.tsx` | WYSIWYG 编辑器（Milkdown v7） |
| `webview/MermaidBlock.tsx` | Mermaid 块渲染（缩放、全屏、复制源码） |
| `webview/ExcalidrawEditor.tsx` | Excalidraw 全屏编辑器（lazy） |
| `webview/ExcalidrawBlock.tsx` | Markdown 内嵌 Excalidraw 代码块渲染 |
| `webview/CsvViewer.tsx` | CSV 编辑器入口（lazy），下层 `webview/csv/*` |
| `webview/ThemeContext.tsx` | 暗/亮主题上下文，监听 `<html>` 类切换 |
| `webview/hooks.tsx` | `useVsCodeMessages` / `useMarkdownComponents` / `useVsCodeTheme` |
| `webview/messageBus.ts` | Webview 全局消息订阅总线（`subscribe(type, handler)`） |
| `webview/vscodeApi.ts` | `getVsCodeApi()` 单例缓存 `acquireVsCodeApi()` 结果 |
| `webview/codeHighlighter.ts` | Streamdown 代码插件（Shiki 双主题） |
| `webview/markdownPreviewConfig.ts` | `CODE_HIGHLIGHT_THEMES` 常量 |
| `webview/saveShortcut.ts` | Cmd/Ctrl+S 拦截，将当前内容通过 `{type:'save'}` 回写 |
| `webview/useCodeBlockSelectAll.ts` | 两阶段 Cmd+A：第一次选当前代码块，第二次选整个容器 |
| `webview/search/` | DOM 搜索/高亮通用模块（preview 与 WYSIWYG 共享） |
| `webview/csv/` | CSV 编辑器全部代码 |

---

## 入口文件 — index.tsx

```typescript
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './ThemeContext';
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';
import '@excalidraw/excalidraw/index.css';
import './styles/main.css';

const container = document.getElementById('root')!;
createRoot(container).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
```

> 本地样式只有一个文件 `styles/main.css`，基于 Tailwind v4 的 `@import "tailwindcss"` 和 `@theme {}` 设计令牌实现。详情见 [样式系统](./Styling-System.md)。

---

## 根组件 — App.tsx

### 路由

```typescript
const { content: rawContent, baseUri, fileType } = useVsCodeMessages();

if (fileType === 'excalidraw') return <Suspense fallback={...}><ExcalidrawEditor content={content} /></Suspense>;
if (fileType === 'csv')        return <Suspense fallback={...}><CsvViewer content={content} /></Suspense>;
// Markdown 路径继续往下
```

`ExcalidrawEditor` 和 `CsvViewer` 均通过 `React.lazy()` 懒加载，初次访问时才下载对应 chunk。

### Markdown 状态与模式

```typescript
const content = useDeferredValue(rawContent);
const [mode, setMode] = useState<EditorMode>('preview');
const visitedModes = useRef(new Set<EditorMode>(['preview']));
```

- `useDeferredValue` 让大文档输入时 UI 保持响应
- `visitedModes` 跟踪用户访问过的模式：Preview 始终挂载；WYSIWYG 首次访问后才挂载并保留，再次切换通过 `display: none` 显隐

### Streamdown 插件配置

```typescript
const plugins = useMemo(() => ({
  code: codePlugin,   // Shiki 代码高亮，vitesse-light/vitesse-dark 双主题
  math,               // KaTeX
  cjk,                // CJK 排版优化
  renderers: [
    { language: 'mermaid',    component: MermaidRenderer },
    { language: 'excalidraw', component: ExcalidrawRenderer },
  ],
}), [MermaidRenderer]);
```

> 注意：Mermaid 现在通过 `plugins.renderers` 注册（按代码块语言匹配），并非传入 `mermaid` 字段。`mermaidOptions` 仅作为 Streamdown 的顶层 `mermaid` prop 传递主题配置。

### 模式切换

通过 `messageBus.subscribe('toggleMode', ...)` 订阅扩展宿主推送的切换消息（来自 `Ctrl/Cmd+Shift+E`）：

```typescript
useEffect(() => {
  return subscribe('toggleMode', () => {
    setMode(prev => {
      const idx = MODES.indexOf(prev);
      return MODES[(idx + 1) % MODES.length];
    });
  });
}, []);
```

工具栏直接 `setMode()` 是第二种入口。

### Cmd+F 搜索拦截

仅在 Markdown 模式下（`fileType` 非 `csv`/`excalidraw`）拦截 `Cmd/Ctrl+F`，打开 `SearchWidget`。CSV 模式内部已有自己的搜索 UI。

### 空状态

`!content && mode === 'preview'` 时渲染 `Waiting for content...` 占位。

---

## 自定义 Hooks — hooks.tsx

### `useVsCodeMessages()`

监听 Webview 收到的 `update` 消息，返回：

```typescript
{
  content: string;
  baseUri: string;
  fileType: FileType;   // 'markdown' | 'csv' | 'excalidraw'
}
```

Hook 在挂载时通过 `vscodeApi.postMessage({ type: 'ready' })` 通知扩展，触发首次强制内容推送。

### `useMarkdownComponents(baseUri)`

返回 Streamdown 自定义组件映射（`{ img, a, table }`），用 `useMemo` 按 `baseUri` 缓存。

| 组件 | 自定义行为 |
|------|-----------|
| `img` | `resolveImageSrc(src, baseUri)` 解析相对路径，附加 `loading="lazy"` |
| `a` | 添加 `target="_blank"` 和 `rel="noopener noreferrer"` |
| `table` | 包裹 `markdown-table-container` / `markdown-table-wrapper` 实现水平滚动 |

### `useVsCodeTheme()`

返回 `useIsDark()` 的布尔值——本质是 `ThemeContext` 暴露的 `isDark`，源自对 `<html>` 上 `vscode-dark` / `vscode-light` 类的监听。

---

## VS Code API 桥接

`webview/vscodeApi.ts` 提供单例：

```typescript
let cached: ReturnType<typeof acquireVsCodeApi> | undefined;
export function getVsCodeApi() {
  if (cached) return cached;
  if (typeof (globalThis as any).acquireVsCodeApi !== 'function') return undefined;
  cached = (globalThis as any).acquireVsCodeApi();
  return cached;
}
```

`acquireVsCodeApi()` 在每个 Webview 生命周期内只能调用一次，所以全局缓存。所有 Webview→Extension 的消息都经此接口。

---

## 消息总线 — messageBus.ts

```typescript
subscribe<K extends keyof WebviewMessageMap>(type: K, handler): () => void;
```

模块内部仅在首次订阅时挂载一个全局 `window` 'message' 监听器，根据 `data.type` 分发给对应 handler 集合。所有 Webview 子模块统一通过 `subscribe('update' | 'toggleMode' | ...)` 订阅，避免重复添加 listener。

---

## 组件通信流程

```
Extension Host                    Webview
     │                              │
     │                              │ App mount → postMessage({type:'ready'})
     │◄─────────────────────────────│
     │  postDocumentContent(force=true)
     │  postMessage({type:'update'})│
     │─────────────────────────────►│
     │                              │ messageBus 分发 → useVsCodeMessages
     │                              │   → setContent/baseUri/fileType
     │                              │ React 渲染
     │                              │
     │                              │ 用户编辑（Milkdown/CSV/Excalidraw）
     │  postMessage({type:'edit'})  │
     │◄─────────────────────────────│
     │  applyTextDocumentContent()  │
     │  ↓ workspace.applyEdit()     │
     │                              │
     │  保存（Cmd+S）                │
     │  postMessage({type:'save'})  │
     │◄─────────────────────────────│
     │  applyContent + document.save│
     │                              │
     │  toggleMode 命令              │
     │  postMessage({type:'toggleMode'}) → 仅 Markdown 响应
     │─────────────────────────────►│
```

---

## 相关文档

- [编辑器模式](./Editor-Modes.md) — Markdown 两种模式的技术实现
- [样式系统](./Styling-System.md) — Tailwind v4 主题桥接
- [架构设计](./Architecture.md) — 双进程架构总览
