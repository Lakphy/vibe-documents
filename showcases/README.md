# Vibe Documents 测试文档集

> 本目录包含了用于测试 Vibe Documents 插件各项功能的 Markdown 示例文档。
> 每个文件聚焦于一个特定功能领域，方便逐项验证渲染效果。

## 文档索引

| 文件 | 测试范围 | 关键功能 |
|------|---------|---------|
| [01-basic-formatting.md](01-basic-formatting.md) | 基础格式 | 标题、加粗、斜体、删除线、行内代码 |
| [02-code-blocks.md](02-code-blocks.md) | 代码高亮 | 多语言 Shiki 高亮、行号、主题切换 |
| [03-mermaid-diagrams.md](03-mermaid-diagrams.md) | Mermaid 图表 | 流程图、时序图、甘特图、类图等 |
| [04-math-formulas.md](04-math-formulas.md) | 数学公式 | KaTeX 行内/块级公式 |
| [05-tables.md](05-tables.md) | 表格 | GFM 表格、对齐、复杂内容 |
| [06-lists.md](06-lists.md) | 列表 | 有序/无序/嵌套/任务列表 |
| [07-blockquotes-links-images.md](07-blockquotes-links-images.md) | 引用/链接/图片 | 多层引用、链接样式、图片展示 |
| [08-cjk-typography.md](08-cjk-typography.md) | CJK 排版 | 中日韩文本排版优化 |
| [09-excalidraw.md](09-excalidraw.md) | Excalidraw | 手绘风格图形渲染（Markdown 内嵌） |
| [10-edge-cases.md](10-edge-cases.md) | 边界情况 | 极端/特殊场景压力测试 |
| [11-mixed-content.md](11-mixed-content.md) | 综合测试 | 多种功能混合使用 |
| [sample.excalidraw](sample.excalidraw) | Excalidraw 编辑器 | 独立 .excalidraw 文件的全屏编辑 |
| [sample.csv](sample.csv) | CSV 编辑器 | 高性能虚拟表格、编辑、排序、搜索 |

## 使用方式

1. 在 VS Code 中安装 Vibe Documents 插件
2. 打开本目录中的任意文件
3. 使用 `Cmd+Shift+V`（macOS）/ `Ctrl+Shift+V` 打开预览
4. Markdown 文件可用 `Cmd+Shift+E` / `Ctrl+Shift+E` 切换模式：
   - **Preview 模式**：只读渲染（Streamdown）
   - **WYSIWYG 模式**：富文本编辑（Milkdown）
   - **Source 模式**：源码编辑（CodeMirror）
5. `.excalidraw` 文件打开为全屏 Excalidraw 编辑器
6. `.csv` 文件打开为高性能表格编辑器（支持虚拟滚动、编辑、排序、搜索替换）

## 验证要点

- [ ] 预览模式下所有 Markdown 元素正确渲染
- [ ] WYSIWYG 模式下可编辑并正确保存
- [ ] Source 模式下语法高亮和行号正常
- [ ] 深色/浅色主题切换后样式正确
- [ ] 双向同步：编辑后文件内容及时更新
- [ ] Excalidraw 编辑器正常加载和保存
- [ ] CSV 编辑器能正确解析、编辑、排序数据
- [ ] CSV 搜索替换功能正常
- [ ] CSV 撤销/重做功能正常
