# Vibe Documents Wiki

> **Vibe Documents** — 一款灵感源自 Cursor 渲染风格的 VS Code 文档预览/编辑扩展，内置 Mermaid 图表、KaTeX 数学公式、Shiki 代码高亮、CJK 排版优化，并附带 Excalidraw 全屏编辑器和虚拟滚动的 CSV 表格编辑器。

---

## 功能亮点

| 功能 | 说明 |
|------|------|
| **Markdown 预览模式** | 基于 Streamdown 的只读渲染，复刻 Cursor 风格 |
| **Markdown 所见即所得模式** | 基于 Milkdown（ProseMirror）v7 的富文本编辑 |
| **Excalidraw 编辑器** | 直接打开 `.excalidraw` 文件进行手绘风格图形编辑 |
| **CSV 编辑器** | 虚拟滚动表格，支持单元格编辑、列排序、搜索替换、撤销重做、复制粘贴 |
| **双向同步** | Webview 编辑通过增量 `WorkspaceEdit` 实时写回；文件变更实时推送到 Webview |
| **Mermaid 图表** | 流程图、时序图、甘特图等，支持暗色主题适配 |
| **KaTeX 数学公式** | 行内 `$...$` 和行间 `$$...$$` |
| **Shiki 代码高亮** | vitesse-light / vitesse-dark 双主题，自动跟随 VS Code 主题（通过 `.shiki-light` / `.shiki-dark` 类选择） |
| **CJK 排版优化** | 中日韩文本换行和间距优化 |
| **搜索高亮** | Markdown 预览/编辑模式基于 CSS Custom Highlights API 的 DOM 搜索；CSV 内置独立搜索/替换面板 |

---

## 文档导航

| 文档 | 内容 |
|------|------|
| [快速安装使用指南](./Quick-Start.md) | 5 分钟上手，涵盖安装、使用和快捷键 |
| [架构设计](./Architecture.md) | 整体架构、进程模型与数据流 |
| [扩展宿主层](./Extension-Host.md) | Node.js 侧的扩展激活、命令注册与 Custom Text Editor |
| [Webview UI 层](./Webview-UI.md) | React 前端的组件树、Hooks 和消息通信 |
| [编辑器模式](./Editor-Modes.md) | Markdown Preview / WYSIWYG 模式的实现细节 |
| [样式系统](./Styling-System.md) | Tailwind v4 主题桥接与单文件样式策略 |
| [构建与开发](./Build-and-Development.md) | Webpack（扩展）+ Vite（Webview）双工具链 |
| [测试体系](./Testing.md) | Vitest 测试框架、Mock 策略与测试用例 |
| [API 参考](./API-Reference.md) | 命令、消息协议与核心类型定义 |
| [贡献指南](./Contributing.md) | 代码规范、提交流程与开发环境搭建 |

---

## 技术栈

```
扩展宿主 (Node.js)              Webview (Chromium)
┌──────────────────┐            ┌───────────────────────┐
│  TypeScript       │            │  React 19             │
│  VS Code API      │◄──────────►│  Streamdown (preview) │
│  fast-diff        │ postMessage│  Milkdown (WYSIWYG)   │
│                   │            │  KaTeX / Mermaid      │
└──────────────────┘            │  Shiki / Excalidraw   │
                                 │  Tailwind CSS v4      │
                                 └───────────────────────┘
构建工具: Webpack 5（仅扩展） + Vite（仅 Webview）
测试框架: Vitest 4 + jsdom + React Testing Library
```

---

## 项目结构

