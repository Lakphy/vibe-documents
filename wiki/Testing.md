# 测试体系

> 项目使用 Vitest 作为测试框架，配合 jsdom 环境和 VS Code API Mock，覆盖扩展宿主和 Webview 两个层面。截至最新一次测试运行，共 425 个测试通过，行覆盖率 94.11%、分支覆盖率 85.75%。

---

## 测试框架

| 工具 | 版本 | 用途 |
|------|------|------|
| Vitest | ^4.1.5 | 测试运行器和断言库 |
| jsdom | ^29.1.1 | 浏览器环境模拟 |
| @testing-library/react | ^16.3.2 | React 组件/Hook 测试 |
| @testing-library/jest-dom | ^6.9.1 | DOM 断言扩展 |
| @testing-library/user-event | ^14.6.1 | 用户交互模拟 |
| @vitest/coverage-v8 | ^4.1.6 | V8 覆盖率收集 |

---

## 配置

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'webview/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    css: false,
    alias: {
      vscode: new URL('./test/__mocks__/vscode.ts', import.meta.url).pathname,
    },
  },
});
```

关键配置：
- `environment: 'jsdom'` — 所有测试运行在 jsdom 中
- `include` — 仅匹配 `src/`、`webview/`、`test/` 下的 `*.test.{ts,tsx}` 文件
- `css: false` — 跳过 CSS 解析
- `alias.vscode` — 将 `import * as vscode from 'vscode'` 重定向到本地 Mock 的绝对路径

---

## VS Code API Mock

### `test/__mocks__/vscode.ts`

完整模拟扩展宿主代码用到的 VS Code API：

| Mock | 说明 |
|------|------|
| `Uri.file()` / `Uri.parse()` | 文件 URI |
| `ViewColumn` | 编辑器列枚举 |
| `window.createWebviewPanel` / `registerCustomEditorProvider` / `showErrorMessage` / `showInformationMessage` / `activeTextEditor` | 窗口能力 |
| `workspace.openTextDocument` / `applyEdit` / `onDidChangeTextDocument` / `onDidSaveTextDocument` / `createFileSystemWatcher` / `workspaceFolders` | 工作区能力 |
| `commands.registerCommand` / `executeCommand` | 命令系统 |
| `languages.registerCodeLensProvider` | CodeLens 注册 |
| `WorkspaceEdit` | 自实现 `_edits` 数组 + `getEdits()` |
| `Range` / `Position` / `CodeLens` / `ThemeIcon` / `RelativePattern` | 数据类型 |
| `createMockPanel()` / `createMockWebview()` | 用于断言的可观察 WebviewPanel / Webview |

#### 可观察的 WebviewPanel

```typescript
const panel = createMockPanel();
panel.webview.postMessage           // vi.fn()
panel.webview.onDidReceiveMessage   // vi.fn() — 测试时取 .mock.calls[0][0] 拿到 handler 直接调用
panel.onDidDispose                  // vi.fn() — 同上，得到 disposeCallback
panel._disposeCallback()            // 测试便捷方法：触发 dispose 流程
panel.active = true                 // 默认 true；测试 toggleMode 多面板分支时可置 false
```

---

## 测试文件清单

### 顶层

- `test/manifest.test.ts` — 47 项断言：验证 `package.json` 的命令、菜单、快捷键、激活事件、`customEditors` 配置以及关键文件存在性
- `test/setup.ts` — 仅导入 `@testing-library/jest-dom/vitest`

### 扩展宿主（`src/__tests__/`）

| 文件 | 覆盖 |
|------|------|
| `extension.test.ts` | `activate()` 注册 3 个 Custom Editor、3 个 CodeLens、5 个命令；命令参数与 ViewColumn；`deactivate()` 不抛错 |
| `customTextEditorProvider.test.ts` | 基本 `resolveCustomTextEditor` 流程、`ready` 推送、`edit` 回写、`toggleMode`、`onDidChangeTextDocument` 同步 |
| `customTextEditorProvider-branches.test.ts` | 内容去重、跨文档变更隔离、`applyEdit` 失败路径、`save` 失败路径、`dispose` 清理、未知消息容错、`toggleMode` 多面板 |
| `codeLensProvider.test.ts` | 三种 fileType 的 CodeLens 标题与命令绑定 |
| `editorTypes.test.ts` | `inferFileType` 各扩展名 + 大小写不敏感；`getCustomEditorViewType`；常量映射 |
| `textDocumentEdits.test.ts` | `fast-diff` 生成 insert/delete/replace；无变化时直接返回 true |
| `utils.test.ts` | `getNonce` 长度/字符集；`buildPreviewHtml` 含 CSP/scriptUri/cssUri/nonce；`resolveImageSrc` 各分支 |
| `webviewHost.test.ts` | `configureEditorWebview` 设置 `enableScripts` / `localResourceRoots`，注入 HTML；无 workspaceFolders 时降级；`getResourceBaseUri` |

### Webview（`webview/__tests__/`）

| 文件 | 覆盖 |
|------|------|
| `Toolbar.test.tsx` | 两个模式按钮、active 样式、onModeChange 回调 |
| `ThemeContext.test.tsx` | 主题上下文订阅 `<html>` 类变化 |
| `messageBus.test.ts` | `subscribe` 注册/取消、按 type 分发、清理空集合 |
| `previewStyles.test.ts` | 预览结构性 className 断言 |
| `markdownPreviewConfig.test.ts` | `CODE_HIGHLIGHT_THEMES` 常量 |
| `hooks.test.tsx` | `useVsCodeMessages` 接收 `update`、`useMarkdownComponents` 组件映射 |
| `saveShortcut.test.tsx` | Cmd/Ctrl+S 拦截并 postMessage |
| `useCodeBlockSelectAll.test.tsx` | 两阶段全选（普通/textarea/外部元素） |
| `useSearch.test.ts` | open/close/toggle 选项、DOM 搜索 matchCount |
| `useSearch-nav.test.tsx` | findNext/findPrev 循环；toggle 后重搜索；preview/wysiwyg 容器；ref 为空降级 |
| `domHighlighter.test.ts` | findMatches 各模式（caseSensitive/wholeWord/useRegex/无效正则） |
| `domHighlighter-extra.test.ts` | applyHighlights / clearHighlights / scrollToMatch（mock CSS.highlights） |
| `regexUtils.test.ts` | `escapeRegExp` 全部特殊字符；`buildSearchRegex` 各 flag 组合 |
| `vscodeApi.test.ts` | `getVsCodeApi` 单例缓存与降级 |
| `codeHighlighter.test.ts` | 导出非空 |
| `SearchWidget.test.tsx` | 搜索面板交互 |
| `MermaidBlock.test.tsx` | Mermaid 渲染、错误、复制源码 |
| `CellRenderer.test.tsx` | CSV 单元格渲染 |
| `csv-parser.test.ts` | CSV 解析 + 序列化（含引号/换行） |
| `csv-history.test.ts` | `UndoRedoStack` push/undo/redo/clear/MAX_HISTORY |
| `csv-selection.test.ts` | `getSelectionRange` / `isCellInSelection` 工具函数 |
| `useSelectionHook.test.tsx` | `useSelection` 全套：select/drag/move/extend/边界夹紧 |
| `csv-store.test.ts` | `useCsvStore` 主要 reducer 动作 |
| `csv-store-branches.test.ts` | UNDO/REDO、REPLACE_*、MOVE_*、PASTE_CELLS 扩展行、DELETE 限制等分支 |
| `useCopyPaste.test.tsx` | copy/paste/cut 通过 `ClipboardEvent` 派发；输入框跳过；sortedToSourceMap 映射 |
| `useKeyboard.test.tsx` | Undo/Redo/Arrow/Tab/Enter/F2/Delete/Escape/单字符进入编辑 |

---

## 运行测试

```bash
# 一次性运行全部测试
npm test

