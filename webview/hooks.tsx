import { useState, useEffect, useMemo } from 'react';
import { resolveImageSrc } from '../src/utils';
import { getVsCodeApi } from './vscodeApi';

export interface VsCodeMessage {
  type: string;
  content?: string;
  baseUri?: string;
}

export function useVsCodeMessages() {
  const [content, setContent] = useState('');
  const [baseUri, setBaseUri] = useState('');

  useEffect(() => {
    const handler = (event: MessageEvent<VsCodeMessage>) => {
      const msg = event.data;
      if (msg.type === 'update' && msg.content !== undefined) {
        setContent(msg.content);
        if (msg.baseUri) {
          setBaseUri(msg.baseUri);
        }
      }
    };
    window.addEventListener('message', handler);

    getVsCodeApi()?.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handler);
  }, []);

  return { content, baseUri };
}

export function useVsCodeTheme() {
  const [isDark, setIsDark] = useState(() => {
    return document.body.classList.contains('vscode-dark') ||
           document.body.classList.contains('vscode-high-contrast');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(
        document.body.classList.contains('vscode-dark') ||
        document.body.classList.contains('vscode-high-contrast')
      );
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function useMarkdownComponents(baseUri: string) {
  return useMemo(() => ({
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const src = resolveImageSrc(props.src || '', baseUri);
      const { src: _original, ...rest } = props;
      return <img {...rest} src={src} loading="lazy" />;
    },
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a
        {...props}
        className="markdown-link"
        target="_blank"
        rel="noopener noreferrer"
      />
    ),
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <div className="markdown-table-container">
        <div className="markdown-table-wrapper">
          <table className="markdown-table" {...props} />
        </div>
      </div>
    ),
  }), [baseUri]);
}
