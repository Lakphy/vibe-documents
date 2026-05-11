import { describe, it, expect } from 'vitest';
import { CODE_HIGHLIGHT_THEMES } from '../markdownPreviewConfig';

describe('markdown preview config', () => {
  it('uses readable dual Shiki themes for light and dark VS Code themes', () => {
    expect(CODE_HIGHLIGHT_THEMES).toEqual(['vitesse-light', 'vitesse-dark']);
  });
});