# 监听模式（开发时）
npm run test:watch

# 覆盖率报告
npm run test:coverage

# 运行单个文件
npx vitest run webview/__tests__/csv-store.test.ts

# 按名称过滤
npx vitest run -t "REPLACE_ALL"
```

---

## 测试策略

### 分层

```
┌─────────────────────────────────┐
│  清单完整性测试（防止发布配置缺失）  │
├─────────────────────────────────┤
│  Extension Host 单元测试           │
│  （命令、CustomEditor、CodeLens、增量编辑） │
├─────────────────────────────────┤
│  Webview Hook / 组件测试            │
│  （消息总线、CSV 状态、搜索、Hook 交互） │
└─────────────────────────────────┘
```

### Mock 策略

| 被 Mock 的模块 | 原因 |
|---------------|------|
| `vscode` | VS Code API 仅在扩展宿主进程可用 |
| CSS 文件（`css: false`） | jsdom 不解析 CSS |
| `acquireVsCodeApi` | 通过 `vi.stubGlobal` 在 Webview 测试中注入 |

### 最佳实践

1. **测试行为而非实现** — 验证命令被注册、消息被推送，而非内部数据结构
2. **取出 mock handler 直接调用** — `panel.webview.onDidReceiveMessage.mock.calls[0][0]` 拿到注册的 handler，绕开真实事件循环
3. **React Hook 测试用 `renderHook`** — 避免给每个 Hook 写宿主组件
4. **每个测试前清理** — 使用 `beforeEach(() => vi.clearAllMocks())` 或重置 DOM `document.body.innerHTML = ''`

---

## 相关文档

- [构建与开发](./Build-and-Development.md) — 开发环境搭建
- [API 参考](./API-Reference.md) — 被测试的 API
- [贡献指南](./Contributing.md) — 提交代码前的测试要求
