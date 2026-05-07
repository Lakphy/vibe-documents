import { useState, useMemo, useEffect } from 'react';
import { Streamdown } from 'streamdown';
import { mermaid } from '@streamdown/mermaid';
import { createCodePlugin } from '@streamdown/code';
import { math } from '@streamdown/math';
import { cjk } from '@streamdown/cjk';
import {
  Check, Copy, Download, ExternalLink,
  Loader2, Maximize2, RotateCcw, X,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import { useVsCodeMessages, useMarkdownComponents, useVsCodeTheme } from './hooks';
import { Toolbar, type EditorMode } from './Toolbar';
import { MilkdownEditor } from './MilkdownEditor';
import { SourceEditor } from './SourceEditor';
import { ExcalidrawRenderer } from './ExcalidrawBlock';

const codePlugin = createCodePlugin({
  themes: ['github-light', 'github-dark'],
});

const lucideIcons = {
  CheckIcon: Check,
  CopyIcon: Copy,
  DownloadIcon: Download,
  ExternalLinkIcon: ExternalLink,
  Loader2Icon: Loader2,
  Maximize2Icon: Maximize2,
  RotateCcwIcon: RotateCcw,
  XIcon: X,
  ZoomInIcon: ZoomIn,
  ZoomOutIcon: ZoomOut,
};

export function App() {
  const { content, baseUri } = useVsCodeMessages();
  const [mode, setMode] = useState<EditorMode>('preview');
  const isDark = useVsCodeTheme();
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

  const mermaidOptions = useMemo(() => ({
    config: {
      theme: isDark ? 'dark' as const : 'default' as const,
      themeVariables: isDark ? {
        primaryColor: '#2d333b',
        primaryTextColor: '#e6edf3',
        primaryBorderColor: '#444c56',
        lineColor: '#768390',
        secondaryColor: '#1c2128',
        tertiaryColor: '#2d333b',
        noteBkgColor: '#2d333b',
        noteTextColor: '#e6edf3',
        nodeBorder: '#444c56',
      } : undefined,
    },
  }), [isDark]);

  const plugins = useMemo(() => ({
    mermaid,
    code: codePlugin,
    math,
    cjk,
    renderers: [
      {
        language: 'excalidraw',
        component: ExcalidrawRenderer,
      },
    ],
  }), []);

  if (!content && mode === 'preview') {
    return (
      <div className="markdown-section markdown-empty">
        <p style={{ opacity: 0.5 }}>Waiting for content...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Toolbar mode={mode} onModeChange={setMode} />
      <div className="flex-1">
        {mode === 'preview' && (
          <div className="markdown-container-root">
            <div className="markdown-section">
              <Streamdown
                components={components}
                plugins={plugins}
                mermaid={mermaidOptions}
                icons={lucideIcons}
              >
                {content}
              </Streamdown>
            </div>
          </div>
        )}
        {mode === 'wysiwyg' && (
          <div className="max-w-[900px] mx-auto px-8 pb-16">
            <MilkdownEditor content={content} />
          </div>
        )}
        {mode === 'source' && (
          <div className="h-[calc(100vh-44px)]">
            <SourceEditor content={content} />
          </div>
        )}
      </div>
    </div>
  );
}
