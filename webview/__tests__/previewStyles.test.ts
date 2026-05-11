import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/main.css'), 'utf8');

describe('markdown preview styles', () => {
  it('keeps blockquote text upright in Streamdown preview', () => {
    expect(css).toContain('[data-streamdown="blockquote"]');
    expect(css).toContain('font-style: normal !important');
  });

  it('pins code block action buttons to the header top edge', () => {
    expect(css).toContain('[data-streamdown="code-block-actions"]');
    expect(css).toContain('top: 0');
  });

  it('keeps regular code block body background aligned with Mermaid canvas', () => {
    expect(css).toContain('[data-streamdown="code-block"] [data-streamdown="code-block-body"]');
    expect(css).toContain('background: var(--color-vsc-bg) !important');
    expect(css).toContain('.mermaid-preview-surface');
    expect(css).toContain('background: var(--color-vsc-bg);');
  });

  it('keeps Mermaid source mode background aligned with regular code blocks', () => {
    const sourceBlock = css.match(/\.mermaid-preview-source\s*\{[^}]+\}/)?.[0] ?? '';

    expect(sourceBlock).toContain('background: var(--color-vsc-bg);');
  });

  it('draws readonly task checkboxes with a visible checked state', () => {
    expect(css).toContain('input[type="checkbox"][checked]');
    expect(css).toContain('appearance: none');
    expect(css).toContain('content: ""');
  });
});
