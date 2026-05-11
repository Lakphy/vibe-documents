import type { NodeViewConstructor } from '@milkdown/kit/prose/view';
import type { HighlightResult } from '@streamdown/code';
import mermaidLib from 'mermaid';
import { codePlugin } from './codeHighlighter';

type CodeHighlightLanguage = Parameters<typeof codePlugin.highlight>[0]['language'];
type HighlightToken = HighlightResult['tokens'][number][number];

let mermaidInitialized = false;
let mermaidIdCounter = 0;

function ensureMermaidInit(isDark: boolean) {
  mermaidLib.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    themeVariables: isDark ? {
      primaryColor: '#2d333b',
      primaryTextColor: '#e6edf3',
      primaryBorderColor: '#444c56',
      lineColor: '#768390',
      secondaryColor: '#1c2128',
      tertiaryColor: '#2d333b',
    } : undefined,
  });
  mermaidInitialized = true;
}

function applyHighlightTokenStyle(span: HTMLSpanElement, token: HighlightToken) {
  const htmlStyle = token.htmlStyle as Record<string, string> | undefined;
  if (htmlStyle) {
    Object.entries(htmlStyle).forEach(([key, value]) => {
      if (key === 'color') span.style.color = value;
      else span.style.setProperty(key, value);
    });
  }

  if ('color' in token && typeof token.color === 'string') {
    span.style.color = token.color;
  }
}

function appendHighlightedLine(parent: HTMLElement, tokens: HighlightToken[], fallbackText = '') {
  const line = document.createElement('span');
  line.className = 'markdown-edit-code-highlight-line';

  if (tokens.length === 0) {
    line.textContent = fallbackText;
  } else {
    tokens.forEach((token) => {
      const tokenSpan = document.createElement('span');
      tokenSpan.textContent = token.content;
      applyHighlightTokenStyle(tokenSpan, token);
      line.appendChild(tokenSpan);
    });
  }

  parent.appendChild(line);
}

function renderPlainCodeHighlight(code: HTMLElement, text: string) {
  code.replaceChildren();
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    appendHighlightedLine(code, [], line);
    if (index < lines.length - 1) code.appendChild(document.createTextNode('\n'));
  });
}

function renderCodeHighlight(code: HTMLElement, result: HighlightResult, fallbackText: string) {
  code.replaceChildren();
  const fallbackLines = fallbackText.split('\n');
  const lines = result.tokens.length > 0 ? result.tokens : fallbackLines.map(() => []);

  lines.forEach((lineTokens, index) => {
    appendHighlightedLine(code, lineTokens, fallbackLines[index] ?? '');
    if (index < lines.length - 1) code.appendChild(document.createTextNode('\n'));
  });
}

function makeSnapshotKey(text: string, language: string) {
  return `${language || 'text'}\u0000${text}`;
}

function getFrameScheduler() {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return {
      request: window.requestAnimationFrame.bind(window),
      cancel: window.cancelAnimationFrame.bind(window),
    };
  }

  return {
    request: (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16),
    cancel: (id: number) => window.clearTimeout(id),
  };
}

interface EditableCodeEditorOptions {
  language: string;
  text: string;
  onChange: (text: string) => void;
}

