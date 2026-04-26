/**
 * houki-hub-mcp の src/abbreviations/*.json を読み込み、
 * category / source_mcp_hint を付与して src/data/ に保存する。
 *
 * 変換ルール:
 *   law_id === '321CONSTITUTION' → category='constitution'
 *   law_type === 'Act'                → category='law'
 *   law_type === 'CabinetOrder'       → category='cabinet-order'
 *   law_type === 'ImperialOrdinance'  → category='imperial-ordinance'
 *   law_type === 'MinisterialOrdinance' → category='ministerial-ordinance'
 *   law_type === 'Rule'               → category='rule'
 *   それ以外（law_type 未指定）       → category='law'（暫定、要確認）
 *
 *   全エントリ → source_mcp_hint='houki-egov'（v0.1.0 時点では法令系しかない）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// houki-hub-mcp 側のソース（同階層のリポジトリを期待）
const SRC_HUB = resolve(ROOT, '..', 'houki-hub-mcp', 'src', 'abbreviations');
const DEST_DATA = join(ROOT, 'src', 'data');

if (!existsSync(SRC_HUB)) {
  console.error(`[migrate] source not found: ${SRC_HUB}`);
  console.error('  Make sure houki-hub-mcp is checked out as a sibling directory.');
  process.exit(1);
}

mkdirSync(DEST_DATA, { recursive: true });

/**
 * @param {{ law_type?: string; law_id?: string | null }} entry
 * @returns {string} category
 */
function deriveCategory(entry) {
  if (entry.law_id === '321CONSTITUTION') return 'constitution';
  switch (entry.law_type) {
    case 'Act':
      return 'law';
    case 'CabinetOrder':
      return 'cabinet-order';
    case 'ImperialOrdinance':
      return 'imperial-ordinance';
    case 'MinisterialOrdinance':
      return 'ministerial-ordinance';
    case 'Rule':
      return 'rule';
    default:
      // law_type 未指定は法律として扱う（憲法は上で分岐済み）
      return 'law';
  }
}

const DOMAINS = ['tax', 'labor', 'accounting', 'commercial', 'civil', 'administrative'];

let totalIn = 0;
let totalOut = 0;
const stats = {};

for (const domain of DOMAINS) {
  const inPath = join(SRC_HUB, `${domain}.json`);
  if (!existsSync(inPath)) {
    console.error(`[migrate] missing: ${inPath}`);
    continue;
  }
  const raw = JSON.parse(readFileSync(inPath, 'utf8'));
  totalIn += raw.length;

  const migrated = raw.map((e) => {
    const category = deriveCategory(e);
    /** @type {Record<string, unknown>} */
    const out = {
      abbr: e.abbr,
      formal: e.formal,
      law_id: e.law_id ?? null,
      ...(e.law_num ? { law_num: e.law_num } : {}),
      ...(e.law_type ? { law_type: e.law_type } : {}),
      domain: e.domain,
      category,
      source_mcp_hint: 'houki-egov',
      ...(e.aliases ? { aliases: e.aliases } : {}),
      ...(e.note ? { note: e.note } : {}),
    };
    return out;
  });

  totalOut += migrated.length;
  stats[domain] = migrated.length;

  const outPath = join(DEST_DATA, `${domain}.json`);
  writeFileSync(outPath, JSON.stringify(migrated, null, 2) + '\n', 'utf8');
  console.log(`[migrate] ${domain}: ${migrated.length} entries → ${outPath}`);
}

console.log('---');
console.log(`[migrate] total: ${totalIn} → ${totalOut}`);
console.log('[migrate] stats:', stats);

if (totalIn !== totalOut) {
  console.error('[migrate] ERROR: count mismatch');
  process.exit(1);
}
