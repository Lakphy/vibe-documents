import { useState, useRef, useMemo, useDeferredValue, useEffect, lazy, Suspense } from 'react';
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
import { ExcalidrawRenderer } from './ExcalidrawBlock';
import { subscribe } from './messageBus';
import type { EditorView } from '@codemirror/view';
import { useSearch } from './search/useSearch';
import { SearchWidget } from './search/SearchWidget';

const MilkdownEditor = lazy(() => import('./MilkdownEditor').then(m => ({ default: m.MilkdownEditor })));
const SourceEditor = lazy(() => import('./SourceEditor').then(m => ({ default: m.SourceEditor })));
const ExcalidrawEditor = lazy(() => import('./ExcalidrawEditor').then(m => ({ default: m.ExcalidrawEditor })));
const CsvViewer = lazy(() => import('./CsvViewer').then(m => ({ default: m.CsvViewer })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
      Loading...
    </div>
  );
}

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
  const { content: rawContent, baseUri, fileType } = useVsCodeMessages();
  const content = useDeferredValue(rawContent);
  const [mode, setMode] = useState<EditorMode>('preview');
  const isDark = useVsCodeTheme();
  const components = useMarkdownComponents(baseUri);
  const visitedModes = useRef(new Set<EditorMode>(['preview']));
  const [, forceUpdate] = useState(0);

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const cmViewRef = useRef<EditorView | null>(null);
  const { state: searchState, actions: searchActions, searchInputRef } = useSearch(mode, contentContainerRef, cmViewRef);

  useEffect(() => {
    if (!visitedModes.current.has(mode)) {
      visitedModes.current.add(mode);
      forceUpdate(n => n + 1);
    }
  }, [mode]);

  const MODES: EditorMode[] = ['preview', 'wysiwyg', 'source'];
  useEffect(() => {
    return subscribe('toggleMode', () => {
      setMode(prev => {
        const idx = MODES.indexOf(prev);
        return MODES[(idx + 1) % MODES.length];
      });
    });
  }, []);

  // Cmd+F / Ctrl+F interception (CSV/Excalidraw 模式有自己的搜索处理)
  useEffect(() => {
    if (fileType === 'csv' || fileType === 'excalidraw') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        searchActions.open();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [searchActions, fileType]);

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

  if (fileType === 'excalidraw') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ExcalidrawEditor content={content} />
      </Suspense>
    );
  }

  if (fileType === 'csv') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <CsvViewer content={content} />
      </Suspense>
    );
  }

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
      <SearchWidget state={searchState} actions={searchActions} mode={mode} searchInputRef={searchInputRef} />
      <div className="flex-1" ref={contentContainerRef}>
        <div style={{ display: mode === 'preview' ? 'block' : 'none' }}>
          <div className="markdown-container-root">
            <div className="markdown-section vd-typography">
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
        </div>
        {visitedModes.current.has('wysiwyg') && (
          <div style={{ display: mode === 'wysiwyg' ? 'block' : 'none' }}>
            <Suspense fallback={<LoadingFallback />}>
              <div className="max-w-[900px] mx-auto px-8 pb-16 vd-typography">
                <MilkdownEditor content={content} />
              </div>
            </Suspense>
          </div>
        )}
        {visitedModes.current.has('source') && (
          <div style={{ display: mode === 'source' ? 'block' : 'none' }}>
            <Suspense fallback={<LoadingFallback />}>
              <div className="h-[calc(100vh-44px)]">
                <SourceEditor content={content} cmViewRef={cmViewRef} />
              </div>
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
