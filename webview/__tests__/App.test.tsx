import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { App } from '../App';

vi.mock('../MarkdownPreview', () => ({
  MarkdownPreview: ({ content, baseUri }: { content: string; baseUri: string }) => (
    <div data-testid="markdown-preview">{content}|{baseUri}</div>
  ),
}));

vi.mock('../CsvViewer', () => ({
  CsvViewer: ({ content }: { content: string }) => (
    <div data-testid="csv-viewer">{content}</div>
  ),
}));

vi.mock('../ExcalidrawEditor', () => ({
  ExcalidrawEditor: ({ content }: { content: string }) => (
    <div data-testid="excalidraw-editor">{content}</div>
  ),
}));

function dispatchUpdate(data: Record<string, unknown>) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'update', ...data },
    }));
  });
}

describe('App', () => {
  it('首次收到 update 前只显示加载态', () => {
    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-preview')).toBeNull();
  });

  it('收到 markdown update 后懒加载 MarkdownPreview', async () => {
    render(<App />);

    dispatchUpdate({ content: '# Hello', baseUri: 'vscode-resource:/docs', fileType: 'markdown' });

    expect(await screen.findByTestId('markdown-preview')).toHaveTextContent('# Hello|vscode-resource:/docs');
  });

  it('根据 csv fileType 路由到 CsvViewer', async () => {
    render(<App />);

    dispatchUpdate({ content: 'a,b\n1,2', fileType: 'csv' });

    expect(await screen.findByTestId('csv-viewer')).toHaveTextContent('a,b');
    expect(screen.queryByTestId('markdown-preview')).toBeNull();
  });

  it('根据 excalidraw fileType 路由到 ExcalidrawEditor', async () => {
    render(<App />);

    dispatchUpdate({ content: '{"type":"excalidraw"}', fileType: 'excalidraw' });

    expect(await screen.findByTestId('excalidraw-editor')).toHaveTextContent('excalidraw');
    expect(screen.queryByTestId('markdown-preview')).toBeNull();
  });
});
