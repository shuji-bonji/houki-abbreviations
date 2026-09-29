#!/usr/bin/env node
/**
 * verify-law-ids.mjs — e-Gov API 突合 CI スクリプト
 *
 * e-Gov 法令 API v2 `GET /api/2/laws` の全件（2026-10-01 で 9,570 件）を取得し、2 つの検査を行う。
 *
 * A. 辞書全件のうち `law_id !== null` のエントリについて:
 *    1. e-Gov 上に law_id が存在する
 *    2. e-Gov の `law_title` が辞書の `formal` と一致する
 *    3. e-Gov の `law_num`（漢数字）が辞書の `law_num` と一致する（辞書に `law_num` があるとき）
 *
 * B. 全件の `law_id` に `isValidLawId` を通し、`false` になるものが無いことを確かめる
 *    （v0.7.0、Issue #23。`isValidLawId` を公式仕様の 6 つの形に狭めたので、新しい形の
 *    法令 ID が足されたときに気付けるようにする）。`dist/index.js` を読むので、先に
 *    `npm run build` が要る。
 *
 * 不一致は stdout / stderr に出力し、不一致が 1 件でもあれば exit 1。
 *
 * ## 想定運用
 *
 * - パッケージ本体には含めない（`scripts/` 配下に置き、`files` フィールドにも含めない）
 * - 月次 GitHub Actions workflow `verify-law-ids.yml` から呼び出す
 * - Pull Request 時には走らせない（API rate limit を避ける）
 *
 * ## 使い方
 *
 * ```sh
 * npm run build
 * npm run verify-law-ids
 * # または
 * node scripts/verify-law-ids.mjs
 * # 詳細ログを出す:
 * VERBOSE=1 node scripts/verify-law-ids.mjs
 * ```
 *
 * ## 注意
 *
 * - e-Gov API の rate limit に配慮し、ページの取得の間に最低 500ms の sleep を挟む
 * - API 仕様は houki-egov-mcp の実装と整合する。エンドポイントが変わった場合は
 *   houki-egov-mcp 側の最新 client を参照して更新する
 *
 * @see houki-egov-mcp src/services/egov-api/client.ts
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const DIST_INDEX = join(ROOT, 'dist', 'index.js');

const VERBOSE = process.env.VERBOSE === '1';
const REQUEST_DELAY_MS = 500;
/** `GET /api/2/laws` の 1 ページの件数（API は 5000 まで受け付ける） */
const LAWS_PAGE_SIZE = 1000;

const EGOV_API_BASE = 'https://laws.e-gov.go.jp/api/2';

/* -------------------------------------------------------------------------- */
/* Load dictionary                                                            */
/* -------------------------------------------------------------------------- */

function loadAllEntries() {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  const entries = [];
  for (const file of files) {
    const json = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
    if (Array.isArray(json)) entries.push(...json);
  }
  return entries;
}

/* -------------------------------------------------------------------------- */
/* e-Gov API client                                                           */
/* -------------------------------------------------------------------------- */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * e-Gov 法令 API v2 `GET /api/2/laws` の全件を、ページを追って集める。
 * 応答は `{ total_count, count, next_offset, laws: [{ law_info, revision_info }] }`。
 *
 * @returns {Promise<{ laws: Map<string, { law_num: string, law_title: string }>, total: number }>}
 */
async function fetchAllLaws() {
  const laws = new Map();
  let offset = 0;
  let total = null;
  for (;;) {
    const url = `${EGOV_API_BASE}/laws?limit=${LAWS_PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`GET /api/2/laws が ${res.status} を返しました（offset=${offset}）`);
    }
    const data = await res.json();
    total ??= data.total_count;
    const page = Array.isArray(data.laws) ? data.laws : [];
    for (const law of page) {
      const id = law?.law_info?.law_id;
      if (typeof id !== 'string') continue;
      laws.set(id, {
        law_num: law.law_info?.law_num ?? '',
        law_title: law.revision_info?.law_title ?? '',
      });
    }
    if (VERBOSE) console.log(`[verify] laws ${laws.size}/${total}`);
    if (page.length === 0 || data.next_offset == null) break;
    if (total != null && laws.size >= total) break;
    offset = data.next_offset;
    await sleep(REQUEST_DELAY_MS);
  }
  return { laws, total };
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const entries = loadAllEntries();
  const verifiable = entries.filter((e) => e.law_id);
  const { isValidLawId } = await import(pathToFileURL(DIST_INDEX).href);

  console.log(
    `[verify] 全エントリ ${entries.length} 件、law_id 設定済み ${verifiable.length} 件を検証`
  );
  const { laws, total } = await fetchAllLaws();
  console.log(`[verify] e-Gov 全件 ${laws.size} 件を取得（total_count ${total}）`);

  // A. 辞書の law_id を e-Gov と突き合わせる
  const failures = [];
  for (const entry of verifiable) {
    const law = laws.get(entry.law_id);
    if (VERBOSE) console.log(`[verify] ${entry.law_id} ${entry.formal}`);
    if (!law) {
      failures.push({ type: 'not_found', entry, message: 'e-Gov に無い law_id です' });
      continue;
    }
    if (law.law_title !== entry.formal) {
      failures.push({
        type: 'title_mismatch',
        entry,
        message: `e-Gov の law_title '${law.law_title}' が辞書の formal '${entry.formal}' と違います`,
      });
    }
    if (entry.law_num && law.law_num !== entry.law_num) {
      failures.push({
        type: 'law_num_mismatch',
        entry,
        message: `e-Gov の law_num '${law.law_num}' が辞書の law_num '${entry.law_num}' と違います`,
      });
    }
  }
  console.log(
    `[verify] 辞書の突合: ${verifiable.length} 件中 ${failures.length} 件 NG（種類: not_found / title_mismatch / law_num_mismatch）`
  );
  for (const f of failures) {
    console.error(`  [${f.type}] ${f.entry.abbr} (${f.entry.law_id}): ${f.message}`);
  }

  // B. e-Gov 全件の law_id に isValidLawId を通す
  const invalidIds = [...laws.keys()].filter((id) => !isValidLawId(id));
  console.log(
    `[verify] isValidLawId: ${laws.size - invalidIds.length} OK / ${invalidIds.length} NG`
  );
  for (const id of invalidIds) {
    console.error(`  [invalid_law_id] isValidLawId('${id}') が false です`);
  }

  if (failures.length > 0 || invalidIds.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[verify] 予期せぬエラー:', err);
  process.exit(1);
});