function createEditableCodeEditor({ language, text, onChange }: EditableCodeEditorOptions) {
  const root = document.createElement('pre');
  root.className = 'markdown-edit-code-editor';

  const highlightCode = document.createElement('code');
  highlightCode.className = 'markdown-edit-code-highlight-code shiki';
  highlightCode.setAttribute('aria-hidden', 'true');
  root.appendChild(highlightCode);

  const textarea = document.createElement('textarea');
  textarea.className = 'markdown-edit-code-textarea';
  textarea.setAttribute('data-markdown-code-content', 'true');
  textarea.setAttribute('aria-label', language ? `${language} code` : 'code');
  textarea.setAttribute('autocapitalize', 'off');
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('spellcheck', 'false');
  textarea.wrap = 'off';
  textarea.value = text;
  root.appendChild(textarea);

  const frame = getFrameScheduler();
  let frameId: number | undefined;
  let runId = 0;
  let activeSnapshotKey = '';
  let scheduledText = text;
  let scheduledLanguage = language || 'text';
  let destroyed = false;

  const syncHeight = () => {
    textarea.style.height = '0px';
    const height = Math.max(textarea.scrollHeight, 24);
    textarea.style.height = `${height}px`;
    root.style.minHeight = `${height}px`;
    highlightCode.style.minHeight = `${height}px`;
  };

  const syncScroll = () => {
    highlightCode.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
  };

  const renderHighlightResult = (key: string, run: number, result: HighlightResult, fallbackText: string) => {
    if (destroyed) return;
    if (run !== runId) return;
    if (key !== activeSnapshotKey) return;
    renderCodeHighlight(highlightCode, result, fallbackText);
    syncScroll();
  };

  const flushHighlight = () => {
    frameId = undefined;
    const nextText = scheduledText;
    const nextLanguage = scheduledLanguage || 'text';
    const key = makeSnapshotKey(nextText, nextLanguage);
    if (key === activeSnapshotKey) return;

    activeSnapshotKey = key;
    const run = ++runId;

    if (highlightCode.textContent !== nextText) {
      renderPlainCodeHighlight(highlightCode, nextText);
    }

    const result = codePlugin.highlight(
      {
        code: nextText,
        language: nextLanguage as CodeHighlightLanguage,
        themes: codePlugin.getThemes(),
      },
      (asyncResult) => {
        renderHighlightResult(key, run, asyncResult, nextText);
      }
    );

    if (result) {
      renderHighlightResult(key, run, result, nextText);
    }
  };

  const syncHighlight = (nextText: string, nextLanguage = 'text') => {
    if (destroyed) return;
    scheduledText = nextText;
    scheduledLanguage = nextLanguage || 'text';
    const key = makeSnapshotKey(scheduledText, scheduledLanguage);
    if (key === activeSnapshotKey) return;
    if (frameId !== undefined) return;
    frameId = frame.request(flushHighlight);
  };

  textarea.addEventListener('input', () => {
    syncHeight();
    syncHighlight(textarea.value, scheduledLanguage);
    onChange(textarea.value);
  });
  textarea.addEventListener('scroll', syncScroll);

  syncHeight();
  syncHighlight(textarea.value, language);

  return {
    root,
    textarea,
    highlightCode,
    setLanguage(nextLanguage: string) {
      const normalizedLanguage = nextLanguage || 'text';
      scheduledLanguage = normalizedLanguage;
      textarea.setAttribute('aria-label', nextLanguage ? `${nextLanguage} code` : 'code');
      syncHighlight(textarea.value, normalizedLanguage);
    },
    setText(nextText: string) {
      if (textarea.value === nextText) return;
      textarea.value = nextText;
      syncHeight();
      syncHighlight(nextText, scheduledLanguage);
    },
    destroy() {
      destroyed = true;
      runId += 1;
      if (frameId !== undefined) {
        frame.cancel(frameId);
        frameId = undefined;
      }
    },
  };
}

function replaceCodeBlockText(
  view: Parameters<NodeViewConstructor>[1],
  getPos: Parameters<NodeViewConstructor>[2],
  node: Parameters<NodeViewConstructor>[0],
  text: string
) {
  const pos = getPos();
  if (typeof pos !== 'number') return;
  if ((node.textContent || '') === text) return;

  const contentStart = pos + 1;
  const contentEnd = pos + node.nodeSize - 1;
  const content = text ? view.state.schema.text(text) : [];
  view.dispatch(view.state.tr.replaceWith(contentStart, contentEnd, content));
}

