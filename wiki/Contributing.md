# 贡献指南

> 感谢你对 Vibe Documents 的兴趣！本文档介绍如何参与开发、代码规范和提交流程。

---

## 开发环境搭建

### 前置要求

- **Node.js** ≥ 18
- **npm** ≥ 9
- **VS Code** ≥ 1.85.0（或 Cursor 编辑器）
- **Git**

### 初始化

```bash
git clone <your-fork-url>
cd vibe-documents
npm install
npm run build
npm test
```

### 开发流程

```bash
# 同时启动 webpack（扩展）和 vite（webview）的 watch
npm run dev

# 在 VS Code 中按 F5 启动扩展开发宿主
# 在开发宿主中打开 .md / .csv / .excalidraw 文件
# 通过 CodeLens / 标题栏按钮 / 命令面板触发 Vibe Editor
# 修改代码后用 Cmd/Ctrl+R 重新加载开发宿主
```

---

## 项目结构

详见 [Home](./Home.md#项目结构) 中的完整树状图。

---

## 代码规范

### TypeScript

- 启用 `strict` 模式
- 优先使用 `const` 和只读类型
- 公开导出的函数和类需要显式类型注解

### React

- 仅使用函数组件 + Hooks
- 使用 `react-jsx` 转换（无需 `import React`）
- 使用 `useMemo` / `useCallback` 在依赖明确时避免不必要的重渲染
- `useEffect` 注册的事件必须在清理函数中移除

### CSS

- 优先使用 `webview/styles/main.css` 中 `@theme {}` 声明的设计令牌（`--color-cursor-*`、`--color-vsc-*` 等）
- 不直接硬编码颜色，使用 `--vscode-*` / `--color-*` 变量
- Tailwind 原子类可直接使用

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `MilkdownEditor.tsx` |
| 工具文件 | camelCase | `utils.ts` |
| Hook | `use` 前缀 | `useVsCodeMessages()` |
| CSS 类（项目自定义） | `vd-` 前缀 | `.vd-toolbar-btn` |
| CSS 变量 | `--color-*` 命名空间 | `--color-cursor-text-primary` |
| 命令 ID | `vibeDocuments.*` | `vibeDocuments.showPreview` |

---

## 提交规范

### 分支命名

```
feature/描述   fix/描述   refactor/描述   docs/描述   test/描述
```

### Commit 消息

```
<type>: <简要描述>

<详细说明（可选）>
```

类型：`feat` / `fix` / `refactor` / `style` / `test` / `docs` / `chore`。

---

## 提交代码前

### 检查清单

- [ ] `npm run build` 通过
- [ ] `npm test` 全部通过
- [ ] 新功能附带单元测试
- [ ] 在亮色和暗色主题下视觉正常
- [ ] 涉及 Markdown 的功能在 Preview 与 WYSIWYG 两种模式下都验证过

---

## 添加新功能指南

### 添加新命令

1. 在 `package.json` 的 `contributes.commands` 中声明
2. 在 `src/extension.ts` 中 `registerCommand`
3. 必要时声明 `activationEvents`（如 `onCommand:xxx`）
4. 在 `test/manifest.test.ts` 中补充清单断言
5. 在 `src/__tests__/extension.test.ts` 中补充注册行为测试

### 添加新的 Streamdown 渲染器

1. 在 `webview/App.tsx` 的 `plugins.renderers` 数组中添加：
   ```typescript
   { language: 'xxx', component: XxxRenderer }
   ```
2. 实现 `XxxRenderer` 组件
3. 如需样式，写入 `webview/styles/main.css`

### 添加新文件类型支持

1. 在 `src/editorTypes.ts` 中扩展 `FileType` 与 `CUSTOM_EDITOR_VIEW_TYPES` / `inferFileType`
2. 在 `package.json` 中新增 `customEditors` 条目
3. 在 `src/extension.ts` 中注册第三个 Provider 实例与对应 `showXxxPreview` 命令
4. 在 `webview/App.tsx` 中加入新的 `fileType` 分支并按需 lazy 加载新编辑器组件

---

## 架构决策记录

### 为什么使用 Custom Text Editor 而非普通 WebviewPanel？

Custom Text Editor 由 VS Code 注入 `TextDocument` 工作副本，无需自行 `openTextDocument(uri)`。因此脏标记、保存、hot exit、revert、`supportsMultipleEditorsPerDocument` 全部由 VS Code 原生处理，避免了额外的状态同步代码。

### 为什么编辑回写使用 fast-diff 增量而非全量 replace？

`textDocumentEdits.ts` 使用 `fast-diff` 计算最小 insert/delete 集合并通过 `WorkspaceEdit` 应用。原因：
1. 减小撤销栈条目大小
2. 避免 ProseMirror selection / cursor 因为全量替换而抖动
3. 在大文件场景下大幅减少 IPC 负载

### 为什么 Webview 与 Markdown 编辑器分两个库？

Preview（Streamdown）和 WYSIWYG（Milkdown）是两个完全不同的库，各自有独立的初始化和状态管理。使用条件渲染并保留 visited 模式，避免重复初始化。

### 为什么使用 Tailwind v4 而非自维护的设计令牌 CSS？

Streamdown 内部直接使用 `bg-sidebar`、`text-muted-foreground` 等 Tailwind 工具类。Tailwind v4 的 `@theme {}` 同时生成 CSS 变量与原子类，避免维护两套等价的命名映射。

### 为什么单一 `main.css` 而非多文件分层？

合并后所有令牌、组件样式、第三方覆盖都在一个文件，Tailwind 扫描和 PostCSS 处理均简化。同时也避免了多文件 import 顺序带来的优先级心智成本。

---

## 获取帮助

- 阅读 [架构设计](./Architecture.md)
- 阅读 [API 参考](./API-Reference.md)
- 提交 Issue 讨论新功能或报告 Bug

---

## 相关文档

- [快速安装使用指南](./Quick-Start.md)
- [构建与开发](./Build-and-Development.md)
- [测试体系](./Testing.md)
