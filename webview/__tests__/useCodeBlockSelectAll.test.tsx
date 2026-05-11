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

  it('lets the second Cmd+A fall through so the browser can select the whole page', () => {
    const { getByTestId } = render(<SelectionHarness />);
    const block = getByTestId('code-block');

    fireEvent.pointerDown(block.querySelector('code')!);
    dispatchSelectAll();
    const secondEvent = dispatchSelectAll();

    expect(secondEvent.defaultPrevented).toBe(false);
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
});
