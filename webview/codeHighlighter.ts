import { createCodePlugin } from '@streamdown/code';
import { CODE_HIGHLIGHT_THEMES } from './markdownPreviewConfig';

export const codePlugin = createCodePlugin({
  themes: CODE_HIGHLIGHT_THEMES,
});
