# 构建与开发

> 本文档详细介绍项目的构建系统、开发流程和打包发布。

---

## 技术栈

| 工具 | 版本 | 用途 |
|------|------|------|
| TypeScript | ^5.7.0 | 类型安全的开发语言 |
| Webpack | ^5.97.0 | 模块打包器 |
| ts-loader | ^9.5.0 | TypeScript 编译加载器 |
| MiniCssExtractPlugin | ^2.9.0 | CSS 文件提取 |
| css-loader | ^7.1.0 | CSS 模块化处理 |
| vsce | — | VS Code 扩展打包工具 |

---

## NPM Scripts

| 命令 | 说明 |
|------|------|
| `npm run build` | 生产模式构建 |
| `npm run dev` | 开发模式（watch 监听） |
| `npm run package` | 打包为 `.vsix` 文件 |
| `npm test` | 运行全部测试 |
| `npm run test:watch` | 测试监听模式 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |
| `npm run vscode:prepublish` | 发布前构建（等同 `npm run build`） |

---

## Webpack 配置

项目使用 Webpack 多配置（Multi-compiler）模式，同时构建两个目标：

### Extension Host 配置

```javascript
const extensionConfig = {
  name: 'extension',
  target: 'node',                    // Node.js 运行时
  entry: './src/extension.ts',
  output: {
    filename: 'extension.js',
    libraryTarget: 'commonjs2',      // CommonJS 模块输出
  },
  externals: {
    vscode: 'commonjs vscode',       // vscode 模块由运行时提供
  },
  resolve: { extensions: ['.ts', '.js'] },
  module: {
    rules: [{ test: /\.ts$/, use: 'ts-loader' }],
  },
  devtool: 'nosources-source-map',   // 不包含源码的 source map
};
```

关键点：
- **target: 'node'** — Node.js 环境，支持 `require()`、`path` 等
- **externals.vscode** — `vscode` 模块不打包，由 VS Code 运行时注入
- **libraryTarget: 'commonjs2'** — 输出 `module.exports = ...` 格式

### Webview 配置

```javascript
const webviewConfig = {
  name: 'webview',
  target: 'web',                     // 浏览器运行时
  entry: './webview/index.tsx',
  output: {
    filename: 'webview.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.mjs'],
    conditionNames: ['import', 'module', 'browser', 'default'],
    mainFields: ['module', 'browser', 'main'],
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader' },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
      { test: /\.(woff|woff2|ttf|eot)$/, type: 'asset/resource' },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'webview.css' }),
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
  devtool: 'nosources-source-map',
};
```

关键点：
- **target: 'web'** — 浏览器环境
- **conditionNames / mainFields** — 优先使用 ESM / browser 版本的依赖包
- **LimitChunkCountPlugin: maxChunks: 1** — Webview 只允许加载一个 JS 文件，必须打包为单一 chunk
- **MiniCssExtractPlugin** — 将 CSS 提取为独立文件 `webview.css`
- **asset/resource** — 字体文件拷贝到 `dist/fonts/` 目录

---

## TypeScript 配置

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "moduleResolution": "node"
  },
  "exclude": [
    "node_modules", "dist",
    "vitest.config.ts",
    "**/__tests__/**", "**/*.test.ts", "**/*.test.tsx",
    "test/**"
  ]
}
```

关键点：
- **jsx: "react-jsx"** — 使用 React 17+ 的新 JSX 转换，无需显式 `import React`
- **declaration: true** — 生成 `.d.ts` 类型声明文件
- **exclude** — 排除测试文件和配置文件

---

## 构建产物

```
dist/
├── extension.js          # Extension Host 入口
├── extension.js.map      # Source map
├── webview.js            # Webview 前端 bundle
├── webview.js.map        # Source map
├── webview.css           # 提取的 CSS
├── webview.css.map       # CSS source map
├── webview.js.LICENSE.txt # 第三方许可证
└── fonts/                # 字体资源（如有）
```

---

## 开发流程

### 环境搭建

```bash
# 克隆项目
git clone <repository-url>
cd vibe-documents

# 安装依赖
npm install
```

### 日常开发

```bash
# 终端 1：启动开发模式（watch 监听文件变更，自动重新构建）
npm run dev

# 终端 2：VS Code 中按 F5 启动扩展开发宿主
# 或使用命令面板：Debug: Start Debugging
```

开发流程：
1. `npm run dev` 启动 Webpack watch 模式
2. 修改代码 → Webpack 自动重新构建
3. 在扩展开发宿主中按 `Ctrl+R`（Mac: `Cmd+R`）重新加载窗口
4. 打开 `.md` 文件，使用 `Cmd+Shift+V` 打开预览查看效果

### 运行测试

```bash
# 运行全部测试
npm test

# 监听模式（开发时推荐）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

---

## 打包发布

### 打包为 VSIX

```bash
# 确保已全局安装 vsce
npm install -g @vscode/vsce

# 构建并打包
npm run build
npm run package
# 生成 vibe-documents-0.0.1.vsix
```

### .vscodeignore

控制打包时排除的文件：

```
.vscode/**
node_modules/**
src/**
webview/**
test/**
webpack.config.js
tsconfig.json
*.map
dist/**/*.d.ts
dist/src/**
dist/webview/**
```

最终 VSIX 包仅包含：
- `dist/extension.js` — Extension Host 代码
- `dist/webview.js` — Webview bundle
- `dist/webview.css` — Webview 样式
- `dist/fonts/**` — 字体资源
- `package.json` — 扩展清单

### 发布到 Marketplace

```bash
# 登录发布者账号
vsce login <publisher>

# 发布
vsce publish
```

---

## 故障排查

### 构建失败

1. 确保 Node.js ≥ 18
2. 删除 `node_modules` 和 `dist`，重新安装：
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

### Webview 空白

1. 打开开发者工具（`Cmd+Shift+I` → Console 面板）检查错误
2. 确认 `dist/webview.js` 和 `dist/webview.css` 存在
3. 检查 CSP 是否拦截了资源加载

### Source Map

构建使用 `nosources-source-map`，生成不包含源码的 source map。适合发布环境，调试时可在 `webpack.config.js` 中改为 `source-map`。

---

## 相关文档

- [架构设计](./Architecture.md) — 双入口构建的架构背景
- [测试体系](./Testing.md) — 测试配置与运行
- [贡献指南](./Contributing.md) — 提交代码的流程
