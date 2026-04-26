/**
 * Build 後に src/data/*.json を dist/data/ にコピーする。
 * tsc は JSON ファイルをコピーしないため、手動で同期する。
 */
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SRC_DIR = join(ROOT, 'src', 'data');
const DEST_DIR = join(ROOT, 'dist', 'data');

if (!existsSync(SRC_DIR)) {
  console.error(`[copy-assets] source directory not found: ${SRC_DIR}`);
  process.exit(1);
}

mkdirSync(DEST_DIR, { recursive: true });

const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.json'));
for (const file of files) {
  copyFileSync(join(SRC_DIR, file), join(DEST_DIR, file));
  console.log(`[copy-assets] ${file}`);
}

console.log(`[copy-assets] copied ${files.length} JSON files to dist/data/`);
