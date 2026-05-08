export interface RegexOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSearchRegex(query: string, opts: RegexOptions): RegExp | null {
  if (!query) return null;
  try {
    let pattern = opts.useRegex ? query : escapeRegExp(query);
    if (opts.wholeWord) pattern = `\\b${pattern}\\b`;
    return new RegExp(pattern, opts.caseSensitive ? 'g' : 'gi');
  } catch {
    return null;
  }
}
