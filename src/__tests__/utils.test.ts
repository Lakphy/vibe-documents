import { describe, it, expect } from 'vitest';
import { getNonce, buildPreviewHtml, resolveImageSrc } from '../utils';

describe('getNonce', () => {
  it('生成 32 位字符串', () => {
    const nonce = getNonce();
    expect(nonce).toHaveLength(32);
  });

  it('仅包含字母和数字', () => {
    const nonce = getNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('每次调用生成不同的值', () => {
    const nonces = new Set(Array.from({ length: 100 }, () => getNonce()));
    expect(nonces.size).toBe(100);
  });
});

describe('buildPreviewHtml', () => {
  const defaultParams = {
    cspSource: 'https://csp-source',
    nonce: 'test-nonce-12345',
    scriptUri: 'https://webview/dist/webview.js',
    cssUri: 'https://webview/dist/webview.css',
  };

  it('生成有效的 HTML 文档', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('包含正确的 charset 和 viewport meta', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain('<meta charset="UTF-8">');
    expect(html).toContain('width=device-width, initial-scale=1.0');
  });

  it('在 CSP 中注入 cspSource', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain(`img-src ${defaultParams.cspSource}`);
    expect(html).toContain(`media-src ${defaultParams.cspSource}`);
    expect(html).toContain(`style-src ${defaultParams.cspSource}`);
    expect(html).toContain(`font-src ${defaultParams.cspSource}`);
  });

  it('在 CSP script-src 中包含 nonce', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain(`'nonce-${defaultParams.nonce}'`);
  });

  it('在 script 标签上设置 nonce 属性', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain(`nonce="${defaultParams.nonce}"`);
  });

  it('引用正确的 JS 和 CSS 资源', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain(`src="${defaultParams.scriptUri}"`);
    expect(html).toContain(`href="${defaultParams.cssUri}"`);
  });

  it('包含 React 挂载点 #root', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain('<div id="root"></div>');
  });

  it('CSP default-src 设为 none', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain("default-src 'none'");
  });

  it('CSP 允许 unsafe-eval 以支持 streamdown 动态加载', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain("'unsafe-eval'");
  });

  it('CSP 允许 data: 和 blob: 图片来源', () => {
    const html = buildPreviewHtml(defaultParams);
    expect(html).toContain('img-src');
    expect(html).toContain('data:');
    expect(html).toContain('blob:');
  });

  it('不同参数产生不同 HTML', () => {
    const html1 = buildPreviewHtml(defaultParams);
    const html2 = buildPreviewHtml({
      ...defaultParams,
      nonce: 'different-nonce-99999',
    });
    expect(html1).not.toEqual(html2);
  });
});

describe('resolveImageSrc', () => {
  const baseUri = 'https://webview/workspace';

  it('空 src 返回空字符串', () => {
    expect(resolveImageSrc('', baseUri)).toBe('');
  });

  it('http URL 原样返回', () => {
    const url = 'https://example.com/image.png';
    expect(resolveImageSrc(url, baseUri)).toBe(url);
  });

  it('http:// URL 也原样返回', () => {
    const url = 'http://example.com/image.png';
    expect(resolveImageSrc(url, baseUri)).toBe(url);
  });

  it('data: URI 原样返回', () => {
    const dataUri = 'data:image/png;base64,iVBOR...';
    expect(resolveImageSrc(dataUri, baseUri)).toBe(dataUri);
  });

  it('相对路径使用 baseUri 解析', () => {
    expect(resolveImageSrc('images/photo.png', baseUri))
      .toBe('https://webview/workspace/images/photo.png');
  });

  it('当前目录相对路径解析', () => {
    expect(resolveImageSrc('./screenshot.jpg', baseUri))
      .toBe('https://webview/workspace/./screenshot.jpg');
  });

  it('没有 baseUri 时相对路径原样返回', () => {
    expect(resolveImageSrc('images/photo.png', '')).toBe('images/photo.png');
  });
});
