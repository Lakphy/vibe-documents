import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MermaidBlock } from '../MermaidBlock';

const { renderMock, initializeMock, writeTextMock } = vi.hoisted(() => ({
  renderMock: vi.fn(),
  initializeMock: vi.fn(),
  writeTextMock: vi.fn(),
}));

vi.mock('mermaid', () => ({
  default: {
    initialize: initializeMock,
    render: renderMock,
  },
}));

describe('MermaidBlock', () => {
  beforeEach(() => {
    renderMock.mockReset();
    initializeMock.mockReset();
    renderMock.mockResolvedValue({
      svg: '<svg viewBox="0 0 120 80"><text>A</text></svg>',
    });
    window.open = vi.fn();
    writeTextMock.mockReset();
    writeTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });
  });

  it('renders preview first and can switch between preview and source', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    expect(screen.getByTitle('查看 Mermaid 源码')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    fireEvent.click(screen.getByTitle('查看 Mermaid 源码'));
    expect(screen.getByText('graph TD; A-->B')).toBeInTheDocument();
    expect(screen.getByTitle('查看 Mermaid 预览')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('查看 Mermaid 预览'));
    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview')).toBeInTheDocument();
    });
  });

  it('opens the rendered diagram fullscreen in the current page', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    fireEvent.click(within(screen.getByLabelText('Mermaid 视图控制')).getByTitle('全屏查看 Mermaid 图'));

    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Mermaid 全屏预览' })).toBeInTheDocument();
    expect(screen.getByTestId('mermaid-fullscreen-preview').querySelector('svg')).not.toBeNull();

    fireEvent.click(screen.getByTitle('关闭全屏预览'));
    expect(screen.queryByRole('dialog', { name: 'Mermaid 全屏预览' })).toBeNull();
  });

  it('copies Mermaid source from the preview action bar', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    fireEvent.click(within(screen.getByLabelText('Mermaid 视图控制')).getByTitle('复制 Mermaid 源码'));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('graph TD; A-->B');
    });
    expect(screen.getByTitle('已复制 Mermaid 源码')).toBeInTheDocument();
  });

  it('restores diagram zoom controls inside the preview surface', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    const content = screen.getByTestId('mermaid-pan-zoom-content');

    expect(screen.getByLabelText('Mermaid 缩放控制')).toBeInTheDocument();
    expect(screen.getByTitle('放大 Mermaid 图')).toBeInTheDocument();
    expect(screen.getByTitle('缩小 Mermaid 图')).toBeInTheDocument();
    expect(screen.getByTitle('重置 Mermaid 图视图')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('放大 Mermaid 图'));
    expect(content.getAttribute('style')).toContain('scale(1.2)');

    fireEvent.click(screen.getByTitle('重置 Mermaid 图视图'));
    expect(content.getAttribute('style')).toContain('translate(0px, 0px) scale(1)');
  });

  it('zooms the Mermaid diagram with the wheel over the preview surface', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    const surface = screen.getByTestId('mermaid-preview');
    fireEvent.wheel(surface, { deltaY: -100 });

    expect(screen.getByTestId('mermaid-pan-zoom-content').getAttribute('style')).toContain('scale(1.2)');
  });

  it('prevents Mermaid wheel gestures from scrolling parent containers', async () => {
    const parentWheel = vi.fn();
    render(
      <div onWheel={parentWheel}>
        <MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -100,
    });
    act(() => {
      screen.getByTestId('mermaid-preview').dispatchEvent(wheelEvent);
    });

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(parentWheel).not.toHaveBeenCalled();
    expect(screen.getByTestId('mermaid-pan-zoom-content').getAttribute('style')).toContain('scale(1.2)');
  });

  it('pans the Mermaid diagram with precision touchpad wheel gestures', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    fireEvent.wheel(screen.getByTestId('mermaid-preview'), { deltaMode: 0, deltaY: 16 });

    expect(screen.getByTestId('mermaid-pan-zoom-content').getAttribute('style')).toContain('translate(0px, -16px) scale(1)');
  });

  it('pans the Mermaid diagram by dragging the preview surface', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    const surface = screen.getByTestId('mermaid-preview');
    fireEvent.pointerDown(surface, { button: 0, clientX: 10, clientY: 12, pointerId: 1 });
    fireEvent.pointerMove(surface, { clientX: 38, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(surface, { pointerId: 1 });

    expect(screen.getByTestId('mermaid-pan-zoom-content').getAttribute('style')).toContain('translate(28px, 18px)');
  });

  it('keeps click-and-drag preview interactions separate from fullscreen', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-preview').querySelector('svg')).not.toBeNull();
    });

    fireEvent.click(screen.getByTestId('mermaid-preview'));

    expect(screen.queryByRole('dialog', { name: 'Mermaid 全屏预览' })).toBeNull();
  });

  it('uses the same action container marker as normal code blocks', async () => {
    render(<MermaidBlock code="graph TD; A-->B" config={{ theme: 'default' }} />);

    expect(document.querySelector('[data-streamdown="code-block-actions"]')).not.toBeNull();
    expect(screen.queryByTitle('在新标签页打开 Mermaid 图')).toBeNull();
  });
});
