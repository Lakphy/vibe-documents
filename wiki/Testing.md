# 测试体系

项目使用 Vitest、jsdom、React Testing Library 和本地 VS Code API Mock。最新本地覆盖率运行结果为 36 个测试文件通过、464 个测试通过；语句覆盖率 94%、分支覆盖率 88.3%、函数覆盖率 91.98%、行覆盖率 95.92%。

## 命令

```bash
npm test
npm run test:watch
npm run test:coverage
npx vitest run webview/__tests__/csv-store.test.ts
npx vitest run -t "REPLACE_ALL"
```

## Vitest 配置

`vitest.config.ts` 的测试配置是：

```ts
{
  globals: true,
  environment: 'jsdom',
  include: ['src/**/*.test.ts', 'webview/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
  setupFiles: ['./test/setup.ts'],
  css: false,
  alias: {
    vscode: new URL('./test/__mocks__/vscode.ts', import.meta.url).pathname,
  },
}
```

测试只匹配 `src/`、`webview/` 和 `test/` 下的测试文件。CSS 在测试中不解析。`vscode` import 会被重定向到 `test/__mocks__/vscode.ts`。

## VS Code Mock

`test/__mocks__/vscode.ts` 模拟当前扩展宿主代码用到的 VS Code API，包括 URI、Range、Position、CodeLens、ThemeIcon、WorkspaceEdit、window、workspace、commands、languages 和测试专用的 `createMockPanel()`。

`createMockPanel()` 暴露可断言的 `webview.postMessage`、`webview.onDidReceiveMessage`、`onDidDispose` 和 `_disposeCallback()`。Custom editor 测试通常直接取出 mock 注册的 handler 并调用它。

## 顶层测试

| 文件 | 覆盖内容 |
| --- | --- |
| `test/manifest.test.ts` | `package.json` 的命令、菜单、快捷键、激活事件、custom editor、脚本和关键文件存在性 |
| `test/setup.ts` | 导入 `@testing-library/jest-dom/vitest` |

## Extension Host 测试

| 文件 | 覆盖内容 |
| --- | --- |
| `src/__tests__/extension.test.ts` | `activate()` 注册 3 个 Custom Editor、3 个 CodeLens、5 个命令；命令调用的 view column；`deactivate()` |
| `src/__tests__/customTextEditorProvider.test.ts` | ready 首帧推送、空文件推送、edit 回写、save 回写、文档变化同步、toggleMode |
| `src/__tests__/customTextEditorProvider-branches.test.ts` | 去重、跨文档隔离、50ms 批量推送、ready/dispose 清 timer、apply/save 失败、未知消息、非 active panel |
| `src/__tests__/codeLensProvider.test.ts` | 三种 fileType 的 CodeLens 标题、命令和参数 |
| `src/__tests__/editorTypes.test.ts` | 扩展名推断、大小写、viewType 映射 |
| `src/__tests__/textDocumentEdits.test.ts` | `fast-diff` insert/delete/replace、无变化直接成功 |
| `src/__tests__/utils.test.ts` | nonce、HTML/CSP、图片路径解析 |
| `src/__tests__/webviewHost.test.ts` | Webview options、localResourceRoots、资源 URI、HTML 注入和 baseUri |

## Webview 通用测试

| 文件 | 覆盖内容 |
| --- | --- |
| `webview/__tests__/App.test.tsx` | 首次 update 前加载态，Markdown/CSV/Excalidraw fileType 路由 |
| `webview/__tests__/Toolbar.test.tsx` | Preview/WYSIWYG 按钮和回调 |
| `webview/__tests__/ThemeContext.test.tsx` | body 主题类监听 |
| `webview/__tests__/hooks.test.tsx` | `useVsCodeMessages()` 和 `useMarkdownComponents()` |
| `webview/__tests__/messageBus.test.ts` | 订阅、取消订阅、按 type 分发 |
| `webview/__tests__/vscodeApi.test.ts` | `acquireVsCodeApi()` 缓存和缺失降级 |
| `webview/__tests__/saveShortcut.test.tsx` | `Ctrl/Cmd+S` 保存消息 |
| `webview/__tests__/previewStyles.test.ts` | Markdown/Milkdown/样式的结构性源码断言 |

## Markdown 相关测试

| 文件 | 覆盖内容 |
| --- | --- |
| `webview/__tests__/codeHighlighter.test.ts` | Shiki 插件、别名、plaintext 回退、异步 callback、缓存、全部内置语言 loader、加载失败回退 |
| `webview/__tests__/MermaidBlock.test.tsx` | Mermaid 渲染、源码切换、复制、全屏、缩放、滚轮/拖拽、错误态、IntersectionObserver、SVG 缓存 |
| `webview/__tests__/markdownPreviewConfig.test.ts` | `CODE_HIGHLIGHT_THEMES` 常量 |
| `webview/__tests__/useCodeBlockSelectAll.test.tsx` | 代码块内两阶段全选 |

## 搜索测试

| 文件 | 覆盖内容 |
| --- | --- |
| `webview/__tests__/regexUtils.test.ts` | 正则转义、大小写、整词、正则模式和非法正则 |
| `webview/__tests__/domHighlighter.test.ts` | DOM 文本匹配、大小写、整词、正则和空查询 |
| `webview/__tests__/domHighlighter-extra.test.ts` | CSS Custom Highlights API、清理和滚动 |
| `webview/__tests__/SearchWidget.test.tsx` | 搜索 UI 控件 |
| `webview/__tests__/useSearch.test.ts` | open/close/toggle、查询和匹配计数 |
| `webview/__tests__/useSearch-nav.test.tsx` | findNext/findPrev、容器选择、模式切换后重搜 |

## CSV 测试

| 文件 | 覆盖内容 |
| --- | --- |
| `webview/__tests__/csv-parser.test.ts` | CSV 解析、CRLF、引号、换行、序列化、normalize、parseAndSplit |
| `webview/__tests__/csv-history.test.ts` | `UndoRedoStack`、redo 清理、容量限制 |
| `webview/__tests__/csv-selection.test.ts` | 选区范围和单元格命中 |
| `webview/__tests__/csv-store.test.ts` | reducer 主路径、排序、搜索、粘贴、序列化、undo/redo |
| `webview/__tests__/csv-store-branches.test.ts` | 删除限制、替换、移动、结构性搜索刷新、SET_CELL 增量搜索、SET_DATA 搜索刷新 |
| `webview/__tests__/CellRenderer.test.tsx` | 单元格渲染状态 |
| `webview/__tests__/useSelectionHook.test.tsx` | 鼠标选择、拖选、移动和边界 |
| `webview/__tests__/useKeyboard.test.tsx` | Undo/Redo、方向键、Tab、Enter、F2、Delete、Backspace、Escape、输入进入编辑 |
| `webview/__tests__/useCopyPaste.test.tsx` | copy/paste/cut、输入控件跳过、TSV、sortedToSourceMap |

## 覆盖率剩余缺口

剩余未覆盖主要集中在测试 Mock 自身、Mermaid 交互的少数浏览器异常分支、`useCodeBlockSelectAll()` 的选择边界、以及无法通过正常输入触达的 CSV parser 防御分支。这些缺口不影响当前核心业务路径的测试覆盖。
