import { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { Streamdown } from 'streamdown';
import { math } from '@streamdown/math';
import { cjk } from '@streamdown/cjk';
import {
  Check, Copy, Download, ExternalLink,
  Loader2, Maximize2, RotateCcw, X,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import { useMarkdownComponents, useVsCodeTheme } from './hooks';
import { Toolbar, type EditorMode } from './Toolbar';
import { subscribe } from './messageBus';
import { useSearch } from './search/useSearch';
import { SearchWidget } from './search/SearchWidget';
import { CODE_HIGHLIGHT_THEMES } from './markdownPreviewConfig';
import { useCodeBlockSelectAll } from './useCodeBlockSelectAll';
import { codePlugin } from './codeHighlighter';
import type { CustomRendererProps } from 'streamdown';
import type { MermaidConfig } from 'mermaid';

const MilkdownEditor = lazy(() => import('./MilkdownEditor').then(m => ({ default: m.MilkdownEditor })));
const MermaidBlock = lazy(() => import('./MermaidBlock').then(m => ({ default: m.MermaidBlock })));
const ExcalidrawRenderer = lazy(() => import('./ExcalidrawBlock').then(m => ({ default: m.ExcalidrawRenderer })));

const MARKDOWN_MODES: EditorMode[] = ['preview', 'wysiwyg'];

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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
      Loading...
    </div>
  );
}

function DiagramFallback({ label }: { label: string }) {
  return (
    <div className="my-4 flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] p-4" style={{ background: 'var(--color-vsc-sidebar)' }}>
      <div className="flex h-8 items-center text-xs" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
        <span className="ml-1 font-mono lowercase">{label}</span>
      </div>
      <div className="flex items-center justify-center p-8" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
        Loading...
      </div>
    </div>
  );
}

interface LazyMermaidRendererProps extends CustomRendererProps {
  config?: MermaidConfig;
}

function LazyMermaidRenderer(props: LazyMermaidRendererProps) {
  return (
    <Suspense fallback={<DiagramFallback label="mermaid" />}>
      <MermaidBlock {...props} />
    </Suspense>
  );
}

function LazyExcalidrawRenderer(props: CustomRendererProps) {
  return (
    <Suspense fallback={<DiagramFallback label="excalidraw" />}>
      <ExcalidrawRenderer {...props} />
    </Suspense>
  );
}

interface MarkdownPreviewProps {
  content: string;
  baseUri: string;
}

export function MarkdownPreview({ content, baseUri }: MarkdownPreviewProps) {
  const [mode, setMode] = useState<EditorMode>('preview');
  const isDark = useVsCodeTheme();
  const components = useMarkdownComponents(baseUri);
  const visitedModes = useRef(new Set<EditorMode>(['preview']));
  const [, forceUpdate] = useState(0);

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const { state: searchState, actions: searchActions, searchInputRef } = useSearch(mode, contentContainerRef);
  useCodeBlockSelectAll(contentContainerRef, mode === 'preview' || mode === 'wysiwyg');

  useEffect(() => {
    if (!visitedModes.current.has(mode)) {
      visitedModes.current.add(mode);
      forceUpdate(n => n + 1);
    }
  }, [mode]);

  useEffect(() => {
    return subscribe('toggleMode', () => {
      setMode(prev => {
        const idx = MARKDOWN_MODES.indexOf(prev);
        return MARKDOWN_MODES[(idx + 1) % MARKDOWN_MODES.length];
      });
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        searchActions.open();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [searchActions]);

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
      return <LazyMermaidRenderer {...props} config={mermaidOptions.config} />;
    },
    [mermaidOptions.config],
  );

  const hasMath = useMemo(() => /(^|[^\\])(\$\$?[^$\n]|\$\$|\\\(|\\\[)/.test(content), [content]);
  const hasCjk = useMemo(() => /[\u3000-\u9fff\uff00-\uffef]/.test(content), [content]);

  const plugins = useMemo(() => ({
    code: codePlugin,
    ...(hasMath ? { math } : {}),
    ...(hasCjk ? { cjk } : {}),
    renderers: [
      {
        language: 'mermaid',
        component: MermaidRenderer,
      },
      {
        language: 'excalidraw',
        component: LazyExcalidrawRenderer,
      },
    ],
  }), [MermaidRenderer, hasMath, hasCjk]);

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
                icons={lucideIcons as any}
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
