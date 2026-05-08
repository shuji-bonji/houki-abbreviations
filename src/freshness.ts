/**
 * Freshness — houki-hub family 共通の staleness 判定ヘルパ
 *
 * 各 MCP は自前で `fetched_at` (ISO 8601) を持ち、本モジュールの
 * **型 + 閾値 + 純関数 helper** を使って統一的に staleness を判定する。
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
 * @example
 * ```ts
 * import { judgeStaleness, computeDaysSince } from '@shuji-bonji/houki-abbreviations';
 *
 * const days = computeDaysSince('2026-04-01T00:00:00Z');
 * const level = judgeStaleness(days);  // 'fresh' | 'stale' | 'outdated'
 * ```
 *
 * @see houki-nta-mcp v0.6.0 `docs/RESILIENCE.md` (慣行の起点)
 */

/** staleness の判定レベル */
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
 * @param daysSince 経過日数 (整数想定、負値は 0 に丸める呼び出し側責務)
 * @returns `'fresh'` | `'stale'` | `'outdated'`
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
