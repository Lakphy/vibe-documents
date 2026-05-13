import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../styles/main.css'), 'utf8');
const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const markdownPreviewSource = readFileSync(resolve(__dirname, '../MarkdownPreview.tsx'), 'utf8');
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
    expect(markdownPreviewSource).toContain('markdown-container-root markdown-edit-container');
    expect(markdownPreviewSource).toContain('markdown-section markdown-edit-section vd-typography');
    expect(markdownPreviewSource).not.toContain('max-w-[900px] mx-auto px-8 pb-16 vd-typography');
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
    expect(editableCodeBlockSource).not.toContain("document.createElement('textarea')");
    expect(editableCodeBlockSource).toContain("document.createElement('code')");
    expect(editableCodeBlockSource).toContain('data-markdown-code-content');
    expect(editableCodeBlockSource).toContain("container.setAttribute('contenteditable', 'false')");
    expect(editableCodeBlockSource).toContain("code.setAttribute('contenteditable', 'true')");
    expect(editableCodeBlockSource).toContain('code.tabIndex = 0');
    expect(editableCodeBlockSource).toContain('codePlugin.highlight');
    expect(css).toContain('.markdown-edit-code-block');
    expect(css).toContain('.markdown-edit-code-editor');
    expect(css).toContain('.markdown-edit-code-content');
    expect(css).not.toContain('.markdown-edit-code-textarea');
    expect(css).not.toMatch(/(^|\n)\s*color:\s*transparent\s*!important\s*;/);
    expect(css).not.toContain('-webkit-text-fill-color: transparent !important');
  });

  it('shares the Streamdown code highlighter between preview and edit mode', () => {
    expect(codeHighlighterSource).toContain('createCodePlugin');
    expect(codeHighlighterSource).toContain('CODE_HIGHLIGHT_THEMES');
    expect(markdownPreviewSource).toContain("import { codePlugin } from './codeHighlighter'");
    expect(markdownPreviewSource).toContain("mode === 'preview' || mode === 'wysiwyg'");
    expect(appSource).toContain("lazy(() => import('./MarkdownPreview')");
  });

  it('does not repaint WYSIWYG code highlighting for unchanged code blocks', () => {
    expect(editableCodeBlockSource).toContain('activeSnapshotKey');
    expect(editableCodeBlockSource).toContain('requestAnimationFrame');
    expect(editableCodeBlockSource).toContain('if (key === activeSnapshotKey) return');
    expect(editableCodeBlockSource).toContain('renderCode(code, snapshot.value');
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

  it('uses one pure code editor for special-language code blocks in edit mode', () => {
    expect(milkdownSource).toContain('return createEditableCodeBlockView()');
    expect(milkdownSource).not.toContain('createEditableMermaidBlockView');
    expect(milkdownSource).not.toContain('createExcalidrawNodeView');
    expect(milkdownSource).not.toContain('ExcalidrawEditMode');
    expect(editableCodeBlockSource).not.toContain('mermaidLib');
    expect(editableCodeBlockSource).not.toContain('mermaid-preview-surface');
    expect(css).not.toContain('markdown-edit-mermaid-preview-surface');
    expect(css).not.toContain('excalidraw-edit-container');
  });
});
