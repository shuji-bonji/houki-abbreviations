/**
 * Freshness — houki-hub family 共通の staleness 判定ヘルパ
 *
 * 各 MCP は自前で `fetched_at` (ISO 8601) を持ち、本モジュールの
 * **型 + 閾値 + 純関数 helper** を使って統一的に staleness を判定する。
 *
 * ## エントリ単位の freshness は持たない
 *
 * 本パッケージの `AbbreviationEntry` には `freshness` 系フィールドは含まれない。
 * 辞書データ（abbr / formal / law_id 等）は **静的なメタ情報** であり、
 * 「いつ取得したか」という運用状態を持つのは各 MCP のローカル DB / キャッシュ側。
 * したがって、本モジュールが担うのは **判定ロジックの正典化のみ** で、
 * 「どこに `fetched_at` を持つか」「どの粒度で集計するか」は各 MCP に委ねる。
 *
 * ## 共通化の方針 (Issue #15 設計判断)
 *
 * 共通化するもの:
 * - 型 (`StalenessLevel`)
 * - 閾値定数 (`STALENESS_THRESHOLDS`)
 * - 純関数 (`judgeStaleness`, `computeDaysSince`)
 *
 * 共通化しないもの (各 MCP に残す):
 * - DB アクセス層 (e.g. `summarizeFreshnessFromSection` / `summarizeFreshnessFromDocument`)
 * - レスポンス整形 (`FreshnessRange` / `FreshnessSingle` interface 等)
 * - 警告メッセージ (各 MCP の bulk DL コマンド等の文言)
 *
 * 理由: memory `houki_resilience_locality.md`「検知ロジックは各 MCP に置き、
 * 集約は結果レイヤーで」スタンスに従い、各 MCP のデータ取得方法 (bulk DL /
 * API / 都度 fetch 等) ごとの違いを吸収するため。
 *
 * ## 採用した閾値の根拠
 *
 * houki-nta-mcp v0.6.0 (Phase 5 Resilience) で確立された慣行値:
 * - `fresh_days: 7` — 1 週間以内なら "fresh" (週次 health-check 想定)
 * - `stale_days: 30` — 1 ヶ月以内なら "stale"、それ以上は "outdated" (月次 bulk DL 想定)
 *
 * ## 呼び出し側の典型パターン
 *
 * 1. 各 MCP の DB / cache から `fetched_at` (ISO 8601) を引く
 * 2. `computeDaysSince(fetched_at)` で経過日数を得る
 * 3. `judgeStaleness(days)` で `'fresh' | 'stale' | 'outdated'` を得る
 * 4. MCP 固有のレスポンス形 (`FreshnessRange` / `FreshnessSingle` 等) に詰めて返す
 *
 * @example 単一エントリの判定
 * ```ts
 * import { judgeStaleness, computeDaysSince } from '@shuji-bonji/houki-abbreviations';
 *
 * const days = computeDaysSince('2026-04-01T00:00:00Z');
 * const level = judgeStaleness(days);  // 'fresh' | 'stale' | 'outdated'
 * ```
 *
 * @example MCP 固有しきい値が必要な場合 (本定数を上書きしない)
 * ```ts
 * import {
 *   STALENESS_THRESHOLDS,
 *   judgeStaleness,
 *   type StalenessLevel,
 * } from '@shuji-bonji/houki-abbreviations';
 *
 * // 通達系は鮮度感覚が緩いので独自しきい値でラップ
 * const TSUTATSU_THRESHOLDS = { fresh_days: 14, stale_days: 90 } as const;
 *
 * function judgeTsutatsuStaleness(days: number): StalenessLevel {
 *   if (days < TSUTATSU_THRESHOLDS.fresh_days) return 'fresh';
 *   if (days < TSUTATSU_THRESHOLDS.stale_days) return 'stale';
 *   return 'outdated';
 * }
 * ```
 *
 * @see houki-nta-mcp v0.6.0 `docs/RESILIENCE.md` (慣行の起点)
 * @see memory `houki_resilience_locality.md` (集約レイヤー責務分担)
 */

/**
 * staleness の判定レベル。
 *
 * 各 MCP のレスポンス整形（`FreshnessRange` / `FreshnessSingle` 等）の
 * フィールドとして共通的に使われる想定。文字列 union の値は family 全体で
 * 不変として扱う（壊すと既存の MCP すべてに破壊変更が伝播する）。
 *
 * - `'fresh'`: 直近に取得済み（既定: < 7 日）。利用可、警告不要
 * - `'stale'`: やや古い（既定: 7〜29 日）。利用可だが bulk DL を warning として返す
 * - `'outdated'`: 古い（既定: ≧ 30 日）。利用前に再取得を促す
 *
 * @since 0.4.1
 * @group 鮮度の判定
 */
export type StalenessLevel = 'fresh' | 'stale' | 'outdated';

/**
 * family 共通の閾値定数 (日数)。
 *
 * 各 MCP は同じ感覚で staleness を判定するため本定数を参照する。
 * 個別の MCP で異なる閾値が必要な場合は `judgeStaleness` をラップして
 * MCP 固有の閾値を使う関数を作ってよい (本定数を上書きしない)。
 *
 * @since 0.4.1
 * @group 鮮度の判定
 */
export const STALENESS_THRESHOLDS = {
  /** fresh と判定する境界 (この日数 **未満** なら fresh) */
  fresh_days: 7,
  /** stale と判定する境界 (この日数 **未満** なら stale、それ以上は outdated) */
  stale_days: 30,
} as const;

