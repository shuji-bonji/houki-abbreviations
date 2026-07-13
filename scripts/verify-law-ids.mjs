#!/usr/bin/env node
/**
 * verify-law-ids.mjs — e-Gov API 突合 CI スクリプト
 *
 * 辞書全件のうち `law_id !== null` のエントリについて、e-Gov 法令 API を
 * 叩いて以下を検証する:
 *
 * 1. e-Gov 上で law_id が存在する（404 でない）
 * 2. e-Gov が返す `LawNameKana` / `LawName` が辞書の `formal` と一致する
 * 3. e-Gov が返す `LawNumber`（漢数字）が辞書の `law_num` と一致する
 *
 * 不一致は stdout に出力し、不一致が 1 件でもあれば exit 1。
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
 * npm run verify-law-ids
 * # または
 * node scripts/verify-law-ids.mjs
 * # 詳細ログを出す:
 * VERBOSE=1 node scripts/verify-law-ids.mjs
 * ```
 *
 * ## 注意
 *
 * - e-Gov API の rate limit に配慮し、リクエスト間に最低 500ms の sleep を挟む
 * - API 仕様は houki-egov-mcp の実装と整合する。エンドポイントが変わった場合は
 *   houki-egov-mcp 側の最新 client を参照して更新する
 *
 * @see houki-egov-mcp src/services/egov-api/client.ts
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'src', 'data');

const VERBOSE = process.env.VERBOSE === '1';
const REQUEST_DELAY_MS = 500;

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

/**
 * e-Gov 法令 API から法令メタ情報を取得する。
 *
 * 注意: 本実装は雛形。houki-egov-mcp の最新 client と齟齬があれば
 * そちらに合わせる。
 */
async function fetchLawMeta(law_id) {
  const url = `${EGOV_API_BASE}/lawdata/${encodeURIComponent(law_id)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const data = await res.json();
  return { ok: true, data };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const entries = loadAllEntries();
  const verifiable = entries.filter((e) => e.law_id);

  console.log(`[verify] 全エントリ ${entries.length} 件、law_id 設定済み ${verifiable.length} 件を検証`);

  const failures = [];
  let count = 0;
  for (const entry of verifiable) {
    count++;
    if (VERBOSE) {
      console.log(`[verify] (${count}/${verifiable.length}) ${entry.law_id} ${entry.formal}`);
    }
    const res = await fetchLawMeta(entry.law_id);
    if (!res.ok) {
      failures.push({
        type: 'http_error',
        entry,
        message: `e-Gov API が ${res.status} を返しました`,
      });
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    // TODO: e-Gov API のレスポンス形に合わせて formal / law_num を照合
    //       houki-egov-mcp の client が実装している parser を流用する
    //       現時点では雛形として「取得できたか」だけ確認

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`[verify] 検証完了: ${verifiable.length - failures.length} OK / ${failures.length} NG`);
  for (const f of failures) {
    console.error(`  [${f.type}] ${f.entry.abbr} (${f.entry.law_id}): ${f.message}`);
  }
  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[verify] 予期せぬエラー:', err);
  process.exit(1);
});
