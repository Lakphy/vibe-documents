import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? '';
          if (name.endsWith('.css')) {
            return 'webview.css';
          }
          if (/\.(woff2?|ttf|eot)$/.test(name)) {
            return 'fonts/[name][extname]';
          }
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