```
vibe-documents/
├── src/                              # 扩展宿主代码 (Node.js)
│   ├── extension.ts                  # 扩展入口，注册 Custom Editor、CodeLens、命令
│   ├── customTextEditorProvider.ts   # Custom Text Editor 双向同步与防循环
│   ├── codeLensProvider.ts           # CodeLens 渲染文件顶部 "Open with Vibe..." 按钮
│   ├── editorTypes.ts                # FileType 推断与 viewType 映射
│   ├── textDocumentEdits.ts          # 基于 fast-diff 的增量 WorkspaceEdit
│   ├── webviewHost.ts                # Webview 资源根目录与 HTML/CSP 注入
│   ├── utils.ts                      # nonce 生成、HTML 模板、resolveImageSrc
│   └── __tests__/                    # 扩展层 Vitest 测试
├── webview/                          # Webview 前端代码 (React)
│   ├── index.tsx                     # React 入口（katex/streamdown/excalidraw/main.css 导入）
│   ├── App.tsx                       # 根组件，按 fileType 路由 Markdown/CSV/Excalidraw
│   ├── Toolbar.tsx                   # 预览/编辑模式切换
│   ├── MilkdownEditor.tsx            # Milkdown WYSIWYG 编辑器
│   ├── MermaidBlock.tsx              # Mermaid 块渲染（含全屏/缩放/复制源码）
│   ├── ExcalidrawEditor.tsx          # Excalidraw 全屏编辑器
│   ├── ExcalidrawBlock.tsx           # Markdown 内嵌的 Excalidraw 块
│   ├── CsvViewer.tsx                 # CSV 编辑器入口
│   ├── ThemeContext.tsx              # 暗/亮主题上下文
│   ├── hooks.tsx                     # useVsCodeMessages / useMarkdownComponents / useVsCodeTheme
│   ├── messageBus.ts                 # Webview 全局消息订阅总线
│   ├── vscodeApi.ts                  # acquireVsCodeApi 单例缓存
│   ├── codeHighlighter.ts            # Streamdown 代码高亮插件配置
│   ├── markdownPreviewConfig.ts      # Shiki 主题配置常量
│   ├── saveShortcut.ts               # Cmd+S 拦截与回写
│   ├── useCodeBlockSelectAll.ts      # Cmd+A 智能两阶段全选
│   ├── editableCodeBlockNodeView.ts  # Milkdown 代码块 NodeView
│   ├── csv/                          # CSV 编辑器模块
│   │   ├── types.ts                  # 状态、动作、选区类型
│   │   ├── parser.ts                 # CSV 解析/序列化
│   │   ├── history.ts                # UndoRedoStack（MAX_HISTORY=100）
│   │   ├── store.ts                  # useReducer + 历史栈
│   │   ├── VirtualGrid.tsx           # 虚拟滚动网格
│   │   ├── ColumnHeader.tsx          # 表头（排序 + 列宽 + 拖拽换列）
│   │   ├── CellRenderer.tsx          # 单元格渲染
│   │   ├── CellEditor.tsx            # 行内编辑器
│   │   ├── CsvToolbar.tsx            # 搜索/替换工具栏
│   │   ├── ContextMenu.tsx           # 行/列右键菜单
│   │   ├── useSelection.ts           # 选区/拖选/箭头移动
│   │   ├── useKeyboard.ts            # 键盘快捷键（Undo/Redo/Arrow/Tab/Enter/F2/Delete/Escape）
│   │   ├── useCopyPaste.ts           # 剪贴板（TSV）
│   │   └── useDragReorder.ts         # 列拖拽换序
│   ├── search/                       # 通用 DOM 搜索模块
│   │   ├── regexUtils.ts             # 正则构建（caseSensitive/wholeWord/useRegex）
│   │   ├── domHighlighter.ts         # CSS Custom Highlights API 渲染
│   │   ├── useSearch.ts              # 搜索 Hook（preview/wysiwyg 容器自适应）
│   │   └── SearchWidget.tsx          # 搜索面板 UI
│   ├── styles/
│   │   └── main.css                  # Tailwind v4 入口 + VS Code 变量桥接 + Cursor 设计令牌
│   └── __tests__/                    # Webview 层 Vitest 测试
├── test/                             # 通用测试
│   ├── manifest.test.ts              # package.json 完整性测试
│   ├── setup.ts                      # 测试设置（jest-dom 扩展）
│   └── __mocks__/vscode.ts           # VS Code API Mock
├── showcases/                        # 功能测试示例文件（基础格式、代码块、Mermaid、CSV 等）
├── wiki/                             # 本 Wiki 文档
├── dist/                             # 构建输出（webpack + vite）
├── package.json                      # 扩展清单与依赖
├── webpack.config.js                 # Webpack 配置（仅扩展）
├── vite.config.webview.ts            # Vite 配置（仅 Webview）
├── vitest.config.ts                  # Vitest 配置
└── tsconfig.json                     # TypeScript 配置
```

---

## 许可证

MIT License
