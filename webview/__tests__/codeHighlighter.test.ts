import { describe, it, expect, vi } from 'vitest';
import { codePlugin, createCodePlugin } from '../codeHighlighter';

describe('codePlugin', () => {
  it('导出非空的 Streamdown 代码插件对象', () => {
    expect(codePlugin).toBeDefined();
    expect(codePlugin).not.toBeNull();
  });

  it('声明内置语言和常用别名支持', () => {
    const languages = codePlugin.getSupportedLanguages?.() ?? [];

    expect(languages).toContain('typescript');
    expect(languages).toContain('shellscript');
    expect(languages).toContain('ts');
    expect(languages).toContain('bash');
    expect(codePlugin.supportsLanguage?.(' TS ')).toBe(true);
    expect(codePlugin.supportsLanguage?.('bash')).toBe(true);
    expect(codePlugin.supportsLanguage?.('text')).toBe(false);
    expect(codePlugin.supportsLanguage?.('unknown-language')).toBe(false);
  });

  it('对纯文本和未知语言同步返回 plaintext tokens', () => {
    const callback = vi.fn();
    const textResult = codePlugin.highlight(
      {
        code: 'first\n\nsecond',
        language: 'text',
        themes: ['vitesse-light', 'vitesse-dark'],
      },
      callback,
    );
    const unknownResult = codePlugin.highlight(
      {
        code: 'raw value',
        language: 'not-real',
        themes: ['vitesse-light', 'vitesse-dark'],
      },
      callback,
    );

    expect(textResult).toEqual({
      tokens: [
        [{ content: 'first', offset: 0 }],
        [],
        [{ content: 'second', offset: 7 }],
      ],
      themeName: 'plain',
      rootStyle: false,
    });
    expect(unknownResult?.themeName).toBe('plain');
    expect(callback).not.toHaveBeenCalled();
  });

  it('异步加载 Shiki 后回调并缓存结果', async () => {
    const callback = vi.fn();
    const input = {
      code: 'const answer = 42;',
      language: 'js',
      themes: ['vitesse-light', 'vitesse-dark'],
    };

    const initial = codePlugin.highlight(input, callback);

    expect(initial).toBeNull();
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 10_000 });

    const result = callback.mock.calls[0][0];
    expect(result.tokens[0].length).toBeGreaterThan(0);

    const cachedCallback = vi.fn();
    const cached = codePlugin.highlight(input, cachedCallback);
    expect(cached).toBe(result);
    expect(cachedCallback).not.toHaveBeenCalled();
  });

  it('同一个异步高亮请求会通知所有等待中的回调', async () => {
    const plugin = createCodePlugin({ themes: ['vitesse-light', 'vitesse-dark'] });
    const first = vi.fn();
    const second = vi.fn();
    const input = {
      code: 'type Point = { x: number; y: number }',
      language: 'typescript',
      themes: [{ name: 'vitesse-light' }, { name: 'vitesse-dark' }],
    };

    expect(plugin.highlight(input, first)).toBeNull();
    expect(plugin.highlight(input, second)).toBeNull();

    await vi.waitFor(() => {
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    }, { timeout: 10_000 });
    expect(second.mock.calls[0][0]).toBe(first.mock.calls[0][0]);
  });

  it('可以按需加载所有内置语言 loader', async () => {
    const plugin = createCodePlugin({ themes: ['vitesse-light', 'vitesse-dark'] });
    const languages = [
      'c',
      'cpp',
      'csharp',
      'css',
      'diff',
      'dockerfile',
      'go',
      'html',
      'java',
      'javascript',
      'json',
      'jsonc',
      'jsx',
      'markdown',
      'php',
      'python',
      'ruby',
      'rust',
      'shellscript',
      'sql',
      'tsx',
      'typescript',
      'vue',
      'xml',
      'yaml',
    ];

    for (const language of languages) {
      const callback = vi.fn();
      const result = plugin.highlight(
        {
          code: `sample ${language}`,
          language,
          themes: ['vitesse-light', 'vitesse-dark'],
        },
        callback,
      );

      expect(result).toBeNull();
      await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 10_000 });
      expect(callback.mock.calls[0][0].tokens.length).toBeGreaterThan(0);
    }
  }, 30_000);

  it('高亮器加载失败时回退到 plaintext 结果', async () => {
    vi.resetModules();
    vi.doMock('@shikijs/langs/c', () => {
      throw new Error('language load failed');
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { createCodePlugin: createFreshCodePlugin } = await import('../codeHighlighter');
    const plugin = createFreshCodePlugin({ themes: ['vitesse-light', 'vitesse-dark'] });
    const callback = vi.fn();

    expect(plugin.highlight(
      {
        code: 'int main(void) { return 0; }',
        language: 'c',
        themes: ['vitesse-light', 'vitesse-dark'],
      },
      callback,
    )).toBeNull();

    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 10_000 });
    expect(callback.mock.calls[0][0].themeName).toBe('plain');
    expect(errorSpy).toHaveBeenCalledWith(
      '[Vibe Documents] Failed to highlight code:',
      expect.any(Error),
    );

    errorSpy.mockRestore();
    vi.doUnmock('@shikijs/langs/c');
  });
});
