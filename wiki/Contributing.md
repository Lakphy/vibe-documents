# 贡献指南

本页描述当前仓库的开发约束。所有条目都对应现有代码结构和脚本。

## 环境

- VS Code 1.85.0 或兼容 Cursor。
- Node.js 和 npm。
- Git。

## 初始化

```bash
git clone <your-fork-url>
cd vibe-documents
npm install
npm run build
npm test
```

## 日常开发

```bash
npm run dev
```

`npm run dev` 同时启动扩展宿主和 Webview 的 watch 构建。扩展开发宿主仍需要通过 VS Code 的 F5 启动。修改构建产物后，通常需要在开发宿主中重新加载窗口。

## 代码位置

| 目录 | 修改范围 |
| --- | --- |
| `src/` | VS Code Extension Host、命令、CodeLens、Custom Text Editor、Webview HTML |
| `webview/` | React UI、Markdown/CSV/Excalidraw 编辑器、搜索、样式 |
| `test/` | VS Code Mock 和清单测试 |
| `scripts/` | 构建后处理和性能预算检查 |
| `wiki/` | 文档 |

## TypeScript 规则

项目使用 `strict: true`。新增公开函数、类和重要对象时应保持类型清晰。扩展宿主代码不能依赖浏览器 API，Webview 代码不能依赖真实 `vscode` 模块。

## React 规则

Webview 使用函数组件和 Hooks。新增事件监听必须在 effect cleanup 中移除。会显著增加入口 bundle 的组件应优先使用 `React.lazy()`，尤其是大型编辑器、渲染器或第三方库。

## 样式规则

项目样式应放入 `webview/styles/main.css`，并优先复用 `--color-vsc-*` 和 `--color-cursor-*`。需要生成 Tailwind 颜色工具类时，应在 `@theme` 中声明 `--color-*` 变量。Excalidraw CSS 应继续由 Excalidraw 相关 lazy 模块导入，不应放回 Webview 入口。

## 测试要求

修改扩展宿主逻辑时补充 `src/__tests__/`。修改 Webview hook、组件或 reducer 时补充 `webview/__tests__/`。修改 `package.json` 贡献点时补充 `test/manifest.test.ts`。性能相关逻辑应有可回归的单元测试或脚本检查。

常用命令：

```bash
npm test
npm run test:coverage
npm run build
npm run perf:budget
```

## 添加新命令

1. 在 `package.json` 的 `contributes.commands` 中声明命令。
2. 根据需要添加菜单、快捷键和 activation event。
3. 在 `src/extension.ts` 中注册命令。
4. 在 `test/manifest.test.ts` 和 `src/__tests__/extension.test.ts` 中补断言。

## 添加新文件类型

1. 扩展 `src/editorTypes.ts` 中的 `FileType`、`CUSTOM_EDITOR_VIEW_TYPES`、`inferFileType()`。
2. 在 `package.json` 中添加 custom editor、命令、菜单、快捷键和 activation event。
3. 在 `src/extension.ts` 中注册 custom editor、CodeLens 和命令。
4. 在 `webview/App.tsx` 中添加 lazy 分支。
5. 为 reducer、组件、消息和清单补测试。

## 添加 Markdown 代码块渲染器

1. 在 `MarkdownPreview.tsx` 的 `plugins.renderers` 中注册语言和组件。
2. 如果渲染器依赖大型库，应通过 `React.lazy()` 加载。
3. 如果渲染结果需要样式，放入 `main.css`。
4. 补充组件测试或源码结构测试。

## 性能约束

主 Webview 入口应保持小而稳定。修改 Vite 分包、CSS 导入、Shiki、Mermaid、CSV 虚拟化或同步 debounce 时，应运行 `npm run build` 和 `npm run perf:budget`。`perf:budget` 当前检查 `webview.js`、`webview.css` 和 Webview sourcemap 数量。

## 提交前检查

- `npm test` 通过。
- `npm run build` 通过。
- 涉及 Webview 主入口或样式体积时，`npm run perf:budget` 通过。
- 文档变更不描述源码中不存在的行为。
- 修改同步逻辑时确认不会产生 Webview 与 Extension Host 的循环回写。
