export interface WebviewMessageMap {
  update: { type: 'update'; content?: string; baseUri?: string; fileType?: string };
  toggleMode: { type: 'toggleMode' };
  [key: string]: { type: string; [k: string]: unknown };
}

type MessageHandler<T = { type: string; [k: string]: unknown }> = (data: T) => void;

const listeners = new Map<string, Set<MessageHandler<any>>>();
let initialized = false;

function handleRawMessage(event: MessageEvent) {
  const msg = event.data;
  if (!msg || typeof msg.type !== 'string') return;
  const handlers = listeners.get(msg.type);
  if (handlers) {
    for (const handler of handlers) {
      handler(msg);
    }
  }
}

function ensureInit() {
  if (initialized) return;
  initialized = true;
  window.addEventListener('message', handleRawMessage);
}

export function subscribe<K extends keyof WebviewMessageMap>(
  type: K,
  handler: MessageHandler<WebviewMessageMap[K]>
): () => void;
export function subscribe(type: string, handler: MessageHandler): () => void;
export function subscribe(type: string, handler: MessageHandler<any>): () => void {
  ensureInit();
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  set.add(handler);
  return () => {
    set!.delete(handler);
    if (set!.size === 0) {
      listeners.delete(type);
    }
  };
}