/**
 * 経過日数から staleness レベルを判定する純関数。
 *
 * 通常は `computeDaysSince` の戻り値をそのまま渡す。`STALENESS_THRESHOLDS`
 * （`fresh_days` / `stale_days`）に従って `'fresh' | 'stale' | 'outdated'`
 * を返す。
 *
 * `daysSince` は 0 以上の有限の数（小数でもよい）。負の値・`NaN`・`±Infinity` は
 * `RangeError`、数でない値は `TypeError` を投げる（v0.7.0 から。v0.6.1 までは
 * 負の値を `'fresh'`、`NaN` を `'outdated'` にしていた）。
 *
 * @since 0.4.1
 * @group 鮮度の判定
 * @param daysSince 経過日数（0 以上の有限の数）
 * @returns `'fresh'` | `'stale'` | `'outdated'`
 * @throws {TypeError} `daysSince` が数でない
 * @throws {RangeError} `daysSince` が負の値・`NaN`・`±Infinity`
 *
 * @example
 * ```ts
 * judgeStaleness(0);   // 'fresh'
 * judgeStaleness(7);   // 'stale'  (境界: fresh_days はちょうどで stale)
 * judgeStaleness(29);  // 'stale'
 * judgeStaleness(30);  // 'outdated' (境界: stale_days はちょうどで outdated)
 * ```
 */
export function judgeStaleness(daysSince: number): StalenessLevel {
  if (typeof daysSince !== 'number') {
    throw new TypeError(`daysSince は数で指定してください: ${JSON.stringify(daysSince)}`);
  }
  if (!Number.isFinite(daysSince) || daysSince < 0) {
    throw new RangeError(`daysSince は 0 以上の有限の数で指定してください: ${daysSince}`);
  }
  if (daysSince < STALENESS_THRESHOLDS.fresh_days) return 'fresh';
  if (daysSince < STALENESS_THRESHOLDS.stale_days) return 'stale';
  return 'outdated';
}

/**
 * `fetchedAt` が受け付ける ISO 8601 の 3 つの形。
 * (a) 日付だけ `YYYY-MM-DD`、(b) UTC `YYYY-MM-DDTHH:mm:ss(.sss)Z`、
 * (c) 時差付き `YYYY-MM-DDTHH:mm:ss(.sss)±hh:mm`。
 */
const FETCHED_AT_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * `fetchedAt` を検査してミリ秒にする。3 つの形に当たらない書き方、時差の無い時刻、
 * 暦に無い日付（2 月 30 日など）は `RangeError`。
 */
function parseFetchedAt(fetchedAt: string): number {
  const m = FETCHED_AT_RE.exec(fetchedAt);
  if (!m) {
    throw new RangeError(
      `fetchedAt は ISO 8601（YYYY-MM-DD / YYYY-MM-DDTHH:mm:ssZ / YYYY-MM-DDTHH:mm:ss±hh:mm）で指定してください: ${JSON.stringify(fetchedAt)}`
    );
  }
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day));
  const calendarOk =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  const timeOk = Number(h) < 24 && Number(mi) < 60 && Number(s) < 60;
  const ms = Date.parse(fetchedAt);
  if (!calendarOk || !timeOk || !Number.isFinite(ms)) {
    throw new RangeError(`fetchedAt が暦に無い日付か時刻です: ${JSON.stringify(fetchedAt)}`);
  }
  return ms;
}

/**
 * `fetched_at` (ISO 8601) と現在時刻から経過日数を計算する純関数。
 *
 * - 小数なし、日数の `floor`
 * - 未来時刻 (now < fetched) は 0 に丸める（時計のずれで起きるので、壊れた値とは扱わない）
 * - `fetchedAt` は ISO 8601 の 3 つの形だけを受け付ける: 日付だけ `YYYY-MM-DD`（UTC の
 *   0 時として扱う）、UTC `YYYY-MM-DDTHH:mm:ss(.sss)Z`、時差付き
 *   `YYYY-MM-DDTHH:mm:ss(.sss)±hh:mm`。それ以外の書き方（`2026/05/07`、`May 7, 2026`）、
 *   時差の無い時刻、暦に無い日付は `RangeError`、文字列でない値は `TypeError` を投げる
 *   （v0.7.0 から。v0.6.1 までは `Date.parse` が読めないものに `0` を返し、壊れた
 *   取得時刻が `fresh` になっていた）
 * - `nowMs` は有限の数。`NaN` / `±Infinity` は `RangeError`、数でない値は `TypeError`
 *
 * @since 0.4.1
 * @group 鮮度の判定
 * @param fetchedAt ISO 8601 形式の取得時刻 (例: "2026-04-01T00:00:00Z")
 * @param nowMs Date.now() 相当 (テスト時に固定値を渡せる)
 * @throws {TypeError} `fetchedAt` が文字列でない、または `nowMs` が数でない
 * @throws {RangeError} `fetchedAt` が受け付けない書き方・暦に無い日付、または `nowMs` が有限でない
 */
export function computeDaysSince(fetchedAt: string, nowMs: number = Date.now()): number {
  if (typeof fetchedAt !== 'string') {
    throw new TypeError(`fetchedAt は文字列で指定してください: ${String(fetchedAt)}`);
  }
  if (typeof nowMs !== 'number') {
    throw new TypeError(`nowMs は数で指定してください: ${JSON.stringify(nowMs)}`);
  }
  if (!Number.isFinite(nowMs)) {
    throw new RangeError(`nowMs は有限の数で指定してください: ${nowMs}`);
  }
  const fetchedMs = parseFetchedAt(fetchedAt);
  const diffMs = nowMs - fetchedMs;
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
}
