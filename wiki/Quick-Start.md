# 快速开始

本页说明如何从当前仓库构建、安装并使用 Vibe Documents。

## 前置条件

- VS Code 1.85.0 或兼容的 Cursor 编辑器。
- Node.js 和 npm，用于本地构建、测试和打包。

## 从源码安装 VSIX

```bash
git clone <repository-url>
cd vibe-documents
npm install
npm run build
npm run package
code --install-extension vibe-documents-0.2.2.vsix
```

`npm run package` 依赖 `vsce package`。如果本机没有可用的 `vsce`，需要先安装或用项目环境中可用的打包方式运行。

## 开发模式

```bash
npm install
npm run dev
```

随后在 VS Code 中按 F5 启动扩展开发宿主。在开发宿主中打开 `.md`、`.markdown`、`.csv` 或 `.excalidraw` 文件，再通过 CodeLens、编辑器标题栏、资源管理器右键菜单或命令面板打开 Vibe Editor。

## 打开 Markdown

Markdown 支持 `.md` 和 `.markdown` 文件。可用入口包括：

- 命令面板中的 `Vibe: Open Markdown Preview`。
- 命令面板中的 `Vibe: Open Markdown Preview to the Side`。
- Markdown 编辑器标题栏中的 `Vibe: Open Markdown Preview`。
- 资源管理器右键菜单中的 `Vibe: Open Markdown Preview`。
- Markdown 文件顶部 CodeLens。
- `Ctrl+Shift+V` 或 macOS `Cmd+Shift+V`，其 when 条件是 `editorLangId == markdown`。

## Markdown 模式切换

Markdown 默认进入 Preview 模式。顶部工具栏可以切换 Preview 和 WYSIWYG。`Ctrl+Shift+E` 或 macOS `Cmd+Shift+E` 触发 `vibeDocuments.toggleMode`，其 when 条件是 `vibeDocumentsPreviewFocused`。

Preview 使用 Streamdown 渲染，WYSIWYG 使用 Milkdown 编辑。数学和特殊图表的最终渲染以 Preview 模式为准。

## 打开 CSV

CSV 支持 `.csv` 文件。可用入口包括：

- 命令面板中的 `Vibe: Open CSV Preview`。
- CSV 编辑器标题栏中的 `Vibe: Open CSV Preview`。
- 资源管理器右键菜单中的 `Vibe: Open CSV Preview`。
- CSV 文件顶部 CodeLens。
- `Ctrl+Shift+V` 或 macOS `Cmd+Shift+V`，其 when 条件是 `resourceExtname == .csv`。

CSV 编辑器支持单元格编辑、行列插入删除、列排序、列宽拖拽、行列拖拽换序、搜索替换、撤销重做和 TSV 复制粘贴。内部使用行列虚拟化，编辑后 500ms debounce 回写。

## 打开 Excalidraw

Excalidraw 支持 `.excalidraw` 文件。可用入口包括：

- 命令面板中的 `Vibe: Open Excalidraw Editor`。
- Excalidraw 编辑器标题栏中的 `Vibe: Open Excalidraw Editor`。
- 资源管理器右键菜单中的 `Vibe: Open Excalidraw Editor`。
- Excalidraw 文件顶部 CodeLens。
- `Ctrl+Shift+V` 或 macOS `Cmd+Shift+V`，其 when 条件是 `resourceExtname == .excalidraw`。

空 `.excalidraw` 内容显示等待状态。无效 JSON 显示错误状态。有效 JSON 会进入全屏 Excalidraw 画布，编辑后 300ms debounce 回写。

## 常用快捷键

| 操作 | Windows/Linux | macOS | 作用域 |
| --- | --- | --- | --- |
| Markdown 当前列打开 | `Ctrl+Shift+V` | `Cmd+Shift+V` | `editorLangId == markdown` |
| CSV 打开 | `Ctrl+Shift+V` | `Cmd+Shift+V` | `resourceExtname == .csv` |
| Excalidraw 打开 | `Ctrl+Shift+V` | `Cmd+Shift+V` | `resourceExtname == .excalidraw` |
| Markdown 模式切换 | `Ctrl+Shift+E` | `Cmd+Shift+E` | `vibeDocumentsPreviewFocused` |
| Markdown 搜索 | `Ctrl+F` | `Cmd+F` | Markdown Webview 内部 |
| CSV 搜索 | `Ctrl+F` | `Cmd+F` | CSV Webview 内部 |
| 保存 | `Ctrl+S` | `Cmd+S` | Webview 内部 |
| CSV 撤销 | `Ctrl+Z` | `Cmd+Z` | CSV Webview 内部 |
| CSV 重做 | `Ctrl+Shift+Z` 或 `Ctrl+Y` | `Cmd+Shift+Z` 或 `Cmd+Y` | CSV Webview 内部 |

## 支持的 Markdown 内容

Preview 模式支持 CommonMark/GFM 语法、代码块、表格、任务列表、链接、图片、数学公式、CJK 排版、Mermaid 代码块和 Excalidraw JSON 代码块。代码高亮使用 Shiki，并按需加载支持的语言。

## 保存和同步

Webview 内的编辑会回写到 VS Code 的 `TextDocument`。保存快捷键会发送 `save` 消息给扩展宿主，扩展宿主在需要时先应用最新内容，再调用 `document.save()`。

## 下一步

- 阅读 [Architecture](./Architecture.md) 了解数据流。
- 阅读 [Webview UI](./Webview-UI.md) 了解前端组件。
- 阅读 [Testing](./Testing.md) 了解测试命令和覆盖率。
