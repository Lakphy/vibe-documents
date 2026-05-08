import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'webview/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    css: false,
    alias: {
      vscode: new URL('./test/__mocks__/vscode.ts', import.meta.url).pathname,
    },
  },
});
