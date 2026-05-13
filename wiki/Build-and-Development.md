# 构建与开发

> Vibe Documents 采用**双工具链**：扩展宿主使用 Webpack 打包成 CommonJS，Webview 使用 Vite 打包为浏览器 ESM。

---

## 技术栈

| 工具 | 用途 |
|------|------|
| TypeScript ^5.7.0 | 类型安全的开发语言 |
| Webpack ^5.x + ts-loader | 仅用于打包扩展宿主（`src/`） |
| Vite ^8 + `@vitejs/plugin-react` | 仅用于打包 Webview（`webview/`） |
| Tailwind CSS v4 + `@tailwindcss/vite` | 设计令牌与原子类（在 Webview 内） |
| `@vscode/vsce` | 扩展打包与发布 |

> 历史上 Webview 曾使用 Webpack + MiniCssExtractPlugin 构建，现已完全迁移至 Vite。`webpack.config.js` 现在只导出 `[extensionConfig]` 单条目。

---

## NPM Scripts

| 命令 | 说明 |
|------|------|
| `npm run build` | 顺序执行 `build:ext` + `build:webview` |
| `npm run build:ext` | `webpack --mode production`（仅扩展） |
| `npm run build:webview` | `vite build --config vite.config.webview.ts` |
| `npm run dev` | 并行：`dev:ext`（webpack watch）+ `dev:webview`（vite watch） |
| `npm run dev:ext` | `webpack --mode development --watch` |
| `npm run dev:webview` | `vite build --config vite.config.webview.ts --watch` |
| `npm run package` | `vsce package`（产出 `.vsix`） |
| `npm test` | `vitest run`（一次性运行所有测试） |
| `npm run test:watch` | `vitest`（监听模式） |
| `npm run test:coverage` | `vitest run --coverage`（v8 覆盖率） |
| `npm run vscode:prepublish` | 触发 `npm run build`（VS Code Marketplace 发布前钩子） |

---

## Webpack 配置（仅扩展）

`webpack.config.js` 导出单条目 `[extensionConfig]`：

```javascript
const extensionConfig = {
  name: 'extension',
  target: 'node',                    // Node.js 运行时
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',      // CommonJS：module.exports = ...
  },
  externals: { vscode: 'commonjs vscode' },
  resolve: { extensions: ['.ts', '.js'] },
  module: { rules: [{ test: /\.ts$/, exclude: /node_modules/, use: 'ts-loader' }] },
  devtool: 'nosources-source-map',
};
module.exports = [extensionConfig];
```

关键点：
- `target: 'node'` — 支持 `require()`、`path` 等 Node API
- `externals.vscode` — VS Code 运行时注入，不打包
- `libraryTarget: 'commonjs2'` — VS Code Extension Host 加载格式

---

## Vite 配置（仅 Webview）

`vite.config.webview.ts`：

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist/webview-assets',
    emptyOutDir: true,
    rollupOptions: {
      input: 'webview/index.tsx',
      output: {
        entryFileNames: 'webview.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? '';
          if (name.endsWith('.css')) return 'webview.css';
          if (/\.(woff2?|ttf|eot)$/.test(name)) return 'fonts/[name][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: true,
  },
  resolve: {
    conditions: ['production', 'import', 'module', 'browser', 'default'],
  },
});
```

关键点：
- **入口** — `webview/index.tsx`
- **输出目录** — `dist/webview-assets/`（webviewHost.ts 中已配置为 `localResourceRoots` 之一）
- **入口文件名** — 固定 `webview.js`（`webviewHost.ts` 直接引用）
- **CSS 合并** — 所有样式合并为 `webview.css`
- **字体** — 放入 `fonts/` 子目录
- **chunk** — 懒加载组件（如 `ExcalidrawEditor` / `CsvViewer` / `MilkdownEditor`）拆分至 `chunks/[name]-[hash].js`
- **Tailwind v4** — 通过 `@tailwindcss/vite` 插件在构建时扫描

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
  }
}
```

- `jsx: "react-jsx"` — 自动 JSX 转换，无需 `import React`
- 测试文件由 `vitest.config.ts` 中的 `tsc` plugin 单独处理

---

## 构建产物

```
dist/
├── extension.js                  # Webpack: 扩展宿主入口
├── extension.js.map              # Source map
└── webview-assets/               # Vite 输出
    ├── webview.js                # Webview 主 bundle
    ├── webview.js.map
    ├── webview.css               # 合并后的全部样式
    ├── chunks/                   # 懒加载 chunk（Excalidraw/CSV/Milkdown 等）
    │   └── *-[hash].js
    ├── assets/                   # 其他静态资源（图片等）
    └── fonts/                    # KaTeX 字体等
```

---

## 开发流程

### 环境搭建

```bash
git clone <repository-url>
cd vibe-documents
npm install
```

### 日常开发

```bash
# 终端 1：启动两个 watch 进程（&）
npm run dev

# VS Code 中按 F5 启动扩展开发宿主
```

流程：

1. `npm run dev` 启动 webpack + vite 两个 watch 进程
2. 修改 `src/` → webpack 重新构建 `dist/extension.js`
3. 修改 `webview/` → vite 重新构建 `dist/webview-assets/*`
4. 在扩展开发宿主中 `Cmd/Ctrl+R` 重新加载窗口
5. 打开 `.md` / `.csv` / `.excalidraw` 文件 → 在 CodeLens / 标题栏 / 命令面板触发 Vibe Editor

### 运行测试

```bash
npm test
npm run test:watch
npm run test:coverage
```

---

## 打包发布

### 打包为 VSIX

```bash
npm install -g @vscode/vsce
npm run build
npm run package
# 生成 vibe-documents-0.2.2.vsix
```

### `.vscodeignore`

控制打包时排除的目录与文件（如 `src/`、`webview/`、`test/`、`*.config.*`、`*.map` 等），最终 VSIX 仅包含：

- `dist/extension.js`
- `dist/webview-assets/**`
- `package.json`

### 发布

```bash
vsce login <publisher>
vsce publish
```

---

## 故障排查

### 构建失败

1. 确保 Node.js ≥ 18
2. 删除 `node_modules` 和 `dist`，重新安装

### Webview 空白

1. 打开 Webview 开发者工具（命令面板：`Developer: Open Webview Developer Tools`）
2. 确认 `dist/webview-assets/webview.js` 和 `webview.css` 存在
3. 检查 CSP 是否拦截了某些资源

### Source Map

webpack 使用 `nosources-source-map`（不含源码），vite 启用 `sourcemap: true`（含源码，仅在开发场景下使用）。

---

## 相关文档

- [架构设计](./Architecture.md) — 双工具链的架构背景
- [测试体系](./Testing.md) — 测试配置与运行
- [贡献指南](./Contributing.md) — 提交代码的流程