export function createEditableCodeBlockView(): NodeViewConstructor {
  return (node, view, getPos) => {
    let currentNode = node;
    let currentLanguage = typeof node.attrs.language === 'string' ? node.attrs.language : '';

    const container = document.createElement('div');
    container.className = 'my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2 markdown-edit-code-block';
    container.setAttribute('data-streamdown', 'code-block');
    container.setAttribute('contenteditable', 'false');

    const header = document.createElement('div');
    header.className = 'flex h-8 items-center text-muted-foreground text-xs markdown-edit-code-block-header';
    header.setAttribute('data-streamdown', 'code-block-header');

    const label = document.createElement('span');
    label.className = 'ml-1 font-mono lowercase markdown-edit-code-block-label';
    label.textContent = currentLanguage;
    header.appendChild(label);

    const body = document.createElement('div');
    body.className = 'overflow-x-auto rounded-md border border-border bg-background p-4 text-sm markdown-edit-code-block-body';
    body.setAttribute('data-streamdown', 'code-block-body');

    const editor = createEditableCodeEditor({
      language: currentLanguage,
      text: node.textContent || '',
      onChange: (text) => replaceCodeBlockText(view, getPos, currentNode, text),
    });

    body.appendChild(editor.root);
    container.appendChild(header);
    container.appendChild(body);

    const syncLanguage = (language: unknown) => {
      currentLanguage = typeof language === 'string' ? language : '';
      label.textContent = currentLanguage;
      container.setAttribute('data-language', currentLanguage);
      header.setAttribute('data-language', currentLanguage);
      body.setAttribute('data-language', currentLanguage);
      editor.root.setAttribute('data-language', currentLanguage);
      editor.setLanguage(currentLanguage);
    };

    syncLanguage(currentLanguage);

    return {
      dom: container,
      update(updatedNode) {
        if (updatedNode.type.name !== 'code_block') return false;
        const nextLanguage = updatedNode.attrs.language;
        if (nextLanguage === 'mermaid' || nextLanguage === 'excalidraw') return false;

        currentNode = updatedNode;
        syncLanguage(nextLanguage);
        editor.setText(updatedNode.textContent || '');
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

export function createEditableMermaidBlockView(): NodeViewConstructor {
  return (node, view, getPos) => {
    let currentNode = node;
    let renderTimer: ReturnType<typeof setTimeout> | undefined;
    let renderRun = 0;

    const container = document.createElement('div');
    container.className = 'mermaid-preview-block markdown-edit-mermaid-block';
    container.setAttribute('data-streamdown', 'mermaid-block');
    container.setAttribute('contenteditable', 'false');

    const header = document.createElement('div');
    header.className = 'mermaid-preview-header';
    const label = document.createElement('span');
    label.className = 'mermaid-preview-label';
    label.textContent = 'mermaid';
    header.appendChild(label);

    const editor = createEditableCodeEditor({
      language: 'mermaid',
      text: node.textContent || '',
      onChange: (text) => {
        replaceCodeBlockText(view, getPos, currentNode, text);
        renderPreview(text);
      },
    });
    editor.root.classList.add('mermaid-preview-source', 'markdown-edit-mermaid-source');

    const previewPane = document.createElement('div');
    previewPane.className = 'mermaid-preview-surface markdown-edit-mermaid-preview-surface';

    container.appendChild(header);
    container.appendChild(editor.root);
    container.appendChild(previewPane);

    function renderPreview(text: string) {
      if (renderTimer) clearTimeout(renderTimer);
      const run = ++renderRun;

      if (!text.trim()) {
        previewPane.innerHTML = '<div class="mermaid-preview-loading">Enter mermaid code...</div>';
        return;
      }

      renderTimer = setTimeout(async () => {
        const isDark = document.body.classList.contains('vscode-dark') ||
                       document.body.classList.contains('vscode-high-contrast');
        if (!mermaidInitialized) ensureMermaidInit(isDark);

        try {
          const id = `mermaid-ed-${++mermaidIdCounter}`;
          const { svg } = await mermaidLib.render(id, text);
          if (run === renderRun) previewPane.innerHTML = svg;
        } catch {
          if (run === renderRun) {
            previewPane.innerHTML = '<div class="mermaid-preview-error">Mermaid render error</div>';
          }
        }
      }, 600);
    }

    renderPreview(node.textContent || '');

    return {
      dom: container,
      update(updatedNode) {
        if (updatedNode.type.name !== 'code_block') return false;
        if (updatedNode.attrs.language !== 'mermaid') return false;

        currentNode = updatedNode;
        const nextText = updatedNode.textContent || '';
        editor.setText(nextText);
        renderPreview(nextText);
        return true;
      },
      stopEvent(event) {
        return editor.root.contains(event.target as Node);
      },
      ignoreMutation() {
        return true;
      },
      destroy() {
        if (renderTimer) clearTimeout(renderTimer);
        renderRun += 1;
        editor.destroy();
      },
    };
  };
}
