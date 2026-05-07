import { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

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

interface SourceEditorProps {
  content: string;
}

export function SourceEditor({ content }: SourceEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternalUpdate = useRef(false);
  const lastSentContent = useRef(content);

  useEffect(() => {
    if (!containerRef.current) return;

    const theme = EditorView.theme({
      '&': {
        backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
        color: 'var(--vscode-editor-foreground, #cccccc)',
        fontSize: 'var(--vscode-editor-font-size, 13px)',
        fontFamily: 'var(--vscode-editor-font-family, monospace)',
        height: '100%',
      },
      '.cm-content': {
        caretColor: 'var(--vscode-editorCursor-foreground, #aeafad)',
        padding: '16px 0',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--vscode-editorGutter-background, transparent)',
        color: 'var(--vscode-editorLineNumber-foreground, #858585)',
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: 'var(--vscode-editorLineNumber-activeForeground, #c6c6c6)',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--vscode-editor-lineHighlightBackground, rgba(255,255,255,0.04))',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: 'var(--vscode-editor-selectionBackground, rgba(38, 79, 120, 0.6)) !important',
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--vscode-editorCursor-foreground, #aeafad)',
      },
      '.cm-scroller': {
        overflow: 'auto',
      },
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (isExternalUpdate.current) return;
      const newContent = update.state.doc.toString();
      if (newContent === lastSentContent.current) return;
      lastSentContent.current = newContent;
      getVsCode().postMessage({ type: 'edit', content: newContent });
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        theme,
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'update' && msg.content !== undefined) {
        const view = viewRef.current;
        if (!view) return;
        const currentContent = view.state.doc.toString();
        if (currentContent === msg.content) return;

        isExternalUpdate.current = true;
        lastSentContent.current = msg.content;
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: msg.content,
          },
        });
        isExternalUpdate.current = false;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="vd-source-editor"
    />
  );
}
