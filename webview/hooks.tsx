import { useState, useEffect, useMemo } from 'react';
import { resolveImageSrc } from '../src/utils';
import { getVsCodeApi } from './vscodeApi';
import { subscribe } from './messageBus';
import { useIsDark } from './ThemeContext';

export type FileType = 'markdown' | 'excalidraw' | 'csv';

export interface VsCodeMessage {
  type: string;
  content?: string;
  baseUri?: string;
  fileType?: FileType;
}

export function useVsCodeMessages() {
  const [content, setContent] = useState('');
  const [baseUri, setBaseUri] = useState('');
  const [fileType, setFileType] = useState<FileType>('markdown');
  const [hasReceivedUpdate, setHasReceivedUpdate] = useState(false);

  useEffect(() => {
    const unsub = subscribe('update', (msg: VsCodeMessage) => {
      if (msg.content !== undefined) {
        setHasReceivedUpdate(true);
        setContent(msg.content);
        if (msg.baseUri) setBaseUri(msg.baseUri);
        if (msg.fileType) setFileType(msg.fileType);
      }
    });

    getVsCodeApi()?.postMessage({ type: 'ready' });

    return unsub;
  }, []);

  return { content, baseUri, fileType, hasReceivedUpdate };
}

export function useVsCodeTheme() {
  return useIsDark();
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
