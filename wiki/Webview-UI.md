# Webview UI 层

> Webview UI 层是一个运行在 Chromium 沙箱中的 React 19 应用，负责 Markdown 的渲染和编辑交互。

---

## 文件概览

| 文件 | 职责 |
|------|------|
| `webview/index.tsx` | React 入口，挂载根组件，导入全局 CSS |
| `webview/App.tsx` | 根组件，模式状态管理和模式切换 |
| `webview/Toolbar.tsx` | 工具栏组件，模式切换按钮 |
| `webview/MilkdownEditor.tsx` | WYSIWYG 编辑器组件 |
| `webview/SourceEditor.tsx` | 源码编辑器组件 |
| `webview/hooks.tsx` | 自定义 Hooks |

---

## 入口文件 — index.tsx

```typescript
import { createRoot } from 'react-dom/client';
import { App } from './App';
// CSS 导入（顺序重要，后导入的优先级更高）
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';
import './styles/theme-bridge.css';
import './styles/streamdown-controls.css';
import './styles/toolbar.css';
import './styles/milkdown-overrides.css';
import './styles/cursor-markdown.css';
```

CSS 导入顺序决定了样式覆盖优先级，`cursor-markdown.css` 最后导入，优先级最高。

---

## 根组件 — App.tsx

### 组件结构

```
App
├── Toolbar (模式切换工具栏)
└── 条件渲染
    ├── preview → Streamdown
    ├── wysiwyg → MilkdownEditor
    └── source  → SourceEditor
```

### 状态管理

```typescript
const { content, baseUri } = useVsCodeMessages();   // 来自 Extension Host 的 Markdown 内容
const [mode, setMode] = useState<EditorMode>('preview');  // 当前编辑模式
const components = useMarkdownComponents(baseUri);    // 自定义渲染组件
```

### Streamdown 插件配置

```typescript
const plugins = useMemo(() => ({
  mermaid,               // Mermaid 图表渲染
  code: codePlugin,      // Shiki 代码高亮（github-light / github-dark 双主题）
  math,                  // KaTeX 数学公式
  cjk,                   // CJK 排版优化
}), []);
```

### 模式切换

支持两种切换方式：
1. **工具栏点击** — 直接 `setMode()`
2. **快捷键** — Extension Host 发送 `toggleMode` 消息，循环切换三个模式

```typescript
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'toggleMode') {
      setMode(prev => {
        const idx = MODES.indexOf(prev);
        return MODES[(idx + 1) % MODES.length];
      });
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

### 空状态处理

当 `content` 为空且处于预览模式时，显示等待提示：

```typescript
if (!content && mode === 'preview') {
  return (
    <div className="markdown-section markdown-empty">
      <p style={{ opacity: 0.5 }}>Waiting for content...</p>
    </div>
  );
}
```

---

## 自定义 Hooks — hooks.tsx

### useVsCodeMessages()

监听 Extension Host 推送的消息，提取 Markdown 内容和基础 URI：

```typescript
export function useVsCodeMessages() {
  const [content, setContent] = useState('');
  const [baseUri, setBaseUri] = useState('');

  useEffect(() => {
    const handler = (event: MessageEvent<VsCodeMessage>) => {
      const msg = event.data;
      if (msg.type === 'update' && msg.content !== undefined) {
        setContent(msg.content);
        if (msg.baseUri) setBaseUri(msg.baseUri);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return { content, baseUri };
}
```

### useMarkdownComponents()

返回 Streamdown 的自定义组件映射，用于覆盖默认的 HTML 元素渲染：

| 组件 | 自定义行为 |
|------|-----------|
| `img` | 解析相对路径图片，添加 `loading="lazy"` |
| `a` | 添加 `target="_blank"` 和安全属性 |
| `table` | 包裹滚动容器，实现响应式表格 |

---

## VS Code API 桥接

Webview 中通过 `acquireVsCodeApi()` 获取 VS Code 通信接口：

```typescript
declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
```

MilkdownEditor 和 SourceEditor 都使用单例模式缓存此 API：

```typescript
let _vscode: ReturnType<typeof acquireVsCodeApi> | undefined;
function getVsCode() {
  if (!_vscode) {
    _vscode = acquireVsCodeApi();
  }
  return _vscode;
}
```

> `acquireVsCodeApi()` 在每个 Webview 生命周期内只能调用一次，必须缓存结果。

---

## 组件通信流程

```
Extension Host                    Webview
     │                              │
     │  postMessage({type:'update'})│
     │─────────────────────────────►│
     │                              │ useVsCodeMessages() → setContent()
     │                              │ React 重新渲染
     │                              │
     │                              │ 用户编辑
     │                              │ Milkdown/CodeMirror 变更监听
     │  postMessage({type:'edit'})  │
     │◄─────────────────────────────│
     │                              │
     │  workspace.applyEdit()       │
     │                              │
```

---

## 相关文档

- [编辑器模式](./Editor-Modes.md) — 三种模式的技术实现
- [样式系统](./Styling-System.md) — CSS 样式层级与主题适配
- [架构设计](./Architecture.md) — 双进程架构总览
