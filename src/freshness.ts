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
 */
export type StalenessLevel = 'fresh' | 'stale' | 'outdated';

/**
 * family 共通の閾値定数 (日数)。
 *
 * 各 MCP は同じ感覚で staleness を判定するため本定数を参照する。
 * 個別の MCP で異なる閾値が必要な場合は `judgeStaleness` をラップして
 * MCP 固有の閾値を使う関数を作ってよい (本定数を上書きしない)。
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
 * @param daysSince 経過日数 (整数想定、負値は 0 に丸める呼び出し側責務)
 * @returns `'fresh'` | `'stale'` | `'outdated'`
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
  if (daysSince < STALENESS_THRESHOLDS.fresh_days) return 'fresh';
  if (daysSince < STALENESS_THRESHOLDS.stale_days) return 'stale';
  return 'outdated';
}

/**
 * `fetched_at` (ISO 8601) と現在時刻から経過日数を計算する純関数。
 *
 * - 小数なし、日数の `floor`
 * - 未来時刻 (now < fetched) は 0 に丸める
 * - パース不能な ISO 文字列は 0 を返す (呼び出し側で扱いを決める)
 *
 * @param fetchedAt ISO 8601 形式の取得時刻 (例: "2026-04-01T00:00:00Z")
 * @param nowMs Date.now() 相当 (テスト時に固定値を渡せる)
 */
export function computeDaysSince(fetchedAt: string, nowMs: number = Date.now()): number {
  const fetchedMs = Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedMs)) return 0;
  const diffMs = nowMs - fetchedMs;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
