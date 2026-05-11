import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, Code2, Copy, Eye, Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import mermaidLib, { type MermaidConfig } from 'mermaid';
import type { CustomRendererProps } from 'streamdown';

interface MermaidBlockProps extends CustomRendererProps {
  config?: MermaidConfig;
}

type MermaidViewMode = 'preview' | 'source';
type MermaidTransform = {
  x: number;
  y: number;
  scale: number;
};
type MermaidDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};
interface MermaidInteractiveDiagramProps {
  className: string;
  testId: string;
  svg: string;
  transformStyle: CSSProperties;
  controls: ReactNode;
  onWheel: (event: WheelEvent) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<HTMLDivElement>, releasePointer?: boolean) => void;
}

let mermaidPreviewId = 0;
const MIN_MERMAID_SCALE = 0.25;
const MAX_MERMAID_SCALE = 4;
const MERMAID_ZOOM_STEP = 1.2;
const TOUCHPAD_PAN_DELTA_LIMIT = 40;
const DEFAULT_MERMAID_TRANSFORM: MermaidTransform = { x: 0, y: 0, scale: 1 };

function clampMermaidScale(scale: number) {
  return Math.min(MAX_MERMAID_SCALE, Math.max(MIN_MERMAID_SCALE, Number(scale.toFixed(3))));
}

function formatTransformNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  const didCopy = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!didCopy) throw new Error('Clipboard copy failed.');
}

