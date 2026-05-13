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
# Fork 并克隆项目
git clone <your-fork-url>
cd vibe-documents

# 安装依赖
npm install

# 验证构建
npm run build

# 验证测试
npm test
```

### 开发流程

```bash
# 终端 1：启动 Webpack watch
npm run dev

# 在 VS Code 中：
# 1. 按 F5 启动扩展开发宿主
# 2. 在开发宿主中打开一个 .md 文件
# 3. 使用 Cmd+Shift+V 打开预览
# 4. 修改代码后，在开发宿主中按 Cmd+R 重新加载
```

---

## 项目结构

```
vibe-documents/
├── src/                     # Extension Host（Node.js）
│   ├── extension.ts         # 入口：命令注册
│   ├── customTextEditorProvider.ts # Custom Text Editor 管理与通信
│   ├── editorTypes.ts       # 文件类型与 viewType 映射
│   ├── textDocumentEdits.ts # 增量编辑工具
│   ├── webviewHost.ts       # Webview 宿主配置
│   ├── utils.ts             # 工具函数
│   └── __tests__/           # 单元测试
├── webview/                 # Webview UI（React）
│   ├── index.tsx            # React 入口
│   ├── App.tsx              # 根组件
│   ├── Toolbar.tsx          # 工具栏
│   ├── MilkdownEditor.tsx   # WYSIWYG 编辑器
│   ├── hooks.tsx            # 自定义 Hooks
│   ├── styles/              # CSS 样式
│   └── __tests__/           # 组件测试
├── test/                    # 通用测试与 Mock
└── wiki/                    # 文档
```

---

## 代码规范

### TypeScript

- 启用 `strict` 模式
- 优先使用 `const` 和只读属性
- 使用明确的类型注解（避免隐式 `any`）
- 导出的函数和类需要类型注解

### React

- 使用函数组件和 Hooks
- 使用 `react-jsx` 转换（无需 `import React`）
- 使用 `useMemo` / `useCallback` 避免不必要的重渲染
- 事件监听器在 `useEffect` 清理函数中移除

### CSS

- 使用 `--cursor-*` 设计令牌而非硬编码颜色
- 使用 `--vscode-*` 变量实现主题适配
- 新样式文件需在 `webview/index.tsx` 中按正确顺序导入
- 使用 BEM 风格命名：`.vd-component-name`、`.vd-component-name--modifier`

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 文件名（组件） | PascalCase | `MilkdownEditor.tsx` |
| 文件名（工具） | camelCase | `utils.ts` |
| 组件 | PascalCase | `function MilkdownEditor()` |
| Hook | camelCase，`use` 前缀 | `useVsCodeMessages()` |
| CSS 类 | kebab-case，`vd-` 前缀 | `.vd-toolbar-btn` |
| CSS 变量 | kebab-case，`--cursor-` 前缀 | `--cursor-text-primary` |
| 命令 ID | camelCase，命名空间前缀 | `vibeDocuments.showPreview` |

---

## 提交规范

### 分支命名

```
feature/描述     # 新功能
fix/描述         # Bug 修复
refactor/描述    # 重构
docs/描述        # 文档更新
test/描述        # 测试相关
```

### Commit 消息

```
<type>: <简要描述>

<详细说明（可选）>
```

类型：
- `feat` — 新功能
- `fix` — Bug 修复
- `refactor` — 重构（不影响功能）
- `style` — 样式修改
- `test` — 测试
- `docs` — 文档
- `chore` — 构建/依赖/配置

示例：
```
feat: 优化预览模式的代码块渲染

调整 Streamdown 代码块的主题切换和复制按钮样式。
```

---

## 提交代码前

### 检查清单

- [ ] 代码通过 TypeScript 编译（`npm run build` 无错误）
- [ ] 所有测试通过（`npm test`）
- [ ] 新功能有对应的测试用例
- [ ] CSS 使用设计令牌而非硬编码值
- [ ] 两种主题（亮色/暗色）下视觉效果正常
- [ ] 两种编辑模式的切换功能正常

### 测试要求

```bash
# 确保全部测试通过
npm test

# 对于新功能，建议运行覆盖率检查
npm run test:coverage
```

---

## 添加新功能指南

### 添加新命令

1. 在 `package.json` 的 `contributes.commands` 中声明命令
2. 在 `src/extension.ts` 中注册命令处理器
3. 在 `test/manifest.test.ts` 中添加清单测试
4. 在 `src/__tests__/extension.test.ts` 中添加行为测试

### 添加新的 Streamdown 插件

1. 安装插件包 `npm install @streamdown/xxx`
2. 在 `webview/App.tsx` 的 `plugins` 对象中添加
3. 在 `package.json` 的依赖中确认已声明
4. 必要时在 CSS 文件中添加样式覆盖

### 添加新的编辑模式

1. 在 `webview/Toolbar.tsx` 的 `MODES` 数组中添加模式定义
2. 在 `webview/App.tsx` 中添加条件渲染分支
3. 创建对应的编辑器组件
4. 实现 `postMessage({ type: 'edit' })` 回写机制
5. 更新 `EditorMode` 类型定义

### 添加新样式

1. 在 `webview/styles/` 中创建新 CSS 文件
2. 在 `webview/index.tsx` 中按正确优先级导入
3. 使用 `--cursor-*` 和 `--vscode-*` 变量
4. 在 `test/manifest.test.ts` 的 `requiredFiles` 中添加
5. 在亮色和暗色主题下测试

---

## 架构决策记录

### 为什么使用全量替换而非增量 diff？

编辑回写使用 `WorkspaceEdit.replace()` 替换整个文档内容，而非计算 diff 后做增量更新。原因：

1. **简单可靠** — 避免 diff 算法的边界情况
2. **性能可接受** — Markdown 文件通常不会很大
3. **一致性** — Milkdown 的变更监听提供完整内容

### 为什么 Webview 使用独立编辑器组件？

Preview（Streamdown）和 WYSIWYG（Milkdown）是两个完全不同的库，各自有独立的初始化和状态管理。使用条件渲染并保留已访问模式，避免重复初始化编辑器。

### 为什么使用 CSS 变量而非主题文件？

VS Code 的 Webview 会自动注入 `--vscode-*` CSS 变量，覆盖所有主题颜色。通过变量桥接可以：
1. 自动适配所有 VS Code 主题
2. 无需维护多套主题文件
3. 实时响应主题切换

---

## 获取帮助

- 阅读 [架构设计](./Architecture.md) 了解整体设计
- 阅读 [API 参考](./API-Reference.md) 了解接口定义
- 提交 Issue 讨论新功能或报告 Bug

---

## 相关文档

- [快速安装使用指南](./Quick-Start.md) — 上手体验
- [构建与开发](./Build-and-Development.md) — 详细的开发环境配置
- [测试体系](./Testing.md) — 测试编写指南
