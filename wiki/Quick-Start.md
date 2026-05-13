# 快速安装使用指南

> 5 分钟内完成安装并开始使用 Vibe Documents。

***

## 前置条件

* **VS Code** ≥ 1.85.0（或 Cursor 编辑器）

* **Node.js** ≥ 18（仅开发时需要）

***

## 安装方式

### 方式一：从 VSIX 安装（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd vibe-documents

# 2. 安装依赖
npm install

# 3. 构建
npm run build

# 4. 打包为 .vsix 文件
npm run package

# 5. 在 VS Code 中安装
code --install-extension vibe-documents-0.2.2.vsix
```

### 方式二：开发模式调试

```bash
# 1. 克隆并安装依赖
git clone <repository-url>
cd vibe-documents
npm install

# 2. 启动开发模式（自动监听文件变更并重新构建）
npm run dev

# 3. 在 VS Code 中按 F5 启动扩展开发宿主
#    或使用菜单：Run → Start Debugging
```

### 方式三：从 Marketplace 安装（发布后）

在 VS Code 扩展侧栏搜索 **"Vibe Documents"**，点击安装即可。

***

## 基本使用

### 打开 Markdown 预览

有以下几种方式打开预览：

1. **命令面板**：按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`），输入 `Vibe`，选择：

   * `Vibe: Open Markdown Preview` — 在当前编辑器打开预览

   * `Vibe: Open Markdown Preview to the Side` — 在侧边打开预览

2. **快捷键**：

   * `Ctrl+Shift+V`（Mac: `Cmd+Shift+V`）— 在侧边打开预览

3. **编辑器标题栏**：打开 `.md` 文件后，点击编辑器右上角的预览图标

4. **资源管理器右键菜单**：右键点击 `.md` 文件，选择 `Vibe: Open Markdown Preview`

### 切换编辑模式

Vibe Documents 提供两种模式：

| 模式     | 图标   | 说明                       |
| ------ | ---- | ------------------------ |
| **预览** | 👁   | 只读渲染，Cursor 风格的精美预览      |
| **编辑** | ✏️   | 所见即所得编辑，支持数学公式和图表        |

切换方式：

* **工具栏**：点击顶部工具栏的模式按钮

* **快捷键**：`Ctrl+Shift+E`（Mac: `Cmd+Shift+E`）循环切换两种模式

### 编辑与同步

在 **编辑模式** 下修改内容，变更会实时写回源文件。同时，在 VS Code 编辑器中直接编辑源文件，预览窗口也会实时更新。

### 打开 Excalidraw 编辑器

`.excalidraw` 文件可以直接在扩展中打开为全屏可编辑的 Excalidraw 画布：

1. **编辑器标题栏**：打开 `.excalidraw` 文件后，点击右上角预览图标
2. **资源管理器右键菜单**：右键 `.excalidraw` 文件 → `Vibe: Open Excalidraw Editor`
3. **快捷键**：`Ctrl+Shift+V`（Mac: `Cmd+Shift+V`）

编辑内容会自动回写到源文件。

### 打开 CSV 编辑器

`.csv` 文件可以在高性能表格编辑器中打开：

1. **编辑器标题栏**：打开 `.csv` 文件后，点击右上角预览图标
2. **资源管理器右键菜单**：右键 `.csv` 文件 → `Vibe: Open CSV Preview`
3. **快捷键**：`Ctrl+Shift+V`（Mac: `Cmd+Shift+V`）

CSV 编辑器功能：

* **虚拟滚动** — 流畅处理十万行级别数据

* **单元格编辑** — 双击或按 Enter/F2 进入编辑

* **行列操作** — 右键菜单插入/删除行列

* **复制粘贴** — 支持与 Excel 互通的 TSV 格式

* **撤销重做** — `Ctrl+Z` / `Ctrl+Shift+Z`

* **搜索替换** — `Ctrl+F` 打开搜索面板

* **列排序** — 点击表头排序（自动检测数字/文本）

* **列宽调整** — 拖拽表头边界

***

## 支持的 Markdown 特性

### 基础语法

# 标题

**粗体** *斜体* ~~删除线~~
[链接](https://example.com)
![图片](./image.png)

### 代码块

```javascript
console.log('Shiki 高亮，支持 github-light / github-dark 双主题');
```

### 数学公式

行内公式：$E = mc^2$

行间公式：

$$
\int\_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

### Mermaid 图表

```mermaid
graph TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行操作]
    B -->|否| D[结束]
    C --> D
```

### GFM 扩展

| 表头1 | 表头2 |
| --- | --- |
| 单元格 | 单元格 |

* [x] 已完成任务

* [ ] 待完成任务

***

## 快捷键速查

| 操作            | Windows/Linux                  | macOS         |
| ------------- | ------------------------------ | ------------- |
| Markdown 预览   | `Ctrl+Shift+V`                 | `Cmd+Shift+V` |
| Excalidraw 预览 | `Ctrl+Shift+V`（.excalidraw 文件） | `Cmd+Shift+V` |
| CSV 预览        | `Ctrl+Shift+V`（.csv 文件）        | `Cmd+Shift+V` |
| 切换模式          | `Ctrl+Shift+E`                 | `Cmd+Shift+E` |
| CSV 搜索        | `Ctrl+F`                       | `Cmd+F`       |
| CSV 撤销        | `Ctrl+Z`                       | `Cmd+Z`       |
| CSV 重做        | `Ctrl+Shift+Z`                 | `Cmd+Shift+Z` |

***

## 常见问题

### Q: 预览窗口显示 "Waiting for content..."

确保当前打开的是 `.md` 文件。扩展仅在打开 Markdown 文件时激活。

### Q: 图片无法显示

* 确保图片路径正确（支持相对路径和绝对 URL）

* 本地图片会通过 Webview 的 `localResourceRoots` 安全加载

### Q: 数学公式 / Mermaid 图表无法渲染

确认已正确构建扩展（`npm run build`）。这些功能依赖于打包后的 Webview 资源。

### Q: 如何在 WYSIWYG 模式下使用数学公式？

WYSIWYG（Milkdown）模式将 `$...$` 与 `$$...$$` 作为普通文本/代码块编辑；最终渲染请切换回 **Preview** 模式（Streamdown 通过 `@streamdown/math` 用 KaTeX 渲染）。

***

## 下一步

* 了解 [架构设计](./Architecture.md) 深入理解工作原理

* 参阅 [贡献指南](./Contributing.md) 加入开发
