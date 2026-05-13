import type { NodeViewConstructor } from '@milkdown/kit/prose/view';
import type { HighlightResult } from '@streamdown/code';
import { codePlugin } from './codeHighlighter';

type CodeBlockNode = Parameters<NodeViewConstructor>[0];
type CodeBlockView = Parameters<NodeViewConstructor>[1];
type GetCodeBlockPos = Parameters<NodeViewConstructor>[2];
type CodeHighlightLanguage = Parameters<typeof codePlugin.highlight>[0]['language'];
type HighlightToken = HighlightResult['tokens'][number][number];
type FrameHandle = number | ReturnType<typeof globalThis.setTimeout>;

interface CodeEditorOptions {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

interface SelectionSnapshot {
  anchor: number;
  focus: number;
}

interface HighlightSnapshot {
  language: string;
  value: string;
}

function normalizeLanguage(language: unknown) {
  return typeof language === 'string' ? language.trim() : '';
}

function displayLanguage(language: string) {
  return language || 'text';
}

function highlightLanguage(language: string) {
  return (language || 'text') as CodeHighlightLanguage;
}

function createFrameScheduler() {
  const request =
    typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback: FrameRequestCallback) => globalThis.setTimeout(() => callback(Date.now()), 16);

  const cancel =
    typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
      ? (id: FrameHandle) => window.cancelAnimationFrame(id as number)
      : (id: FrameHandle) => globalThis.clearTimeout(id as ReturnType<typeof globalThis.setTimeout>);

  return { request, cancel };
}

function snapshotKey({ language, value }: HighlightSnapshot) {
  return `${displayLanguage(language)}\u0000${value}`;
}

function applyTokenStyle(span: HTMLSpanElement, token: HighlightToken) {
  const htmlStyle = token.htmlStyle as string | Record<string, string> | undefined;

  if (typeof htmlStyle === 'string') {
    span.style.cssText += htmlStyle;
  } else if (htmlStyle) {
    Object.entries(htmlStyle).forEach(([property, value]) => {
      if (property === 'color') span.style.color = value;
      else span.style.setProperty(property, value);
    });
  }

  if ('color' in token && typeof token.color === 'string') {
    span.style.color = token.color;
  }
}

function appendPlainText(parent: HTMLElement, text: string) {
  parent.appendChild(document.createTextNode(text));
}

function appendHighlightedLine(parent: HTMLElement, tokens: HighlightToken[] | undefined, fallback: string) {
  const line = document.createElement('span');
  line.className = 'markdown-edit-code-line';

  if (!tokens || tokens.length === 0) {
    appendPlainText(line, fallback);
    parent.appendChild(line);
    return;
  }

  tokens.forEach((token) => {
    const tokenSpan = document.createElement('span');
    tokenSpan.textContent = token.content;
    applyTokenStyle(tokenSpan, token);
    line.appendChild(tokenSpan);
  });

  parent.appendChild(line);
}

function renderCode(target: HTMLElement, value: string, result?: HighlightResult) {
  target.replaceChildren();

  const fallbackLines = value.split('\n');
  const lineCount = Math.max(fallbackLines.length, result?.tokens.length ?? 0, 1);

  for (let index = 0; index < lineCount; index += 1) {
    appendHighlightedLine(target, result?.tokens[index], fallbackLines[index] ?? '');
    if (index < lineCount - 1) appendPlainText(target, '\n');
  }
}

function readCodeValue(root: HTMLElement) {
  return root.textContent ?? '';
}

function offsetFromDomPosition(root: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

function getSelectionSnapshot(root: HTMLElement): SelectionSnapshot | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  if (!selection.anchorNode || !selection.focusNode) return null;
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;

  return {
    anchor: offsetFromDomPosition(root, selection.anchorNode, selection.anchorOffset),
    focus: offsetFromDomPosition(root, selection.focusNode, selection.focusOffset),
  };
}

function findTextPosition(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let lastText: Text | null = null;

  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    lastText = text;
    if (remaining <= text.data.length) {
      return { node: text, offset: remaining };
    }
    remaining -= text.data.length;
  }

  if (lastText) return { node: lastText, offset: lastText.data.length };

  const emptyText = document.createTextNode('');
  root.appendChild(emptyText);
  return { node: emptyText, offset: 0 };
}

function restoreSelection(root: HTMLElement, snapshot: SelectionSnapshot | null) {
  if (!snapshot) return;

  const selection = window.getSelection();
  if (!selection) return;

  const anchor = findTextPosition(root, snapshot.anchor);
  const focus = findTextPosition(root, snapshot.focus);

  selection.removeAllRanges();
  const range = document.createRange();
  range.setStart(anchor.node, anchor.offset);
  range.collapse(true);
  selection.addRange(range);

  if (typeof selection.extend === 'function') {
    selection.extend(focus.node, focus.offset);
    return;
  }

  range.setStart(
    snapshot.anchor <= snapshot.focus ? anchor.node : focus.node,
    snapshot.anchor <= snapshot.focus ? anchor.offset : focus.offset,
  );
  range.setEnd(
    snapshot.anchor <= snapshot.focus ? focus.node : anchor.node,
    snapshot.anchor <= snapshot.focus ? focus.offset : anchor.offset,
  );
  selection.removeAllRanges();
  selection.addRange(range);
}

