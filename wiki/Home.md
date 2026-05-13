# Vibe Documents Wiki

Vibe Documents 是一个 VS Code Custom Text Editor 扩展，用同一个 Webview 应用打开 Markdown、CSV 和 `.excalidraw` 文件。扩展宿主负责命令、CodeLens、自定义编辑器生命周期和 `TextDocument` 同步，Webview 负责 React UI、渲染、编辑和快捷键交互。

## 当前能力

| 文件类型 | 入口 | Webview 行为 |
| --- | --- | --- |
| Markdown | `vibeDocuments.markdownEditor` | 默认显示 Streamdown 预览，可切换到 Milkdown WYSIWYG 编辑 |
| CSV | `vibeDocuments.csvEditor` | 使用虚拟滚动表格编辑 CSV，支持排序、搜索替换、复制粘贴、行列操作和撤销重做 |
| Excalidraw | `vibeDocuments.excalidrawEditor` | 使用 `@excalidraw/excalidraw` 打开全屏画布并回写 `.excalidraw` JSON |

## Markdown 预览能力

Markdown 预览由 `webview/MarkdownPreview.tsx` 和 Streamdown 实现。预览按内容启用 `@streamdown/math` 和 `@streamdown/cjk`，把 `mermaid` 与 `excalidraw` 代码块交给自定义懒加载渲染器处理，并使用 `webview/codeHighlighter.ts` 中的 Shiki 插件做按语言、按主题的异步高亮。

## 同步模型

Webview 启动后先发送 `{ type: 'ready' }`，扩展宿主收到后强制推送一次 `{ type: 'update', content, baseUri, fileType }`。外部文件变化会被 `VibeCustomTextEditorProvider` 以 50ms 定时器合并后推送。Webview 内的编辑通过 `{ type: 'edit', content }` 回写，保存快捷键通过 `{ type: 'save', content? }` 触发扩展端 `document.save()`。

## 性能相关实现

Webview 主入口只在收到首个 `update` 后才加载具体编辑器。Markdown、CSV、Excalidraw、Mermaid 块、Markdown 内嵌 Excalidraw 块和 Milkdown 编辑器都使用 `React.lazy()` 拆分。Shiki 只加载被请求的语言和主题，Mermaid 使用 IntersectionObserver、配置缓存和 SVG 缓存，CSV 搜索匹配会在单元格编辑时增量更新，在结构性编辑后重算。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [Quick Start](./Quick-Start.md) | 安装、构建、常用入口和快捷键 |
| [Architecture](./Architecture.md) | 双进程架构、数据流、安全模型和性能策略 |
| [Extension Host](./Extension-Host.md) | `src/` 中的命令、CodeLens、Custom Text Editor 和 Webview 宿主 |
| [Webview UI](./Webview-UI.md) | `webview/` 中的 React 组件、Hooks、消息总线和编辑器路由 |
| [Editor Modes](./Editor-Modes.md) | Markdown Preview 与 WYSIWYG 两种模式 |
| [Styling System](./Styling-System.md) | Tailwind v4、VS Code 变量映射和第三方样式加载 |
| [Build and Development](./Build-and-Development.md) | Webpack、Vite、脚本、产物和性能预算 |
| [Testing](./Testing.md) | Vitest 配置、Mock 策略、测试范围和覆盖率 |
| [API Reference](./API-Reference.md) | 命令、消息协议、类型和工具函数 |
| [Contributing](./Contributing.md) | 开发流程和修改约束 |

## 项目结构

```text
vibe-documents/
├── src/                         # VS Code Extension Host 代码
│   ├── extension.ts             # activate/deactivate，注册命令、CodeLens、Custom Editors
│   ├── customTextEditorProvider.ts
│   ├── codeLensProvider.ts
│   ├── editorTypes.ts
│   ├── textDocumentEdits.ts
│   ├── webviewHost.ts
│   └── utils.ts
├── webview/                     # React Webview 应用
│   ├── App.tsx                  # 首次 update 后按 fileType 懒加载编辑器
│   ├── MarkdownPreview.tsx      # Markdown 预览和 WYSIWYG 模式容器
│   ├── MilkdownEditor.tsx
│   ├── CsvViewer.tsx
│   ├── ExcalidrawEditor.tsx
│   ├── MermaidBlock.tsx
│   ├── ExcalidrawBlock.tsx
│   ├── csv/
│   ├── search/
│   └── styles/main.css
├── test/                        # 测试设置和 VS Code Mock
├── scripts/                     # Webview sourcemap 清理和性能预算检查
├── wiki/                        # 本文档
├── dist/                        # 构建输出
├── package.json
├── webpack.config.js
├── vite.config.webview.ts
├── vitest.config.ts
└── tsconfig.json
```

## 许可证

项目使用 MIT License。
