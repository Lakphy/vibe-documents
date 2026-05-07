# 测试体系

> 项目使用 Vitest 作为测试框架，配合 jsdom 环境模拟浏览器和 VS Code API Mock，覆盖扩展宿主和 Webview 两个层面。

---

## 测试框架

| 工具 | 版本 | 用途 |
|------|------|------|
| Vitest | ^4.1.5 | 测试运行器和断言库 |
| jsdom | ^29.1.1 | 浏览器环境模拟 |
| @testing-library/react | ^16.3.2 | React 组件测试 |
| @testing-library/jest-dom | ^6.9.1 | DOM 断言扩展 |
| @testing-library/user-event | ^14.6.1 | 用户交互模拟 |

---

## 配置

### vitest.config.ts

```typescript
export default defineConfig({
  test: {
    globals: true,                    // 全局暴露 describe/it/expect
    environment: 'jsdom',             // 使用 jsdom 模拟浏览器
    include: [
      'src/**/*.test.ts',            // 扩展宿主测试
      'webview/**/*.test.tsx',        // Webview 组件测试
      'test/**/*.test.ts',           // 通用测试
    ],
    setupFiles: ['./test/setup.ts'],  // 测试设置文件
    css: false,                       // 不处理 CSS 导入
    alias: {
      vscode: './test/__mocks__/vscode.ts',  // Mock VS Code API
    },
  },
});
```

关键配置：
- **environment: 'jsdom'** — 所有测试运行在 jsdom 环境中
- **css: false** — 跳过 CSS 文件处理，避免测试环境中的样式问题
- **alias.vscode** — 将 `import * as vscode from 'vscode'` 重定向到 Mock

---

## VS Code API Mock

### test/__mocks__/vscode.ts

全面模拟 VS Code API，使扩展代码可以在非 VS Code 环境中测试。

#### 核心 Mock 对象

| Mock | 说明 |
|------|------|
| `Uri` | 文件 URI 创建（`Uri.file()`、`Uri.parse()`） |
| `ViewColumn` | 编辑器列枚举 |
| `window` | 窗口管理（`createWebviewPanel`、`activeTextEditor`） |
| `workspace` | 工作区（`openTextDocument`、`applyEdit`、文件监听） |
| `commands` | 命令注册（`registerCommand`） |
| `WorkspaceEdit` | 工作区编辑 |
| `Range` / `Position` | 文本位置 |
| `ThemeIcon` | 主题图标 |
| `RelativePattern` | 文件匹配模式 |

#### WebviewPanel Mock

