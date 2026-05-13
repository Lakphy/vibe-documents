import { createBundledHighlighter } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import type { CodeHighlighterPlugin, HighlightResult, ThemeInput } from '@streamdown/code';
import { CODE_HIGHLIGHT_THEMES } from './markdownPreviewConfig';

const languageLoaders = {
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  csharp: () => import('@shikijs/langs/csharp'),
  css: () => import('@shikijs/langs/css'),
  diff: () => import('@shikijs/langs/diff'),
  dockerfile: () => import('@shikijs/langs/dockerfile'),
  go: () => import('@shikijs/langs/go'),
  html: () => import('@shikijs/langs/html'),
  java: () => import('@shikijs/langs/java'),
  javascript: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  jsonc: () => import('@shikijs/langs/jsonc'),
  jsx: () => import('@shikijs/langs/jsx'),
  markdown: () => import('@shikijs/langs/markdown'),
  php: () => import('@shikijs/langs/php'),
  python: () => import('@shikijs/langs/python'),
  ruby: () => import('@shikijs/langs/ruby'),
  rust: () => import('@shikijs/langs/rust'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  sql: () => import('@shikijs/langs/sql'),
  tsx: () => import('@shikijs/langs/tsx'),
  typescript: () => import('@shikijs/langs/typescript'),
  vue: () => import('@shikijs/langs/vue'),
  xml: () => import('@shikijs/langs/xml'),
  yaml: () => import('@shikijs/langs/yaml'),
} as const;

const themeLoaders = {
  'vitesse-light': () => import('@shikijs/themes/vitesse-light'),
  'vitesse-dark': () => import('@shikijs/themes/vitesse-dark'),
} as const;

type SupportedLanguage = keyof typeof languageLoaders;
type SupportedTheme = keyof typeof themeLoaders;

const languageAliases: Record<string, SupportedLanguage> = {
  bash: 'shellscript',
  cjs: 'javascript',
  cs: 'csharp',
  htm: 'html',
  js: 'javascript',
  mjs: 'javascript',
  md: 'markdown',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'shellscript',
  shell: 'shellscript',
  ts: 'typescript',
  yml: 'yaml',
  zsh: 'shellscript',
};

const supportedLanguageSet = new Set(Object.keys(languageLoaders));
const createShikiHighlighter = createBundledHighlighter({
  langs: languageLoaders,
  themes: themeLoaders,
  engine: () => createJavaScriptRegexEngine({ forgiving: true }),
});

type ShikiHighlighter = Awaited<ReturnType<typeof createShikiHighlighter>>;

const highlighterCache = new Map<string, Promise<ShikiHighlighter>>();
const resultCache = new Map<string, HighlightResult>();
const pendingCallbacks = new Map<string, Set<(result: HighlightResult) => void>>();
const inFlightHighlights = new Set<string>();

function normalizeLanguage(language: unknown): SupportedLanguage | null {
  const normalized = String(language || '').trim().toLowerCase();
  if (!normalized || normalized === 'text' || normalized === 'txt' || normalized === 'plain' || normalized === 'plaintext') {
    return null;
  }
  if (supportedLanguageSet.has(normalized)) return normalized as SupportedLanguage;
  return languageAliases[normalized] ?? null;
}

function getThemeName(theme: ThemeInput, fallback: SupportedTheme): SupportedTheme {
  if (typeof theme === 'string' && theme in themeLoaders) {
    return theme as SupportedTheme;
  }
  if (typeof theme === 'object' && theme && 'name' in theme && typeof theme.name === 'string' && theme.name in themeLoaders) {
    return theme.name as SupportedTheme;
  }
  return fallback;
}

function normalizeThemes(themes: [ThemeInput, ThemeInput]): [SupportedTheme, SupportedTheme] {
  return [
    getThemeName(themes[0], 'vitesse-light'),
    getThemeName(themes[1], 'vitesse-dark'),
  ];
}

function hashCode(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function cacheKey(code: string, language: SupportedLanguage | null, themes: [SupportedTheme, SupportedTheme]) {
  return `${language ?? 'text'}:${themes[0]}:${themes[1]}:${code.length}:${hashCode(code)}`;
}

function createPlainResult(code: string): HighlightResult {
  let offset = 0;
  const tokens = code.split('\n').map(line => {
    const lineOffset = offset;
    offset += line.length + 1;
    return line ? [{ content: line, offset: lineOffset }] : [];
  });
  return {
    tokens,
    themeName: 'plain',
    rootStyle: false,
  };
}

function getHighlighter(language: SupportedLanguage, themes: [SupportedTheme, SupportedTheme]) {
  const key = `${language}:${themes[0]}:${themes[1]}`;
  const cached = highlighterCache.get(key);
  if (cached) return cached;

  const highlighter = createShikiHighlighter({
    langs: [language],
    themes,
  });
  highlighterCache.set(key, highlighter);
  return highlighter;
}

export function createCodePlugin(options: { themes?: [ThemeInput, ThemeInput] } = {}): CodeHighlighterPlugin {
  const configuredThemes = options.themes ?? CODE_HIGHLIGHT_THEMES;

  return {
    name: 'shiki',
    type: 'code-highlighter',
    getThemes: () => configuredThemes,
    getSupportedLanguages: () => [
      ...Object.keys(languageLoaders),
      ...Object.keys(languageAliases),
    ] as ReturnType<CodeHighlighterPlugin['getSupportedLanguages']>,
    supportsLanguage: language => normalizeLanguage(language) !== null,
    highlight: ({ code, language, themes }, callback) => {
      const normalizedThemes = normalizeThemes(themes);
      const normalizedLanguage = normalizeLanguage(language);
      const key = cacheKey(code, normalizedLanguage, normalizedThemes);
      const cached = resultCache.get(key);
      if (cached) return cached;

      if (normalizedLanguage === null) {
        const result = createPlainResult(code);
        resultCache.set(key, result);
        return result;
      }

      if (callback) {
        let callbacks = pendingCallbacks.get(key);
        if (!callbacks) {
          callbacks = new Set();
          pendingCallbacks.set(key, callbacks);
        }
        callbacks.add(callback);
      }

      if (!inFlightHighlights.has(key)) {
        inFlightHighlights.add(key);
        getHighlighter(normalizedLanguage, normalizedThemes)
          .then(highlighter => {
            const result = highlighter.codeToTokens(code, {
              lang: normalizedLanguage,
              themes: {
                light: normalizedThemes[0],
                dark: normalizedThemes[1],
              },
              tokenizeMaxLineLength: 2000,
              tokenizeTimeLimit: 200,
            });
            resultCache.set(key, result);
            const callbacks = pendingCallbacks.get(key);
            if (callbacks) {
              for (const notify of callbacks) notify(result);
              pendingCallbacks.delete(key);
            }
          })
          .catch(error => {
            console.error('[Vibe Documents] Failed to highlight code:', error);
            const result = createPlainResult(code);
            resultCache.set(key, result);
            const callbacks = pendingCallbacks.get(key);
            if (callbacks) {
              for (const notify of callbacks) notify(result);
              pendingCallbacks.delete(key);
            }
          })
          .finally(() => {
            inFlightHighlights.delete(key);
          });
      }

      return null;
    },
  };
}

export const codePlugin = createCodePlugin({
  themes: CODE_HIGHLIGHT_THEMES,
});
