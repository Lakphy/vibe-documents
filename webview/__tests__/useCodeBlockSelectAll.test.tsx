import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { useRef } from 'react';
import { useCodeBlockSelectAll } from '../useCodeBlockSelectAll';

function dispatchSelectAll(target: EventTarget = document, metaKey = true) {
  const event = new KeyboardEvent('keydown', {
    key: 'a',
    metaKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function SelectionHarness() {
  const containerRef = useRef<HTMLDivElement>(null);
  useCodeBlockSelectAll(containerRef, true);

  return (
    <div ref={containerRef}>
      <p>Before text</p>
      <pre data-testid="code-block">
        <code>{'const value = 1;\nconsole.log(value);'}</code>
      </pre>
      <pre className="mermaid-preview-source" data-testid="mermaid-source">
        <code>{'graph TD;\nA-->B;'}</code>
      </pre>
      <div contentEditable data-testid="editor">
        <p>Editable paragraph</p>
        <pre data-testid="editable-code-block">
          <code data-markdown-code-content="true">{'function run() {\n  return true;\n}'}</code>
        </pre>
        <pre data-testid="textarea-code-block">
          <textarea data-markdown-code-content="true" defaultValue={'const edit = true;\nconsole.log(edit);'} />
        </pre>
      </div>
      <input aria-label="search" defaultValue="select me" />
      <p>After text</p>
    </div>
  );
}

describe('useCodeBlockSelectAll', () => {
  afterEach(() => {
    cleanup();
    window.getSelection()?.removeAllRanges();
  });

  it('selects only the focused code block on the first Cmd+A', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const block = getByTestId('code-block');

    fireEvent.pointerDown(block.querySelector('code')!);
    const event = dispatchSelectAll();

    expect(event.defaultPrevented).toBe(true);
    expect(window.getSelection()?.toString()).toBe('const value = 1;\nconsole.log(value);');
  });

  it('selects the whole container on the second Cmd+A', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const block = getByTestId('code-block');

    fireEvent.pointerDown(block.querySelector('code')!);
    dispatchSelectAll();
    const secondEvent = dispatchSelectAll();

    expect(secondEvent.defaultPrevented).toBe(true);
    expect(window.getSelection()?.toString()).toContain('Before text');
    expect(window.getSelection()?.toString()).toContain('After text');
  });

  it('uses the same select-all behavior for Mermaid source blocks', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const source = getByTestId('mermaid-source');

    fireEvent.pointerDown(source.querySelector('code')!);
    const event = dispatchSelectAll();

    expect(event.defaultPrevented).toBe(true);
    expect(window.getSelection()?.toString()).toBe('graph TD;\nA-->B;');
  });

  it('does not intercept Cmd+A inside editable controls', () => {
    const { getByLabelText } = render(<SelectionHarness />);
    const input = getByLabelText('search');

    input.focus();
    const event = dispatchSelectAll(input);

    expect(event.defaultPrevented).toBe(false);
    expect(window.getSelection()?.toString()).toBe('');
  });

  it('selects editable code block contents on the first Cmd+A', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const block = getByTestId('editable-code-block');
    const code = block.querySelector('code')!;

    const range = document.createRange();
    range.setStart(code.firstChild!, 3);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    fireEvent.pointerDown(code);
    const event = dispatchSelectAll(getByTestId('editor'));

    expect(event.defaultPrevented).toBe(true);
    expect(window.getSelection()?.toString()).toBe('function run() {\n  return true;\n}');
  });

  it('selects textarea-backed editable code block contents on the first Cmd+A', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const block = getByTestId('textarea-code-block');
    const textarea = block.querySelector('textarea')!;

    textarea.focus();
    textarea.setSelectionRange(3, 3);
    fireEvent.pointerDown(textarea);
    const event = dispatchSelectAll(textarea);

    expect(event.defaultPrevented).toBe(true);
    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
  });

  it('selects the whole container on the second Cmd+A from a textarea-backed code block', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const block = getByTestId('textarea-code-block');
    const textarea = block.querySelector('textarea')!;

    textarea.focus();
    fireEvent.pointerDown(textarea);
    dispatchSelectAll(textarea);
    const secondEvent = dispatchSelectAll(textarea);

    expect(secondEvent.defaultPrevented).toBe(true);
    expect(window.getSelection()?.toString()).toContain('Before text');
    expect(window.getSelection()?.toString()).toContain('After text');
  });

  it('does not intercept Cmd+A in editable text outside code blocks', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const editor = getByTestId('editor');
    const paragraph = editor.querySelector('p')!;

    const range = document.createRange();
    range.setStart(paragraph.firstChild!, 3);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    fireEvent.pointerDown(paragraph);
    const event = dispatchSelectAll(editor);

    expect(event.defaultPrevented).toBe(false);
  });
});
