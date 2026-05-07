const NONCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const NONCE_LENGTH = 32;

export function getNonce(): string {
  let text = '';
  for (let i = 0; i < NONCE_LENGTH; i++) {
    text += NONCE_CHARS.charAt(Math.floor(Math.random() * NONCE_CHARS.length));
  }
  return text;
}

export interface HtmlTemplateParams {
  cspSource: string;
  nonce: string;
  scriptUri: string;
  cssUri: string;
}

export function buildPreviewHtml(params: HtmlTemplateParams): string {
  const { cspSource, nonce, scriptUri, cssUri } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    img-src ${cspSource} https: data: blob:;
    media-src ${cspSource} https: blob:;
    script-src 'nonce-${nonce}' 'unsafe-eval';
    style-src ${cspSource} 'unsafe-inline';
    font-src ${cspSource} https: data:;
  ">
  <link rel="stylesheet" href="${cssUri}">
  <title>Markdown Preview</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

export function resolveImageSrc(src: string, baseUri: string): string {
  if (!src) return src;
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  if (!baseUri) return src;
  return `${baseUri}/${src}`;
}
