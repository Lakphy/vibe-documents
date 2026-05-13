import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const webviewAssetsDir = join(root, 'dist', 'webview-assets');

const budgets = {
  mainJsBytes: 160 * 1024,
  mainJsGzipBytes: 60 * 1024,
  mainCssBytes: 110 * 1024,
  mainCssGzipBytes: 25 * 1024,
};

async function countFiles(dir, predicate) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }

  let count = 0;
  await Promise.all(entries.map(async entry => {
    const fullPath = join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      count += await countFiles(fullPath, predicate);
    } else if (predicate(entry, fullPath)) {
      count += 1;
    }
  }));
  return count;
}

async function assetSize(file) {
  const bytes = await readFile(join(webviewAssetsDir, file));
  return {
    raw: bytes.length,
    gzip: gzipSync(bytes).length,
  };
}

function assertBudget(label, actual, limit) {
  if (actual > limit) {
    throw new Error(`${label} ${actual} bytes exceeds budget ${limit} bytes`);
  }
}

const js = await assetSize('webview.js');
const css = await assetSize('webview.css');
const mapCount = await countFiles(webviewAssetsDir, entry => entry.endsWith('.map'));

assertBudget('webview.js', js.raw, budgets.mainJsBytes);
assertBudget('webview.js gzip', js.gzip, budgets.mainJsGzipBytes);
assertBudget('webview.css', css.raw, budgets.mainCssBytes);
assertBudget('webview.css gzip', css.gzip, budgets.mainCssGzipBytes);
assertBudget('source map count', mapCount, 0);

console.log([
  `webview.js ${js.raw} bytes (${js.gzip} gzip)`,
  `webview.css ${css.raw} bytes (${css.gzip} gzip)`,
  `source maps ${mapCount}`,
].join('\n'));
