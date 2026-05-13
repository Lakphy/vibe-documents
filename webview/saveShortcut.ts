import { useEffect, useRef } from 'react';
import { getVsCodeApi } from './vscodeApi';

type SaveContentProvider = () => string | undefined;

const saveContentProviders = new Set<SaveContentProvider>();

function isSaveShortcut(event: KeyboardEvent) {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 's'
  );
}

function getCurrentContentForSave() {
  const providers = Array.from(saveContentProviders);
  for (let i = providers.length - 1; i >= 0; i -= 1) {
    const content = providers[i]();
    if (typeof content === 'string') return content;
  }
  return undefined;
}

export function useSaveShortcut() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isSaveShortcut(event)) return;

      event.preventDefault();
      event.stopPropagation();

      const content = getCurrentContentForSave();
      getVsCodeApi()?.postMessage(
        typeof content === 'string'
          ? { type: 'save', content }
          : { type: 'save' }
      );
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}

export function useSaveContentProvider(provider: SaveContentProvider) {
  const providerRef = useRef(provider);
  providerRef.current = provider;

  useEffect(() => {
    const wrappedProvider = () => providerRef.current();
    saveContentProviders.add(wrappedProvider);
    return () => {
      saveContentProviders.delete(wrappedProvider);
    };
  }, []);
}