function replaceRange(value: string, start: number, end: number, replacement: string) {
  return `${value.slice(0, start)}${replacement}${value.slice(end)}`;
}

function selectedLineRange(value: string, selection: SelectionSnapshot) {
  const start = Math.min(selection.anchor, selection.focus);
  const end = Math.max(selection.anchor, selection.focus);
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nextLineBreak = value.indexOf('\n', end);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  return { start, end, lineStart, lineEnd };
}

function replaceCodeBlockText(view: CodeBlockView, getPos: GetCodeBlockPos, value: string) {
  const pos = getPos();
  if (typeof pos !== 'number') return;

  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'code_block') return;
  if ((node.textContent || '') === value) return;

  const contentStart = pos + 1;
  const contentEnd = pos + node.nodeSize - 1;
  const replacement = value ? view.state.schema.text(value) : [];
  view.dispatch(view.state.tr.replaceWith(contentStart, contentEnd, replacement));
}

function createCodeEditor({ language, value, onChange }: CodeEditorOptions) {
  const root = document.createElement('pre');
  root.className = 'markdown-edit-code-editor';
  root.setAttribute('contenteditable', 'false');
  root.setAttribute('data-language', language);

  const code = document.createElement('code');
  code.className = 'markdown-edit-code-content shiki';
  code.setAttribute('contenteditable', 'true');
  code.setAttribute('data-markdown-code-content', 'true');
  code.setAttribute('role', 'textbox');
  code.setAttribute('aria-multiline', 'true');
  code.setAttribute('aria-label', `${displayLanguage(language)} code`);
  code.setAttribute('autocapitalize', 'off');
  code.setAttribute('autocomplete', 'off');
  code.setAttribute('autocorrect', 'off');
  code.setAttribute('spellcheck', 'false');
  code.tabIndex = 0;
  root.appendChild(code);

  const frame = createFrameScheduler();
  let currentValue = value;
  let currentLanguage = language;
  let frameId: FrameHandle | undefined;
  let runId = 0;
  let activeSnapshotKey = '';
  let composing = false;
  let disposed = false;
  let pendingHighlight: HighlightSnapshot = { language, value };

  const applyRenderedCode = (snapshot: HighlightSnapshot, result?: HighlightResult) => {
    const selection = getSelectionSnapshot(code);
    renderCode(code, snapshot.value, result);
    restoreSelection(code, selection);
  };

  const flushHighlight = () => {
    frameId = undefined;
    if (disposed || composing) return;

    const snapshot = { ...pendingHighlight };
    const key = snapshotKey(snapshot);
    if (key === activeSnapshotKey) return;

    activeSnapshotKey = key;
    const run = ++runId;
    applyRenderedCode(snapshot);

    const result = codePlugin.highlight(
      {
        code: snapshot.value,
        language: highlightLanguage(snapshot.language),
        themes: codePlugin.getThemes(),
      },
      (asyncResult) => {
        if (
          disposed ||
          composing ||
          run !== runId ||
          key !== activeSnapshotKey ||
          snapshot.value !== currentValue ||
          normalizeLanguage(snapshot.language) !== currentLanguage
        ) {
          return;
        }
        applyRenderedCode(snapshot, asyncResult);
      },
    );

    if (result) applyRenderedCode(snapshot, result);
  };

  const scheduleHighlight = (nextValue: string, nextLanguage = currentLanguage) => {
    pendingHighlight = { value: nextValue, language: nextLanguage };
    if (disposed || composing || frameId !== undefined) return;
    frameId = frame.request(flushHighlight);
  };

  const commitValue = (nextValue: string) => {
    if (nextValue === currentValue) {
      scheduleHighlight(nextValue);
      return;
    }

    currentValue = nextValue;
    scheduleHighlight(nextValue);
    onChange(nextValue);
  };

  const setEditorValue = (nextValue: string, selection: SelectionSnapshot | null = getSelectionSnapshot(code)) => {
    currentValue = nextValue;
    renderCode(code, nextValue);
    restoreSelection(code, selection);
    scheduleHighlight(nextValue);
  };

  const applyTextEdit = (replacement: string) => {
    const selection = getSelectionSnapshot(code) ?? { anchor: currentValue.length, focus: currentValue.length };
    const previousValue = currentValue;
    const start = Math.min(selection.anchor, selection.focus);
    const end = Math.max(selection.anchor, selection.focus);
    const nextValue = replaceRange(readCodeValue(code), start, end, replacement);
    const caret = start + replacement.length;
    setEditorValue(nextValue, { anchor: caret, focus: caret });
    if (nextValue !== previousValue) onChange(nextValue);
  };

  const indentSelection = (outdent: boolean) => {
    const selection = getSelectionSnapshot(code);
    if (!selection) return false;

    const valueBefore = readCodeValue(code);
    const { start, end, lineStart, lineEnd } = selectedLineRange(valueBefore, selection);
    const selectedLines = valueBefore.slice(lineStart, lineEnd);

    if (!outdent) {
      const indented = selectedLines.replace(/^/gm, '  ');
      const nextValue = replaceRange(valueBefore, lineStart, lineEnd, indented);
      const previousValue = currentValue;
      setEditorValue(nextValue, {
        anchor: selection.anchor + (selection.anchor === start ? 2 : indented.length - selectedLines.length),
        focus: selection.focus + (selection.focus === start ? 2 : indented.length - selectedLines.length),
      });
      if (nextValue !== previousValue) onChange(nextValue);
      return true;
    }

    let removedBeforeAnchor = 0;
    let removedBeforeFocus = 0;
    let totalRemoved = 0;
    const outdented = selectedLines.replace(/^( {1,2}|\t)/gm, (indent: string, _capture: string, offset: number) => {
      const removed = indent.length;
      totalRemoved += removed;
      if (lineStart + offset < selection.anchor) removedBeforeAnchor += removed;
      if (lineStart + offset < selection.focus) removedBeforeFocus += removed;
      return '';
    });

    if (outdented === selectedLines) return true;

    const nextValue = replaceRange(valueBefore, lineStart, lineEnd, outdented);
    const previousValue = currentValue;
    setEditorValue(nextValue, {
      anchor: Math.max(lineStart, selection.anchor - removedBeforeAnchor),
      focus: Math.max(lineStart, selection.focus - removedBeforeFocus),
    });
    if (nextValue !== previousValue) onChange(nextValue);
    return totalRemoved > 0;
  };

  code.addEventListener('input', () => {
    if (composing) return;
    commitValue(readCodeValue(code));
  });

  code.addEventListener('compositionstart', () => {
    composing = true;
  });

  code.addEventListener('compositionend', () => {
    composing = false;
    commitValue(readCodeValue(code));
  });

  code.addEventListener('beforeinput', (event) => {
    const input = event as InputEvent;
    if (input.inputType !== 'insertParagraph' && input.inputType !== 'insertLineBreak') return;
    event.preventDefault();
    applyTextEdit('\n');
  });

  code.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      indentSelection(event.shiftKey);
      return;
    }

    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      applyTextEdit('\n');
    }
  });

  code.addEventListener('paste', (event) => {
    event.preventDefault();
    applyTextEdit(event.clipboardData?.getData('text/plain') ?? '');
  });

  renderCode(code, value);
  scheduleHighlight(value, language);

  return {
    root,
    code,
    setLanguage(nextLanguage: string) {
      currentLanguage = normalizeLanguage(nextLanguage);
      root.setAttribute('data-language', currentLanguage);
      code.setAttribute('aria-label', `${displayLanguage(currentLanguage)} code`);
      scheduleHighlight(currentValue, currentLanguage);
    },
    setValue(nextValue: string) {
      if (nextValue === currentValue && readCodeValue(code) === nextValue) return;
      setEditorValue(nextValue);
    },
    destroy() {
      disposed = true;
      runId += 1;
      if (frameId !== undefined) {
        frame.cancel(frameId);
        frameId = undefined;
      }
    },
  };
}

