/**
 * Search & Fuzzy API — v0.4.0 Track 1
 *
 * 既存の `resolveAbbreviation` (完全一致のみ) を補完する **検索拡張**:
 *  - `searchByName(query, options)` — 部分一致 (prefix / contains / suffix)
 *  - `findSimilar(query, options)` — Levenshtein 距離ベースのあいまい一致
 *  - `suggestCorrection(query, limit)` — `findSimilar` の薄いラッパ (formal だけ返す)
 *
 * 設計指針:
 *  - 全件走査 (200 件強) で十分高速。インデックス構築は不要
 *  - Levenshtein は外部依存なしで自前実装 (~50 行)
 *  - filter (`domain` / `category` / `source_mcp_hint`) は単一値・配列両対応
 *  - normalize オプションは v0.3.0 の `normalizeJpText` を活用
 *
 * @see docs/v0.4.0-roadmap.md §Track 1
 */

import type { AbbreviationEntry, Category, Domain, SourceMcpHint } from './types.js';
import { normalizeJpText } from './normalize.js';

/* -------------------------------------------------------------------------- */
/* SearchByName                                                               */
/* -------------------------------------------------------------------------- */

/** 部分一致モード */
export type SearchMode = 'prefix' | 'contains' | 'suffix';

/** searchByName のオプション */
export interface SearchOptions {
  /** 検索モード (デフォルト 'contains') */
  mode?: SearchMode;
  /** 全角/半角の表記ゆらぎを吸収 (デフォルト true) */
  normalize?: boolean;
  /** 結果の最大件数 (デフォルト 50、上限 500) */
  limit?: number;
  /** 結果を絞り込むフィルター (各キーは単一値 or 配列) */
  filter?: SearchFilter;
}

/** filter 構造。各キーは単一値・配列のどちらでも OK */
export interface SearchFilter {
  domain?: Domain | Domain[];
  category?: Category | Category[];
  source_mcp_hint?: SourceMcpHint | SourceMcpHint[];
}

/**
 * 名前で検索 (部分一致)。`abbr` / `formal` / `aliases` のどれかにマッチを試みる。
 *
 * @param entries 検索対象のエントリ配列 (通常は `abbreviationEntries` 全件)
 * @param query 検索キーワード
 * @param options 検索オプション
 * @returns マッチしたエントリ配列 (元の順序を維持、limit 件で打ち切り)
 *
 * @example
 * ```ts
 * import { abbreviationEntries, searchByName } from '@shuji-bonji/houki-abbreviations';
 *
 * searchByName(abbreviationEntries, '労働');
 * // → 労基法, 労契法, 労安衛法, ...
 *
 * searchByName(abbreviationEntries, '税法', { mode: 'contains' });
 * // → 法人税法, 消費税法, 所得税法, ...
 *
 * searchByName(abbreviationEntries, '労働', {
 *   filter: { domain: 'labor' },
 *   limit: 10,
 * });
 * ```
 */
export function searchByName(
  entries: readonly AbbreviationEntry[],
  query: string,
  options: SearchOptions = {}
): AbbreviationEntry[] {
  const mode: SearchMode = options.mode ?? 'contains';
  const normalize = options.normalize ?? true;
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);

  const trimmed = query?.trim() ?? '';
  if (!trimmed) return [];
  const q = normalize ? normalizeJpText(trimmed) : trimmed;
  if (!q) return [];

  const filtered = filterEntries(entries, options.filter);
  const matched: AbbreviationEntry[] = [];
  const seenAbbr = new Set<string>();

  for (const entry of filtered) {
    if (matched.length >= limit) break;
    const candidates = [entry.abbr, entry.formal, ...(entry.aliases ?? [])];
    const hit = candidates.some((key) => {
      const k = normalize ? normalizeJpText(key) : key;
      return matchByMode(k, q, mode);
    });
    if (hit && !seenAbbr.has(entry.abbr)) {
      matched.push(entry);
      seenAbbr.add(entry.abbr);
    }
  }
  return matched;
}

/** mode に応じて文字列マッチ */
function matchByMode(haystack: string, needle: string, mode: SearchMode): boolean {
  if (!haystack || !needle) return false;
  switch (mode) {
    case 'prefix':
      return haystack.startsWith(needle);
    case 'suffix':
      return haystack.endsWith(needle);
    case 'contains':
      return haystack.includes(needle);
  }
}

/* -------------------------------------------------------------------------- */
/* FindSimilar (Levenshtein)                                                  */
/* -------------------------------------------------------------------------- */

