declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

let api: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVsCodeApi() {
  if (!api) {
    if (typeof acquireVsCodeApi === 'function') {
      api = acquireVsCodeApi();
    }
  }
  return api;
}