export function createEditableCodeBlockView(): NodeViewConstructor {
  return (node, view, getPos) => {
    let language = normalizeLanguage(node.attrs.language);

    const container = document.createElement('div');
    container.className = 'my-4 flex w-full flex-col gap-2 rounded-lg border border-border bg-sidebar p-2 markdown-edit-code-block';
    container.setAttribute('contenteditable', 'false');
    container.setAttribute('data-streamdown', 'code-block');

    const header = document.createElement('div');
    header.className = 'flex h-8 items-center text-muted-foreground text-xs markdown-edit-code-block-header';
    header.setAttribute('contenteditable', 'false');
    header.setAttribute('data-streamdown', 'code-block-header');

    const label = document.createElement('span');
    label.className = 'ml-1 font-mono lowercase markdown-edit-code-block-label';
    header.appendChild(label);

    const body = document.createElement('div');
    body.className = 'overflow-x-auto rounded-md border border-border bg-background p-4 text-sm markdown-edit-code-block-body';
    body.setAttribute('data-streamdown', 'code-block-body');

    const editor = createCodeEditor({
      language,
      value: node.textContent || '',
      onChange: (nextValue) => replaceCodeBlockText(view, getPos, nextValue),
    });

    body.appendChild(editor.root);
    container.append(header, body);

    const syncLanguage = (nextLanguage: string) => {
      language = normalizeLanguage(nextLanguage);
      label.textContent = language;
      container.setAttribute('data-language', language);
      header.setAttribute('data-language', language);
      body.setAttribute('data-language', language);
      editor.setLanguage(language);
    };

    syncLanguage(language);

    return {
      dom: container,
      update(updatedNode: CodeBlockNode) {
        if (updatedNode.type.name !== 'code_block') return false;
        syncLanguage(normalizeLanguage(updatedNode.attrs.language));
        editor.setValue(updatedNode.textContent || '');
        return true;
      },
      stopEvent(event) {
        return editor.root.contains(event.target as Node);
      },
      ignoreMutation() {
        return true;
      },
      destroy() {
        editor.destroy();
      },
    };
  };
}
