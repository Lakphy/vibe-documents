import { useMemo, lazy, Suspense } from 'react';
import { useIsDark } from './ThemeContext';
import '@excalidraw/excalidraw/index.css';

const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({ default: mod.Excalidraw }))
);

interface ExcalidrawRendererProps {
  code: string;
  isIncomplete: boolean;
  language: string;
  meta?: string;
}

/** 预览模式：只读 Excalidraw 渲染（用于 Streamdown） */
export function ExcalidrawRenderer({ code, isIncomplete }: ExcalidrawRendererProps) {
  const isDark = useIsDark();

  const { sceneData, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(code);
      return {
        sceneData: {
          elements: parsed.elements || [],
          appState: {
            ...parsed.appState,
            viewBackgroundColor: 'transparent',
          },
          files: parsed.files || {},
        },
        error: null,
      };
    } catch {
      return { sceneData: null, error: 'Invalid Excalidraw JSON' };
    }
  }, [code]);

  if (isIncomplete) {
    return (
      <div className="my-4 flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] p-4" style={{ background: 'var(--color-vsc-sidebar)' }}>
        <div className="flex h-8 items-center text-xs" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
          <span className="ml-1 font-mono lowercase">excalidraw</span>
        </div>
        <div className="flex items-center justify-center p-8" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !sceneData) {
    return (
      <div className="my-4 flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] p-4" style={{ background: 'var(--color-vsc-sidebar)' }}>
        <div className="flex h-8 items-center text-xs" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
          <span className="ml-1 font-mono lowercase">excalidraw</span>
        </div>
        <div className="rounded-md p-4 text-sm" style={{ color: '#f14c4c', background: 'rgba(241,76,76,0.1)' }}>
          {error || 'Failed to parse Excalidraw data'}
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-vsc-sidebar)' }}>
      <div className="flex h-8 items-center px-3 text-xs" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
        <span className="font-mono lowercase">excalidraw</span>
      </div>
      <div className="rounded-md border border-[var(--color-border)] mx-2 mb-2 overflow-hidden" style={{ background: 'var(--color-vsc-bg)', height: '400px' }}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
            Loading Excalidraw...
          </div>
        }>
          <ExcalidrawComponent
            initialData={sceneData}
            viewModeEnabled={true}
            theme={isDark ? 'dark' : 'light'}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas: false,
                export: false,
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
              },
              tools: { image: false },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

export function ExcalidrawBlock({ data }: { data: string }) {
  return <ExcalidrawRenderer code={data} isIncomplete={false} language="excalidraw" />;
}
