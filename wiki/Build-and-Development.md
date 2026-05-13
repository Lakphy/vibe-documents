# 构建与开发

项目使用两条构建链路。`src/` 中的扩展宿主由 Webpack 打包为 CommonJS，`webview/` 中的 React 应用由 Vite 打包为浏览器资源。

## 脚本

| 命令 | 实际内容 | 说明 |
| --- | --- | --- |
| `npm run build` | `npm run build:ext && npm run build:webview` | 构建扩展宿主和 Webview |
| `npm run build:ext` | `webpack --mode production` | 只构建 `dist/extension.js` |
| `npm run build:webview` | `vite build --config vite.config.webview.ts && node scripts/strip-webview-sourcemaps.mjs` | 构建 Webview 并删除 Webview sourcemap |
| `npm run dev` | `npm run dev:ext & npm run dev:webview` | 同时启动两个 watch 命令 |
| `npm run dev:ext` | `webpack --mode development --watch` | watch 扩展宿主 |
| `npm run dev:webview` | `vite build --config vite.config.webview.ts --watch` | watch Webview |
| `npm run package` | `vsce package` | 打包 VSIX |
| `npm test` | `vitest run` | 一次性运行测试 |
| `npm run test:watch` | `vitest` | watch 测试 |
| `npm run test:coverage` | `vitest run --coverage` | 生成 V8 覆盖率 |
| `npm run perf:budget` | `node scripts/check-performance-budget.mjs` | 检查 Webview 主资源预算和 sourcemap 数量 |
| `npm run vscode:prepublish` | `npm run build` | 发布前构建 |

## Webpack

`webpack.config.js` 导出一个函数，返回只包含 extension 配置的数组。入口是 `./src/extension.ts`，输出是 `dist/extension.js`，目标环境是 Node.js，`vscode` 被声明为 external。

生产模式下 `devtool` 为 `false`。非生产模式下 `devtool` 为 `nosources-source-map`。

## Vite

`vite.config.webview.ts` 使用 `@vitejs/plugin-react` 和 `@tailwindcss/vite`。入口是 `webview/index.tsx`，输出目录是 `dist/webview-assets`，并启用 `emptyOutDir: true`。

固定输出规则：

| 资源 | 输出位置 |
| --- | --- |
| Webview 入口 JS | `dist/webview-assets/webview.js` |
| 入口 CSS 或 main CSS | `dist/webview-assets/webview.css` |
| lazy chunk JS | `dist/webview-assets/chunks/[name]-[hash].js` |
| lazy chunk CSS | `dist/webview-assets/chunks/[name]-[hash].css` |
| 字体 | `dist/webview-assets/fonts/[name][extname]` |
| 其他资源 | `dist/webview-assets/assets/[name]-[hash][extname]` |

当前配置使用 `sourcemap: false`、`minify: 'esbuild'`、`target: 'es2020'` 和 `cssMinify: 'esbuild'`。

## Sourcemap 清理

`scripts/strip-webview-sourcemaps.mjs` 会递归遍历 `dist/webview-assets` 并删除所有 `.map` 文件。当前 Vite 生产配置已经关闭 sourcemap，这个脚本仍作为防线保留在 `build:webview` 后半段。

## 性能预算

`scripts/check-performance-budget.mjs` 检查以下条件：

| 项 | 限制 |
| --- | --- |
| `webview.js` raw | 160 KiB |
| `webview.js` gzip | 60 KiB |
| `webview.css` raw | 110 KiB |
| `webview.css` gzip | 25 KiB |
| `dist/webview-assets/**/*.map` | 0 个 |

脚本会打印 `webview.js`、`webview.css` 的 raw/gzip 大小和 sourcemap 数量。超过预算时脚本抛错并以非零状态退出。

## TypeScript

`tsconfig.json` 使用 CommonJS module、ES2020 target、DOM lib、`jsx: "react-jsx"`、`strict: true`、`esModuleInterop: true`、`declaration: true`、`sourceMap: true` 和 Node module resolution。测试由 Vitest 处理，不需要单独的 TypeScript 测试构建命令。

## 开发流程

```bash
npm install
npm run dev
```

然后在 VS Code 中按 F5 启动扩展开发宿主。修改 `src/` 会触发 Webpack watch，修改 `webview/` 会触发 Vite watch。开发宿主需要重新加载窗口后才能使用新的构建产物。

## 打包

```bash
npm run build
npm run package
```

`.vscodeignore` 排除源码、测试、wiki、scripts、配置文件、source map 和 TypeScript 文件，并保留 `dist/extension.js` 与 `dist/webview-assets/**`。

## 常见问题

如果 Webview 空白，先确认 `dist/webview-assets/webview.js` 和 `dist/webview-assets/webview.css` 是否存在，再打开 `Developer: Open Webview Developer Tools` 查看控制台错误。若运行 `perf:budget` 失败，先执行 `npm run build` 生成最新 Webview 资源。
