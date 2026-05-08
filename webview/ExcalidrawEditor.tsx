import { useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useIsDark } from './ThemeContext';
import { getVsCodeApi } from './vscodeApi';

const ExcalidrawComponent = lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({ default: mod.Excalidraw }))
);

interface ExcalidrawEditorProps {
  content: string;
}

export function ExcalidrawEditor({ content }: ExcalidrawEditorProps) {
  const isDark = useIsDark();
  const onChangeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSentRef = useRef<string>(content);
  const externalVersionRef = useRef(0);

  useEffect(() => {
    if (content !== lastSentRef.current) {
      externalVersionRef.current += 1;
      lastSentRef.current = content;
    }
  }, [content]);

  const sceneData = useMemo(() => {
    if (!content) return { elements: [], appState: { viewBackgroundColor: 'transparent' }, files: {} };
    try {
      const parsed = JSON.parse(content);
      return {
        elements: parsed.elements || [],
        appState: {
          ...parsed.appState,
          viewBackgroundColor: 'transparent',
        },
        files: parsed.files || {},
      };
    } catch {
      return null;
    }
  }, [content]);

  const handleChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    if (onChangeTimerRef.current) {
      clearTimeout(onChangeTimerRef.current);
    }

    onChangeTimerRef.current = setTimeout(() => {
      const data = JSON.stringify(
        { type: 'excalidraw', version: 2, elements, appState: { viewBackgroundColor: 'transparent' }, files },
        null,
        2
      );
      if (data === lastSentRef.current) return;
      lastSentRef.current = data;
      getVsCodeApi()?.postMessage({ type: 'edit', content: data });
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (onChangeTimerRef.current) {
        clearTimeout(onChangeTimerRef.current);
      }
    };
  }, []);

  if (!content) {
    return (
      <div className="excalidraw-fullscreen-container">
        <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
          Waiting for content...
        </div>
      </div>
    );
  }

  if (sceneData === null) {
    return (
      <div className="excalidraw-fullscreen-container">
        <div className="flex items-center justify-center h-full" style={{ color: 'var(--vscode-errorForeground, #f44)' }}>
          Invalid Excalidraw JSON. Please fix the file content.
        </div>
      </div>
    );
  }

  return (
    <div className="excalidraw-fullscreen-container">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
          Loading Excalidraw...
        </div>
      }>
        <ExcalidrawComponent
          key={externalVersionRef.current}
          initialData={sceneData}
          viewModeEnabled={false}
          theme={isDark ? 'dark' : 'light'}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              toggleTheme: false,
            },
          }}
        />
      </Suspense>
    </div>
  );
}
