import { describe, it, expect } from 'vitest';
import { codePlugin } from '../codeHighlighter';

describe('codePlugin', () => {
  it('导出非空的 Streamdown 代码插件对象', () => {
    expect(codePlugin).toBeDefined();
    expect(codePlugin).not.toBeNull();
  });
});