```typescript
const createMockPanel = () => ({
  webview: {
    html: '',
    cspSource: 'https://mock-csp-source',
    asWebviewUri: vi.fn((uri) => ({
      toString: () => `https://webview-uri${uri.path}`,
    })),
    postMessage: vi.fn().mockResolvedValue(true),
    onDidReceiveMessage: vi.fn(() => createMockDisposable()),
  },
  reveal: vi.fn(),
  dispose: vi.fn(),
  onDidDispose: vi.fn((cb) => { disposeCallback = cb; }),
  active: true,
  visible: true,
});
```

#### 可验证的行为

Mock 对象使用 `vi.fn()` 创建，支持：
- `toHaveBeenCalled()` — 验证函数是否被调用
- `toHaveBeenCalledWith(...)` — 验证调用参数
- `.mock.calls` — 访问历史调用参数
- `.mock.results` — 访问历史返回值

---

## 测试文件概览

### test/manifest.test.ts — 清单完整性测试

验证 `package.json` 的声明完整性，确保扩展发布前所有必要配置就绪。

#### 测试覆盖范围

| 测试组 | 验证内容 |
|--------|----------|
| 基础字段 | name、displayName、description、version、publisher、license |
| 命令声明 | showPreview、showPreviewToSide、toggleMode 命令及图标 |
| 菜单配置 | editor/title、explorer/context 菜单绑定 |
| 快捷键 | 预览快捷键、Mac 快捷键、when 条件 |
| 激活事件 | `onLanguage:markdown` |
| 核心依赖 | react、streamdown、所有插件、typescript、webpack |
| 脚本 | build、test、vscode:prepublish |

#### 文件存在性检查

```typescript
const requiredFiles = [
  'tsconfig.json', 'webpack.config.js', '.gitignore', '.vscodeignore',
  'src/extension.ts', 'src/previewProvider.ts', 'src/utils.ts',
  'webview/App.tsx', 'webview/index.tsx', 'webview/hooks.tsx',
  'webview/Toolbar.tsx', 'webview/MilkdownEditor.tsx', 'webview/SourceEditor.tsx',
  'webview/styles/theme-bridge.css', 'webview/styles/cursor-markdown.css',
  'webview/styles/streamdown-controls.css', 'webview/styles/toolbar.css',
  'webview/styles/milkdown-overrides.css',
];
```

### src/__tests__/extension.test.ts — 扩展入口测试

测试 `activate()` 和 `deactivate()` 函数的行为。

| 测试用例 | 验证 |
|----------|------|
| 注册 showPreview 命令 | `registerCommand` 被调用 |
| 注册 showPreviewToSide 命令 | `registerCommand` 被调用 |
| 注册 toggleMode 命令 | `registerCommand` 被调用 |
| 添加到 subscriptions | `context.subscriptions.length === 3` |
| 无 URI 时使用 activeTextEditor | 回退逻辑正确 |
| 接收 URI 参数 | 使用传入的 URI 创建面板 |
| showPreviewToSide 使用 Beside | ViewColumn 正确 |
| 无 URI 无 editor 时不创建面板 | 安全降级 |
| deactivate 不抛异常 | 清理安全 |

### src/__tests__/editSync.test.ts — 编辑同步测试

测试双向通信和模式切换。

| 测试用例 | 验证 |
|----------|------|
| 注册 onDidReceiveMessage | 消息监听器已注册 |
| edit 消息触发 applyEdit | 回写功能正确 |
| toggleMode 发送消息 | 向活动面板发送 toggleMode |
| 无活动面板时 toggleMode 安全 | 不抛异常 |
| 初始内容推送 | postMessage 被调用 |

### webview/__tests__/Toolbar.test.tsx — 工具栏组件测试

使用 React Testing Library 测试 Toolbar 组件。

| 测试用例 | 验证 |
|----------|------|
| 渲染三个模式按钮 | 预览、编辑、源码按钮存在 |
| 当前模式有 active 样式 | CSS 类名正确 |
| 点击触发 onModeChange | 回调参数正确 |
| 每个模式都能高亮 | 三种模式的 active 状态 |

---

## 运行测试

```bash
# 运行全部测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage

# 运行单个文件
npx vitest run test/manifest.test.ts

# 运行匹配模式的测试
npx vitest run --grep "命令声明"
```

---

## 测试策略

### 分层测试

```
┌─────────────────────────┐
│   清单完整性测试          │  ← 防止发布配置缺失
├─────────────────────────┤
│   Extension Host 单元测试 │  ← 命令注册、面板管理、消息通信
├─────────────────────────┤
│   Webview 组件测试        │  ← React 组件渲染和交互
└─────────────────────────┘
```

### Mock 策略

| 被 Mock 的模块 | 原因 |
|---------------|------|
| `vscode` | VS Code API 只在扩展宿主进程中可用 |
| CSS 文件 | jsdom 无法处理 CSS 导入 |

### 最佳实践

1. **测试行为而非实现** — 验证命令被注册而非验证内部数据结构
2. **异步等待** — 使用 `vi.waitFor()` 等待异步操作完成
3. **组件测试使用 Testing Library** — 按角色和文本查找元素，而非 CSS 选择器
4. **每个测试前清理** — `beforeEach` 中调用 `vi.clearAllMocks()`

---

## 相关文档

- [构建与开发](./Build-and-Development.md) — 开发环境搭建
- [API 参考](./API-Reference.md) — 被测试的 API
- [贡献指南](./Contributing.md) — 提交代码前的测试要求