function MermaidInteractiveDiagram({
  className,
  testId,
  svg,
  transformStyle,
  controls,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: MermaidInteractiveDiagramProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;

    surface.addEventListener('wheel', onWheel, { passive: false });
    return () => surface.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  return (
    <div
      ref={surfaceRef}
      className={className}
      data-testid={testId}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={(event) => onPointerEnd(event, false)}
    >
      <div
        className="mermaid-pan-zoom-content"
        data-testid="mermaid-pan-zoom-content"
        style={transformStyle}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {controls}
    </div>
  );
}

export function MermaidBlock({ code, config }: MermaidBlockProps) {
  const [viewMode, setViewMode] = useState<MermaidViewMode>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diagramTransform, setDiagramTransform] = useState<MermaidTransform>(DEFAULT_MERMAID_TRANSFORM);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const copiedTimer = useRef<number | undefined>(undefined);
  const dragState = useRef<MermaidDragState | null>(null);

  const normalizedCode = useMemo(() => code.trim(), [code]);
  const diagramTransformStyle = useMemo(
    () => ({
      transform: `translate(${formatTransformNumber(diagramTransform.x)}px, ${formatTransformNumber(diagramTransform.y)}px) scale(${formatTransformNumber(diagramTransform.scale)})`,
    }),
    [diagramTransform],
  );

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      if (!normalizedCode) {
        setSvg('');
        setError('');
        return;
      }

      try {
        setError('');
        mermaidLib.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          fontFamily: 'monospace',
          suppressErrorRendering: true,
          ...config,
        });
        const id = `vibe-mermaid-${++mermaidPreviewId}`;
        const result = await mermaidLib.render(id, normalizedCode);
        if (!cancelled) setSvg(result.svg);
      } catch (err) {
        if (!cancelled) {
          setSvg('');
          setError(err instanceof Error ? err.message : 'Unable to render Mermaid diagram.');
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [config, normalizedCode]);

  useEffect(() => {
    if (isFullscreen && !svg) setIsFullscreen(false);
  }, [isFullscreen, svg]);

  useEffect(() => {
    dragState.current = null;
    setDiagramTransform({ ...DEFAULT_MERMAID_TRANSFORM });
  }, [svg]);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const openFullscreen = () => {
    if (!svg) return;
    setIsFullscreen(true);
  };

  const copyMermaidCode = async () => {
    if (!code) return;
    try {
      await writeClipboardText(code);
      setCopied(true);
      if (copiedTimer.current !== undefined) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const zoomMermaidDiagram = useCallback((factor: number) => {
    setDiagramTransform((current) => ({
      ...current,
      scale: clampMermaidScale(current.scale * factor),
    }));
  }, []);

  const resetMermaidDiagram = () => {
    dragState.current = null;
    setDiagramTransform({ ...DEFAULT_MERMAID_TRANSFORM });
  };

  const handleDiagramWheel = useCallback((event: WheelEvent) => {
    if (!svg) return;
    event.preventDefault();
    event.stopPropagation();

    if ((event.target as HTMLElement | null)?.closest('.mermaid-pan-controls')) return;

    const shouldPan =
      !event.ctrlKey &&
      !event.metaKey &&
      event.deltaMode === 0 &&
      (event.deltaX !== 0 || Math.abs(event.deltaY) < TOUCHPAD_PAN_DELTA_LIMIT);

    if (shouldPan) {
      setDiagramTransform((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
      return;
    }

    zoomMermaidDiagram(event.deltaY <= 0 ? MERMAID_ZOOM_STEP : 1 / MERMAID_ZOOM_STEP);
  }, [svg, zoomMermaidDiagram]);

  const handleDiagramPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!svg || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;

    event.preventDefault();
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: diagramTransform.x,
      originY: diagramTransform.y,
    };
    event.currentTarget.classList.add('mermaid-pan-surface--panning');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDiagramPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    event.preventDefault();
    setDiagramTransform((current) => ({
      ...current,
      x: state.originX + event.clientX - state.startX,
      y: state.originY + event.clientY - state.startY,
    }));
  };

  const endDiagramPan = (event: ReactPointerEvent<HTMLDivElement>, releasePointer = true) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    dragState.current = null;
    event.currentTarget.classList.remove('mermaid-pan-surface--panning');
    if (releasePointer) {
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        // The pointer may already be released after browser-native cancellation.
      }
    }
  };

  const renderZoomControls = () => (
    <div
      className="mermaid-pan-controls"
      aria-label="Mermaid 缩放控制"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <button type="button" className="mermaid-pan-control" title="放大 Mermaid 图" onClick={() => zoomMermaidDiagram(MERMAID_ZOOM_STEP)}>
        <Plus size={14} />
      </button>
      <button type="button" className="mermaid-pan-control" title="缩小 Mermaid 图" onClick={() => zoomMermaidDiagram(1 / MERMAID_ZOOM_STEP)}>
        <Minus size={14} />
      </button>
      <button type="button" className="mermaid-pan-control" title="重置 Mermaid 图视图" onClick={resetMermaidDiagram}>
        <RotateCcw size={14} />
      </button>
    </div>
  );

  const renderInteractiveDiagram = (className: string, testId: string) => (
    <MermaidInteractiveDiagram
      className={className}
      testId={testId}
      svg={svg}
      transformStyle={diagramTransformStyle}
      controls={renderZoomControls()}
      onWheel={handleDiagramWheel}
      onPointerDown={handleDiagramPointerDown}
      onPointerMove={handleDiagramPointerMove}
      onPointerEnd={endDiagramPan}
    />
  );

  const renderPreviewBody = () => {
    if (error) return <div className="mermaid-preview-error">Mermaid render error</div>;
    if (!svg) return <div className="mermaid-preview-loading">Rendering...</div>;
    return renderInteractiveDiagram('mermaid-preview-surface', 'mermaid-preview');
  };

  return (
    <div className="mermaid-preview-block" data-streamdown="mermaid-block">
      <div className="mermaid-preview-header">
        <span className="mermaid-preview-label">mermaid</span>
      </div>
      <div className="mermaid-preview-actions-layer">
        <div className="mermaid-preview-actions" aria-label="Mermaid 视图控制" data-streamdown="code-block-actions">
          <button
            type="button"
            className={`mermaid-preview-action ${viewMode === 'preview' ? 'mermaid-preview-action--active' : ''}`}
            title="查看 Mermaid 预览"
            aria-pressed={viewMode === 'preview'}
            onClick={() => setViewMode('preview')}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className={`mermaid-preview-action ${viewMode === 'source' ? 'mermaid-preview-action--active' : ''}`}
            title="查看 Mermaid 源码"
            aria-pressed={viewMode === 'source'}
            onClick={() => setViewMode('source')}
          >
            <Code2 size={14} />
          </button>
          <button
            type="button"
            className="mermaid-preview-action"
            title={copied ? '已复制 Mermaid 源码' : '复制 Mermaid 源码'}
            disabled={!code}
            onClick={copyMermaidCode}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            type="button"
            className="mermaid-preview-action"
            title="全屏查看 Mermaid 图"
            disabled={!svg}
            onClick={openFullscreen}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {viewMode === 'preview' ? (
        renderPreviewBody()
      ) : (
        <pre className="mermaid-preview-source">
          <code>{code}</code>
        </pre>
      )}
      {isFullscreen && svg && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="mermaid-fullscreen-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Mermaid 全屏预览"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setIsFullscreen(false);
              }}
            >
              <div className="mermaid-fullscreen-toolbar">
                <span className="mermaid-preview-label">mermaid</span>
                <button
                  type="button"
                  className="mermaid-preview-action mermaid-fullscreen-close"
                  title="关闭全屏预览"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              {renderInteractiveDiagram('mermaid-fullscreen-surface', 'mermaid-fullscreen-preview')}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
