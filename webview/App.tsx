import { lazy, Suspense, useDeferredValue } from 'react';
import { useVsCodeMessages } from './hooks';
import { useSaveShortcut } from './saveShortcut';

const MarkdownPreview = lazy(() => import('./MarkdownPreview').then(m => ({ default: m.MarkdownPreview })));
const ExcalidrawEditor = lazy(() => import('./ExcalidrawEditor').then(m => ({ default: m.ExcalidrawEditor })));
const CsvViewer = lazy(() => import('./CsvViewer').then(m => ({ default: m.CsvViewer })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--color-cursor-text-tertiary)' }}>
      Loading...
    </div>
  );
}

export function App() {
  const { content: rawContent, baseUri, fileType, hasReceivedUpdate } = useVsCodeMessages();
  const content = useDeferredValue(rawContent);
  useSaveShortcut();

  if (!hasReceivedUpdate) {
    return <LoadingFallback />;
  }

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

  return (
    <Suspense fallback={<LoadingFallback />}>
      <MarkdownPreview content={content} baseUri={baseUri} />
    </Suspense>
  );
}
