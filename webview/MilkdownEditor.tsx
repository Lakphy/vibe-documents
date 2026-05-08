import { useEffect, useRef } from 'react';
import { Editor, defaultValueCtx, rootCtx } from '@milkdown/kit/core';
import { commonmark, codeBlockSchema } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { history } from '@milkdown/kit/plugin/history';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { indent } from '@milkdown/kit/plugin/indent';
import { trailing } from '@milkdown/kit/plugin/trailing';
import { replaceAll, getMarkdown } from '@milkdown/kit/utils';
import { $view } from '@milkdown/kit/utils';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import type { NodeViewConstructor } from '@milkdown/kit/prose/view';
import mermaidLib from 'mermaid';
import { createRoot } from 'react-dom/client';
import { getVsCodeApi } from './vscodeApi';
import { ExcalidrawEditMode } from './ExcalidrawBlock';
import { subscribe } from './messageBus';

let mermaidInitialized = false;
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

let mermaidIdCounter = 0;

function createMermaidNodeView(): NodeViewConstructor {
  return (node, view, getPos) => {
    const container = document.createElement('div');
    container.className = 'mermaid-split-container';

    const codePane = document.createElement('div');
    codePane.className = 'mermaid-code-pane';
    const labelLeft = document.createElement('div');
    labelLeft.className = 'mermaid-label';
    labelLeft.textContent = 'mermaid';
    codePane.appendChild(labelLeft);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.appendChild(code);
    codePane.appendChild(pre);

    const previewPane = document.createElement('div');
    previewPane.className = 'mermaid-preview-pane';

    container.appendChild(codePane);
    container.appendChild(previewPane);

    let renderTimer: ReturnType<typeof setTimeout>;
    const renderPreview = () => {
      clearTimeout(renderTimer);
      renderTimer = setTimeout(async () => {
        const text = code.textContent || '';
        if (!text.trim()) {
          previewPane.innerHTML = '<div class="mermaid-error">Enter mermaid code...</div>';
          return;
        }
        const isDark = document.body.classList.contains('vscode-dark') ||
                       document.body.classList.contains('vscode-high-contrast');
        if (!mermaidInitialized) ensureMermaidInit(isDark);
        try {
          const id = `mermaid-ed-${++mermaidIdCounter}`;
          const { svg } = await mermaidLib.render(id, text);
          previewPane.innerHTML = svg;
        } catch {
          previewPane.innerHTML = '<div class="mermaid-error">Syntax error</div>';
        }
      }, 600);
    };

    const observer = new MutationObserver(() => renderPreview());
    observer.observe(code, { characterData: true, childList: true, subtree: true });

    renderPreview();

    return {
      dom: container,
      contentDOM: code,
      update(updatedNode) {
        if (updatedNode.type.name !== 'code_block') return false;
        if (updatedNode.attrs.language !== 'mermaid') return false;
        return true;
      },
      destroy() {
        clearTimeout(renderTimer);
        observer.disconnect();
      },
    };
  };
}

function createExcalidrawNodeView(): NodeViewConstructor {
  return (node, view, getPos) => {
    const container = document.createElement('div');
    container.className = 'excalidraw-edit-container';
    container.setAttribute('contenteditable', 'false');

    const root = createRoot(container);
    const initialCode = node.textContent || '{}';

    root.render(
      <ExcalidrawEditMode
        initialCode={initialCode}
        onChange={(newCode: string) => {
          const pos = getPos();
          if (pos === undefined) return;
          const tr = view.state.tr;
          const nodeSize = node.nodeSize;
          const contentStart = pos + 1;
          const contentEnd = pos + nodeSize - 1;
          tr.replaceWith(contentStart, contentEnd, newCode ? view.state.schema.text(newCode) : []);
          view.dispatch(tr);
        }}
      />
    );

    return {
      dom: container,
      update(updatedNode) {
        if (updatedNode.type.name !== 'code_block') return false;
        if (updatedNode.attrs.language !== 'excalidraw') return false;
        return true;
      },
      stopEvent() { return true; },
      ignoreMutation() { return true; },
      destroy() { root.unmount(); },
    };
  };
}

function createDefaultCodeBlockView(): NodeViewConstructor {
  return (node) => {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    const lang = node.attrs.language;
    if (lang) pre.setAttribute('data-language', lang);
    pre.appendChild(code);
    return { dom: pre, contentDOM: code };
  };
}

const codeBlockNodeView = $view(codeBlockSchema.node, () => {
  return (node, view, getPos, decorations, innerDecorations) => {
    const lang = node.attrs.language;
    if (lang === 'mermaid') return createMermaidNodeView()(node, view, getPos, decorations, innerDecorations);
    if (lang === 'excalidraw') return createExcalidrawNodeView()(node, view, getPos, decorations, innerDecorations);
    return createDefaultCodeBlockView()(node, view, getPos, decorations, innerDecorations);
  };
});

interface MilkdownEditorInnerProps {
  initialContent: string;
}

function MilkdownEditorInner({ initialContent }: MilkdownEditorInnerProps) {
  const isExternalUpdate = useRef(false);
  const lastSentContent = useRef('');

  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialContent);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (isExternalUpdate.current) return;
          if (markdown === prevMarkdown) return;
          if (markdown === lastSentContent.current) return;
          lastSentContent.current = markdown;
          getVsCodeApi()?.postMessage({ type: 'edit', content: markdown });
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(history)
      .use(clipboard)
      .use(indent)
      .use(trailing)
      .use(codeBlockNodeView),
    [initialContent]
  );

  const [loading, getInstance] = useInstance();

  useEffect(() => {
    return subscribe('update', (msg) => {
      if (msg.content === undefined) return;
      if (loading) return;
      const editor = getInstance();
      if (!editor) return;

      try {
        const currentMarkdown = editor.action(getMarkdown());
        if (currentMarkdown === msg.content) return;
      } catch {
        // editor may not be ready
      }

      isExternalUpdate.current = true;
      lastSentContent.current = msg.content;
      try {
        editor.action(replaceAll(msg.content));
      } catch {
        // ignore errors during replacement
      }
      isExternalUpdate.current = false;
    });
  }, [loading, getInstance]);

  return <Milkdown />;
}

interface MilkdownEditorProps {
  content: string;
}

export function MilkdownEditor({ content }: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner initialContent={content} />
    </MilkdownProvider>
  );
}