/** findSimilar のオプション */
export interface FuzzyOptions {
  /** 最大編集距離 (デフォルト 2) */
  maxDistance?: number;
  /** 結果の最大件数 (デフォルト 5) */
  limit?: number;
  /** スコア順 (距離昇順) にソート。default true */
  sortByScore?: boolean;
  /** filter は SearchOptions と同じ */
  filter?: SearchFilter;
  /** 全角/半角の表記ゆらぎを吸収 (デフォルト true) */
  normalize?: boolean;
}

export interface FuzzyMatch {
  /** マッチしたエントリ */
  entry: AbbreviationEntry;
  /** マッチしたキー (abbr / formal / aliases のいずれか、元の生文字列) */
  matchedKey: string;
  /** 編集距離 (小さいほど近い) */
  distance: number;
}

/**
 * あいまい一致 (Levenshtein 距離ベース)。
 *
 * 各エントリの `abbr` / `formal` / `aliases` すべてについて Levenshtein 距離を
 * 計算し、`maxDistance` 以下のものを返す。距離が同じ場合は元順序を維持。
 *
 * @example
 * ```ts
 * findSimilar(abbreviationEntries, '労働基準法施行例');
 * // → [{ entry: 労基法施行令, matchedKey: '労働基準法施行令', distance: 1 }, ...]
 * ```
 */
export function findSimilar(
  entries: readonly AbbreviationEntry[],
  query: string,
  options: FuzzyOptions = {}
): FuzzyMatch[] {
  const maxDistance = options.maxDistance ?? 2;
  const limit = Math.max(options.limit ?? 5, 1);
  const sortByScore = options.sortByScore ?? true;
  const normalize = options.normalize ?? true;

  const trimmed = query?.trim() ?? '';
  if (!trimmed) return [];
  const q = normalize ? normalizeJpText(trimmed) : trimmed;
  if (!q) return [];

  const filtered = filterEntries(entries, options.filter);
  const matches: FuzzyMatch[] = [];
  const seenAbbr = new Set<string>();

  for (const entry of filtered) {
    const candidates = [entry.abbr, entry.formal, ...(entry.aliases ?? [])];
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestKey = '';
    for (const key of candidates) {
      const k = normalize ? normalizeJpText(key) : key;
      if (!k) continue;
      const d = levenshtein(q, k);
      if (d < bestDistance) {
        bestDistance = d;
        bestKey = key;
      }
      if (d === 0) break; // perfect match
    }
    if (bestDistance <= maxDistance && !seenAbbr.has(entry.abbr)) {
      matches.push({ entry, matchedKey: bestKey, distance: bestDistance });
      seenAbbr.add(entry.abbr);
    }
  }

  if (sortByScore) {
    matches.sort((a, b) => a.distance - b.distance);
  }
  return matches.slice(0, limit);
}

/**
 * 「もしかして」サジェスト。`findSimilar` の薄いラッパで、上位 N 件の
 * `formal` だけを文字列配列で返す。LLM プロンプトでそのまま使える形。
 *
 * @example
 * ```ts
 * suggestCorrection(abbreviationEntries, '労働基準法施行例');
 * // → ['労働基準法施行令']
 * ```
 */
export function suggestCorrection(
  entries: readonly AbbreviationEntry[],
  query: string,
  limit = 5
): string[] {
  const matches = findSimilar(entries, query, { limit });
  return matches.map((m) => m.entry.formal);
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/** filter を適用したエントリ配列を返す。filter なしならそのまま */
function filterEntries(
  entries: readonly AbbreviationEntry[],
  filter: SearchFilter | undefined
): readonly AbbreviationEntry[] {
  if (!filter) return entries;
  const domains = toArray(filter.domain);
  const categories = toArray(filter.category);
  const hints = toArray(filter.source_mcp_hint);
  if (domains.length === 0 && categories.length === 0 && hints.length === 0) {
    return entries;
  }
  return entries.filter((e) => {
    if (domains.length > 0 && !domains.includes(e.domain)) return false;
    if (categories.length > 0 && !categories.includes(e.category)) return false;
    if (hints.length > 0 && !hints.includes(e.source_mcp_hint)) return false;
    return true;
  });
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Levenshtein 距離 (動的計画法、O(m*n) 時間 / O(min(m,n)) 空間)。
 * 文字単位の挿入 / 削除 / 置換コストはすべて 1。
 *
 * 自前実装にした理由は外部依存を増やさないため (本パッケージは
 * 軽量データライブラリの方針なので、`fast-levenshtein` 等は引き込まない)。
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // a を短い方にする (空間効率のため)
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(m + 1);
  let curr = new Array<number>(m + 1);
  for (let i = 0; i <= m; i++) prev[i] = i;

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1, // insertion
        prev[i] + 1, // deletion
        prev[i - 1] + cost // substitution
      );
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[m];
}
