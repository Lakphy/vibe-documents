# Vibe Documents Wiki

> **Vibe Documents** — 一款灵感源自 Cursor 渲染风格的 VS Code Markdown 预览扩展，内置 Mermaid 图表、KaTeX 数学公式、Shiki 代码高亮以及 CJK 排版优化。

---

## 功能亮点

| 功能 | 说明 |
|------|------|
| **预览模式** | 基于 Streamdown 的只读渲染，完美复刻 Cursor 风格 |
| **所见即所得模式** | 基于 Milkdown（ProseMirror）的富文本编辑，支持数学公式与 Mermaid 图表 |
| **源码模式** | 基于 CodeMirror 6 的纯文本编辑，行号、语法高亮一应俱全 |
| **双向同步** | Webview 编辑实时写回文件，文件变更实时推送到 Webview |
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
| [编辑器模式](./Editor-Modes.md) | 三种模式的实现细节：Preview / WYSIWYG / Source |
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
│                   │ 通信   │  CodeMirror 6         │
└──────────────────┘        │  KaTeX / Mermaid      │
                             │  Shiki                │
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
│   ├── previewProvider.ts      # Webview 面板管理与双向通信
│   ├── utils.ts                # 工具函数（nonce 生成、HTML 模板、图片路径）
│   └── __tests__/              # 扩展层单元测试
├── webview/                    # Webview 前端代码 (React)
│   ├── index.tsx               # React 入口，CSS 导入
│   ├── App.tsx                 # 根组件，模式切换与插件配置
│   ├── Toolbar.tsx             # 模式切换工具栏
│   ├── MilkdownEditor.tsx      # WYSIWYG 编辑器 (Milkdown)
│   ├── SourceEditor.tsx        # 源码编辑器 (CodeMirror)
│   ├── hooks.tsx               # 自定义 Hooks
│   ├── styles/                 # CSS 样式文件
│   │   ├── theme-bridge.css    # Cursor 设计令牌桥接
│   │   ├── cursor-markdown.css # Cursor 风格 Markdown 样式
│   │   ├── streamdown-controls.css  # Streamdown 控件样式
│   │   ├── toolbar.css         # 工具栏样式
│   │   └── milkdown-overrides.css   # Milkdown 编辑器样式覆盖
│   └── __tests__/              # Webview 层单元测试
├── test/                       # 通用测试
│   ├── manifest.test.ts        # package.json 完整性测试
│   └── __mocks__/vscode.ts     # VS Code API Mock
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
