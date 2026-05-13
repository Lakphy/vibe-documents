# Vibe Documents Wiki

> **Vibe Documents** — 一款灵感源自 Cursor 渲染风格的 VS Code Markdown 预览扩展，内置 Mermaid 图表、KaTeX 数学公式、Shiki 代码高亮以及 CJK 排版优化。

---

## 功能亮点

| 功能 | 说明 |
|------|------|
| **预览模式** | 基于 Streamdown 的只读渲染，完美复刻 Cursor 风格 |
| **所见即所得模式** | 基于 Milkdown（ProseMirror）的富文本编辑，支持数学公式与 Mermaid 图表 |
| **双向同步** | Webview 编辑实时写回文件，文件变更实时推送到 Webview |
| **Excalidraw 编辑器** | 直接打开 `.excalidraw` 文件进行手绘风格图形编辑 |
| **CSV 编辑器** | 高性能虚拟滚动表格，支持编辑、排序、搜索替换、撤销重做 |
| **Mermaid 图表** | 流程图、时序图、甘特图等 |
| **KaTeX 数学公式** | 行内 `$...$` 和行间 `$$...$$` |
| **Shiki 代码高亮** | 双主题支持（github-light / github-dark），自动跟随 VS Code 主题 |
| **CJK 排版优化** | 中日韩文本自动换行和间距优化 |

---

## 文档导航

| 文档 | 内容 |
|------|------|
| [快速安装使用指南](./Quick-Start.md) | 5 分钟上手，涵盖安装、使用和快捷键 |
| [架构设计](./Architecture.md) | 整体架构、进程模型与数据流 |
| [扩展宿主层](./Extension-Host.md) | Node.js 侧的扩展激活、命令注册与预览面板管理 |
| [Webview UI 层](./Webview-UI.md) | React 前端的组件树、Hooks 和消息通信 |
| [编辑器模式](./Editor-Modes.md) | 两种模式的实现细节：Preview / WYSIWYG |
| [样式系统](./Styling-System.md) | CSS 变量桥接、Cursor 设计令牌与主题适配 |
| [构建与开发](./Build-and-Development.md) | Webpack 配置、开发流程与打包发布 |
| [测试体系](./Testing.md) | Vitest 测试框架、Mock 策略与测试用例 |
| [API 参考](./API-Reference.md) | 命令、消息协议与核心类型定义 |
| [贡献指南](./Contributing.md) | 代码规范、提交流程与开发环境搭建 |

---

## 技术栈

```
扩展宿主 (Node.js)          Webview (Browser)
┌──────────────────┐        ┌───────────────────────┐
│  TypeScript       │        │  React 19             │
│  VS Code API      │◄──────►│  Streamdown           │
│                   │ 消息   │  Milkdown (ProseMirror)│
│                   │ 通信   │  KaTeX / Mermaid      │
└──────────────────┘        │  Shiki                │
                             └───────────────────────┘
构建工具: Webpack 5 + ts-loader
测试框架: Vitest + jsdom + React Testing Library
```

---

## 项目结构

```
vibe-documents/
├── src/                        # 扩展宿主代码 (Node.js)
│   ├── extension.ts            # 扩展入口，命令注册
│   ├── customTextEditorProvider.ts # Custom Text Editor 管理与双向通信
│   ├── editorTypes.ts          # 文件类型与 viewType 映射
│   ├── textDocumentEdits.ts    # 增量 WorkspaceEdit 生成
│   ├── webviewHost.ts          # Webview HTML 与资源配置
│   ├── codeLensProvider.ts     # CodeLens（文件顶部预览按钮）
│   ├── utils.ts                # 工具函数（nonce 生成、HTML 模板、图片路径）
│   └── __tests__/              # 扩展层单元测试
├── webview/                    # Webview 前端代码 (React)
│   ├── index.tsx               # React 入口，CSS 导入
│   ├── App.tsx                 # 根组件，按 fileType 路由
│   ├── Toolbar.tsx             # 模式切换工具栏
│   ├── MilkdownEditor.tsx      # WYSIWYG 编辑器 (Milkdown)
│   ├── ExcalidrawEditor.tsx    # Excalidraw 全屏编辑器
│   ├── ExcalidrawBlock.tsx     # Excalidraw 内嵌块渲染
│   ├── CsvViewer.tsx           # CSV 高性能编辑器入口
│   ├── csv/                    # CSV 编辑器模块
│   │   ├── types.ts            # 类型定义
│   │   ├── parser.ts           # CSV 解析/序列化
│   │   ├── history.ts          # 撤销/重做栈
│   │   ├── store.ts            # 状态管理 (useReducer)
│   │   ├── VirtualGrid.tsx     # 虚拟滚动网格
│   │   ├── ColumnHeader.tsx    # 表头（排序 + 列宽）
│   │   ├── CellRenderer.tsx    # 单元格渲染
│   │   ├── CellEditor.tsx      # 行内编辑器
│   │   ├── CsvToolbar.tsx      # CSV 工具栏
│   │   ├── ContextMenu.tsx     # 右键菜单
│   │   ├── useSelection.ts     # 选区逻辑
│   │   ├── useKeyboard.ts      # 键盘快捷键
│   │   └── useCopyPaste.ts     # 复制/粘贴
│   ├── hooks.tsx               # 自定义 Hooks
│   ├── styles/main.css         # Tailwind CSS 样式
│   └── __tests__/              # Webview 层单元测试
├── test/                       # 通用测试
│   ├── manifest.test.ts        # package.json 完整性测试
│   └── __mocks__/vscode.ts     # VS Code API Mock
├── showcases/                  # 功能测试示例文件
├── dist/                       # 构建输出
├── package.json                # 扩展清单与依赖
├── webpack.config.js           # Webpack 双入口配置
├── tsconfig.json               # TypeScript 配置
├── vitest.config.ts            # Vitest 测试配置
└── wiki/                       # 本 Wiki 文档
```

---

## 许可证

MIT License
