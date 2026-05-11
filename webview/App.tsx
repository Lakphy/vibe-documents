import { useState, useRef, useMemo, useDeferredValue, useEffect, lazy, Suspense } from 'react';
import { Streamdown } from 'streamdown';
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
import { useSearch } from './search/useSearch';
import { SearchWidget } from './search/SearchWidget';
import { MermaidBlock } from './MermaidBlock';
import { CODE_HIGHLIGHT_THEMES } from './markdownPreviewConfig';
import { useCodeBlockSelectAll } from './useCodeBlockSelectAll';
import { codePlugin } from './codeHighlighter';
import type { CustomRendererProps } from 'streamdown';

const MilkdownEditor = lazy(() => import('./MilkdownEditor').then(m => ({ default: m.MilkdownEditor })));
const ExcalidrawEditor = lazy(() => import('./ExcalidrawEditor').then(m => ({ default: m.ExcalidrawEditor })));
const CsvViewer = lazy(() => import('./CsvViewer').then(m => ({ default: m.CsvViewer })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
      Loading...
    </div>
  );
}

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
  const { state: searchState, actions: searchActions, searchInputRef } = useSearch(mode, contentContainerRef);
  useCodeBlockSelectAll(contentContainerRef, fileType === 'markdown' && (mode === 'preview' || mode === 'wysiwyg'));

  useEffect(() => {
    if (!visitedModes.current.has(mode)) {
      visitedModes.current.add(mode);
      forceUpdate(n => n + 1);
    }
  }, [mode]);

  const MODES: EditorMode[] = ['preview', 'wysiwyg'];
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

  const MermaidRenderer = useMemo(
    () => function MermaidRenderer(props: CustomRendererProps) {
      return <MermaidBlock {...props} config={mermaidOptions.config} />;
    },
    [mermaidOptions.config],
  );

  const plugins = useMemo(() => ({
    code: codePlugin,
    math,
    cjk,
    renderers: [
      {
        language: 'mermaid',
        component: MermaidRenderer,
      },
      {
        language: 'excalidraw',
        component: ExcalidrawRenderer,
      },
    ],
  }), [MermaidRenderer]);

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
      <SearchWidget state={searchState} actions={searchActions} searchInputRef={searchInputRef} />
      <div className="flex-1" ref={contentContainerRef}>
        <div style={{ display: mode === 'preview' ? 'block' : 'none' }}>
          <div className="markdown-container-root">
            <div className="markdown-section vd-typography">
              <Streamdown
                components={components}
                plugins={plugins}
                mermaid={mermaidOptions}
                shikiTheme={CODE_HIGHLIGHT_THEMES}
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
              <div className="markdown-container-root markdown-edit-container">
                <div className="markdown-section markdown-edit-section vd-typography">
                  <MilkdownEditor content={content} baseUri={baseUri} />
                </div>
              </div>
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
