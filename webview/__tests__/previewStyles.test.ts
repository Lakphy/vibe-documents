import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/main.css'), 'utf8');
const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const milkdownSource = readFileSync(resolve(__dirname, '../MilkdownEditor.tsx'), 'utf8');
const codeHighlighterSource = readFileSync(resolve(__dirname, '../codeHighlighter.ts'), 'utf8');
const editableCodeBlockSource = readFileSync(resolve(__dirname, '../editableCodeBlockNodeView.ts'), 'utf8');

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

  it('renders edit mode through the same markdown preview shell', () => {
    expect(appSource).toContain('markdown-container-root markdown-edit-container');
    expect(appSource).toContain('markdown-section markdown-edit-section vd-typography');
    expect(appSource).not.toContain('max-w-[900px] mx-auto px-8 pb-16 vd-typography');
  });

  it('maps WYSIWYG heading classes to Streamdown heading sizes', () => {
    expect(milkdownSource).toContain('STREAMDOWN_HEADING_CLASSES');
    expect(milkdownSource).toContain("1: 'mt-6 mb-2 font-semibold text-3xl'");
    expect(milkdownSource).toContain("2: 'mt-6 mb-2 font-semibold text-2xl'");
    expect(milkdownSource).toContain("'data-streamdown': `heading-${level}`");
  });

  it('maps common WYSIWYG markdown nodes to Streamdown attributes', () => {
    expect(milkdownSource).toContain("'data-streamdown': 'blockquote'");
    expect(milkdownSource).toContain("'data-streamdown': 'ordered-list'");
    expect(milkdownSource).toContain("'data-streamdown': 'unordered-list'");
    expect(milkdownSource).toContain("'data-streamdown': 'list-item'");
    expect(milkdownSource).toContain("'data-streamdown': 'horizontal-rule'");
    expect(milkdownSource).toContain("'data-streamdown': 'inline-code'");
    expect(css).toContain('space-y-4 whitespace-normal');
  });

  it('keeps WYSIWYG code blocks on Streamdown-shaped markup', () => {
    expect(editableCodeBlockSource).toContain("setAttribute('data-streamdown', 'code-block')");
    expect(editableCodeBlockSource).toContain("setAttribute('data-streamdown', 'code-block-header')");
    expect(editableCodeBlockSource).toContain("setAttribute('data-streamdown', 'code-block-body')");
    expect(milkdownSource).toContain('createEditableCodeBlockView');
    expect(editableCodeBlockSource).toContain("document.createElement('textarea')");
    expect(editableCodeBlockSource).toContain('data-markdown-code-content');
    expect(editableCodeBlockSource).toContain('codePlugin.highlight');
    expect(css).toContain('.markdown-edit-code-block');
    expect(css).toContain('.markdown-edit-code-editor');
    expect(css).toContain('.markdown-edit-code-textarea');
    expect(css).toContain('color: transparent !important');
  });

  it('shares the Streamdown code highlighter between preview and edit mode', () => {
    expect(codeHighlighterSource).toContain('createCodePlugin');
    expect(codeHighlighterSource).toContain('CODE_HIGHLIGHT_THEMES');
    expect(appSource).toContain("import { codePlugin } from './codeHighlighter'");
    expect(appSource).toContain("mode === 'preview' || mode === 'wysiwyg'");
  });

  it('does not repaint WYSIWYG code highlighting for unchanged code blocks', () => {
    expect(editableCodeBlockSource).toContain('activeSnapshotKey');
    expect(editableCodeBlockSource).toContain('requestAnimationFrame');
    expect(editableCodeBlockSource).toContain('if (key === activeSnapshotKey) return');
    expect(editableCodeBlockSource).toContain('if (highlightCode.textContent !== nextText)');
    expect(milkdownSource).not.toContain('contentDOM: code');
    expect(editableCodeBlockSource).not.toContain('MutationObserver');
  });

  it('keeps Milkdown mounted across content echoes from extension sync', () => {
    expect(milkdownSource).toContain('const initialContentRef = useRef(content)');
    expect(milkdownSource).toContain('initialContent={initialContentRef.current}');
    expect(milkdownSource).toContain('const lastSentContent = useRef(initialContent)');
  });

  it('keeps WYSIWYG tables on preview table containers', () => {
    expect(milkdownSource).toContain('markdown-table-container markdown-edit-table-container');
    expect(milkdownSource).toContain('markdown-table-wrapper');
    expect(milkdownSource).toContain('markdown-table');
    expect(milkdownSource).toContain("setAttribute('data-streamdown', 'table-header-cell')");
    expect(milkdownSource).toContain("setAttribute('data-streamdown', 'table-cell')");
    expect(css).toContain('.markdown-table td > p');
  });

  it('keeps WYSIWYG images on Streamdown image wrappers', () => {
    expect(milkdownSource).toContain('markdown-edit-image-wrapper');
    expect(milkdownSource).toContain("setAttribute('data-streamdown', 'image-wrapper')");
    expect(milkdownSource).toContain("setAttribute('data-streamdown', 'image')");
  });

  it('uses preview Mermaid block classes in edit mode', () => {
    expect(editableCodeBlockSource).toContain('mermaid-preview-block markdown-edit-mermaid-block');
    expect(editableCodeBlockSource).toContain("editor.root.classList.add('mermaid-preview-source', 'markdown-edit-mermaid-source')");
    expect(editableCodeBlockSource).toContain("language: 'mermaid'");
    expect(milkdownSource).not.toContain('mermaid-split-container');
  });
});
