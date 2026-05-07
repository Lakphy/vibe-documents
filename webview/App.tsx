import { useState, useMemo, useEffect, useCallback } from 'react';
import { Streamdown } from 'streamdown';
import { mermaid } from '@streamdown/mermaid';
import { createCodePlugin } from '@streamdown/code';
import { math } from '@streamdown/math';
import { cjk } from '@streamdown/cjk';
import { useVsCodeMessages, useMarkdownComponents } from './hooks';
import { Toolbar, type EditorMode } from './Toolbar';
import { MilkdownEditor } from './MilkdownEditor';
import { SourceEditor } from './SourceEditor';

const codePlugin = createCodePlugin({
  themes: ['github-light', 'github-dark'],
});

export function App() {
  const { content, baseUri } = useVsCodeMessages();
  const [mode, setMode] = useState<EditorMode>('preview');
  const components = useMarkdownComponents(baseUri);

  const MODES: EditorMode[] = ['preview', 'wysiwyg', 'source'];
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'toggleMode') {
        setMode(prev => {
          const idx = MODES.indexOf(prev);
          return MODES[(idx + 1) % MODES.length];
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const plugins = useMemo(() => ({
    mermaid,
    code: codePlugin,
    math,
    cjk,
  }), []);

  if (!content && mode === 'preview') {
    return (
      <div className="markdown-section markdown-empty">
        <p style={{ opacity: 0.5 }}>Waiting for content...</p>
      </div>
    );
  }

  return (
    <div className="vd-app">
      <Toolbar mode={mode} onModeChange={setMode} />
      <div className="vd-content">
        {mode === 'preview' && (
          <div className="markdown-container-root">
            <div className="markdown-section">
              <Streamdown components={components} plugins={plugins}>
                {content}
              </Streamdown>
            </div>
          </div>
        )}
        {mode === 'wysiwyg' && (
          <div className="vd-milkdown-container">
            <MilkdownEditor content={content} />
          </div>
        )}
        {mode === 'source' && (
          <div className="vd-source-container">
            <SourceEditor content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
