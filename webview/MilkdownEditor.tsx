import { useEffect, useRef, useCallback } from 'react';
import { Editor, defaultValueCtx, rootCtx, editorViewCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { history } from '@milkdown/kit/plugin/history';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { indent } from '@milkdown/kit/plugin/indent';
import { trailing } from '@milkdown/kit/plugin/trailing';
import { replaceAll, getMarkdown } from '@milkdown/kit/utils';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { math, mathBlockSchema } from '@milkdown/plugin-math';
import { diagram, diagramSchema } from '@milkdown/plugin-diagram';

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

let _vscode: ReturnType<typeof acquireVsCodeApi> | undefined;
function getVsCode() {
  if (!_vscode) {
    _vscode = acquireVsCodeApi();
  }
  return _vscode;
}

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
          getVsCode().postMessage({ type: 'edit', content: markdown });
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(history)
      .use(clipboard)
      .use(indent)
      .use(trailing)
      .use(math)
      .use(diagram),
    [initialContent]
  );

  const [loading, getInstance] = useInstance();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'update' && msg.content !== undefined) {
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
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
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
