import { rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const webviewAssetsDir = join(root, 'dist', 'webview-assets');

async function removeMaps(dir) {
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }

  let removed = 0;
  await Promise.all(entries.map(async entry => {
    const fullPath = join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      removed += await removeMaps(fullPath);
    } else if (entry.endsWith('.map')) {
      await rm(fullPath);
      removed += 1;
    }
  }));
  return removed;
}

const removed = await removeMaps(webviewAssetsDir);
if (removed > 0) {
  console.log(`Removed ${removed} webview source map files.`);
}
