/**
 * @shuji-bonji/houki-abbreviations
 *
 * houki-hub MCP family が共有する略称辞書。
 *
 * - 略称・通称・正式名称のいずれからもエントリを引ける逆引きテーブル
 * - 各エントリは category（法律/政令/通達 等）と source_mcp_hint
 *   （管轄 MCP）を持つ
 * - JSON ファイル単位で分野ごとに分割（tax / labor / ...）
 *
 * @example
 * ```ts
 * import { resolveAbbreviation, listByDomain } from '@shuji-bonji/houki-abbreviations';
 *
 * const r = resolveAbbreviation('消法');
 * // r?.formal === '消費税法'
 * // r?.category === 'law'
 * // r?.source_mcp_hint === 'houki-egov'
 * ```
 */

import type { AbbreviationEntry, Category, Domain, SourceMcpHint } from './types.js';
import { normalizeJpText } from './normalize.js';

import tax from './data/tax.json' with { type: 'json' };
import labor from './data/labor.json' with { type: 'json' };
import accounting from './data/accounting.json' with { type: 'json' };
import commercial from './data/commercial.json' with { type: 'json' };
import civil from './data/civil.json' with { type: 'json' };
import administrative from './data/administrative.json' with { type: 'json' };

export type { AbbreviationEntry, Category, Domain, LawTypeCode, SourceMcpHint } from './types.js';
export { CATEGORIES, DOMAINS, LAW_TYPE_CODES, SOURCE_MCP_HINTS } from './types.js';
export { normalizeJpText, normalizeSearchQuery } from './normalize.js';

// v0.4.1 (Issue #15): family 共通の staleness 判定 (型 + 閾値 + 純関数のみ)
export type { StalenessLevel } from './freshness.js';
export { STALENESS_THRESHOLDS, computeDaysSince, judgeStaleness } from './freshness.js';

// v0.4.0 Track 1: search & fuzzy API
export type {
  SearchMode,
  SearchOptions,
  SearchFilter,
  FuzzyOptions,
  FuzzyMatch,
} from './search.js';
import {
  searchByName as _searchByName,
  findSimilar as _findSimilar,
  suggestCorrection as _suggestCorrection,
  levenshtein as _levenshtein,
  type SearchOptions as _SearchOptions,
  type FuzzyOptions as _FuzzyOptions,
  type FuzzyMatch as _FuzzyMatch,
} from './search.js';
export { levenshtein } from './search.js';

// v0.5.0: reverse lookup API
import {
  lookupByLawId as _lookupByLawId,
  lookupByLawNum as _lookupByLawNum,
  getAllNames as _getAllNames,
} from './lookup.js';

// v0.5.0: validation helpers
export type {
  ValidationIssue,
  ValidationReport,
  LawNameMatch,
  ExtractOptions,
} from './validate.js';
import {
  isValidLawId as _isValidLawId,
  validateAllEntries as _validateAllEntries,
  extractLawNames as _extractLawNames,
  type ExtractOptions as _ExtractOptions,
  type ValidationReport as _ValidationReport,
  type LawNameMatch as _LawNameMatch,
} from './validate.js';
export { isValidLawId } from './validate.js';

/** 全分野を結合した辞書 */
export const abbreviationEntries: readonly AbbreviationEntry[] = Object.freeze([
  ...(tax as AbbreviationEntry[]),
  ...(labor as AbbreviationEntry[]),
  ...(accounting as AbbreviationEntry[]),
  ...(commercial as AbbreviationEntry[]),
  ...(civil as AbbreviationEntry[]),
  ...(administrative as AbbreviationEntry[]),
]);

/** 略称→エントリのインデックス（abbr + formal + aliases でヒット） */
const lookupIndex: Map<string, AbbreviationEntry> = (() => {
  const m = new Map<string, AbbreviationEntry>();
  for (const entry of abbreviationEntries) {
    m.set(entry.abbr, entry);
    m.set(entry.formal, entry);
    for (const alias of entry.aliases ?? []) {
      m.set(alias, entry);
    }
  }
  return m;
})();

/**
 * 全角ゆらぎを正規化したキーで引けるインデックス（lazy 構築）。
 *
 * `resolveAbbreviation(name, { normalize: true })` で初めて要求された時点で
 * 構築される。通常の lookupIndex のキーをすべて `normalizeJpText` で
 * 正規化し直したエントリを保持する。
 *
 * 同じ正規化キーに複数のエントリがマップされる可能性は理論上あるが、
 * v0.3.0 時点の辞書では `abbr` の一意性が CI で保証されており、
 * `formal` / `aliases` も含めて衝突は確認されていない。仮に衝突した場合は
 * 先勝ち（先に登録された方が優先）の挙動となる。
 */
let normalizedLookupIndex: Map<string, AbbreviationEntry> | null = null;

function getNormalizedLookupIndex(): Map<string, AbbreviationEntry> {
  if (normalizedLookupIndex !== null) return normalizedLookupIndex;
  const m = new Map<string, AbbreviationEntry>();
  for (const entry of abbreviationEntries) {
    const keys = [entry.abbr, entry.formal, ...(entry.aliases ?? [])];
    for (const key of keys) {
      const normalized = normalizeJpText(key);
      if (!normalized) continue;
      // 先勝ち: 既に登録済みのキーは上書きしない
      if (!m.has(normalized)) {
        m.set(normalized, entry);
      }
    }
  }
  normalizedLookupIndex = m;
  return m;
}

/**
 * `resolveAbbreviation` に渡せるオプション。
 */
export interface ResolveAbbreviationOptions {
  /**
   * 全角／半角の表記ゆらぎを吸収して照合するかどうか。
   *
   * - `false`（デフォルト）: 入力を `.trim()` のみ施して完全一致照合。
   *   v0.2.0 までと同じ挙動で、後方互換性が保たれる。
   * - `true`: 入力を `normalizeJpText` で正規化したうえで、
   *   同様に正規化されたインデックスから照合する。
   *   全角ハイフン／チルダ／数字／全角 ASCII 文字／全角スペースの
   *   揺れを吸収する。**大文字小文字は保持する**ため、`PL法` と `pl法` は
   *   別物として扱われる。
   *
   * @default false
   */
  normalize?: boolean;
}

/**
 * 略称・通称・正式名称のいずれかから辞書エントリを引く。
 *
 * - 前後の空白はトリム
 * - 完全一致のみ（部分一致はしない）
 * - 見つからなければ null
 * - `options.normalize` が `true` のとき、全角／半角の表記ゆらぎを吸収する
 *
 * @param name 略称・通称・正式名称のいずれか
 * @param options 照合オプション（省略可）
 * @returns 該当エントリ、見つからなければ null
 *
 * @example
 * ```ts
 * resolveAbbreviation('消法')                         // → 消費税法
 * resolveAbbreviation('消費税法')                     // → 消費税法
 * resolveAbbreviation('消費税')                       // → 消費税法（aliases）
 * resolveAbbreviation('  消法  ')                    // → 消費税法（前後空白OK）
 * resolveAbbreviation('存在しない')                   // → null
 *
 * // 正規化モード（v0.3.0〜）
 * resolveAbbreviation('消　法', { normalize: true }); // → 消費税法（全角スペース吸収）
 * resolveAbbreviation('ＰＬ法', { normalize: true }); // → 製造物責任法（全角→半角）
 * resolveAbbreviation('ＰＬ法');                       // → null（normalize: false がデフォルト）
 * ```
 */
export function resolveAbbreviation(
  name: string,
  options?: ResolveAbbreviationOptions
): AbbreviationEntry | null {
  if (!name) return null;
  const normalize = options?.normalize ?? false;
  if (!normalize) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    return lookupIndex.get(trimmed) ?? null;
  }
  const normalized = normalizeJpText(name);
  if (!normalized) return null;
  // 先に「正規化なしのキー」で完全一致するならそれを返す（既存挙動を尊重）
  const direct = lookupIndex.get(normalized);
  if (direct) return direct;
  return getNormalizedLookupIndex().get(normalized) ?? null;
}

/**
 * 指定ドメインのエントリ一覧を返す。
 *
 * @example
 * ```ts
 * listByDomain('tax')  // → 26 件の税法系エントリ
 * ```
 */
export function listByDomain(domain: Domain): AbbreviationEntry[] {
  return abbreviationEntries.filter((e) => e.domain === domain);
}

/**
 * 指定カテゴリのエントリ一覧を返す。
 *
 * @example
 * ```ts
 * listByCategory('cabinet-order')  // → 政令系エントリ全件
 * listByCategory('constitution')   // → 日本国憲法 1件
 * ```
 */
export function listByCategory(category: Category): AbbreviationEntry[] {
  return abbreviationEntries.filter((e) => e.category === category);
}

/**
 * 指定 MCP が管轄するエントリ一覧を返す。
 *
 * 各 MCP が起動時に「自分の管轄エントリだけ」を抽出してインデックス化する
 * ことで、管轄外の問い合わせを早期に「正しい MCP に誘導するエラー」として
 * 返せるようになる。
 *
 * @example
 * ```ts
 * listBySourceMcpHint('houki-egov')  // → e-Gov 管轄全件（v0.1.0 では全件）
 * listBySourceMcpHint('houki-nta')   // → 国税庁管轄（v0.1.0 ではまだ無し）
 * ```
 */
export function listBySourceMcpHint(hint: SourceMcpHint): AbbreviationEntry[] {
  return abbreviationEntries.filter((e) => e.source_mcp_hint === hint);
}

/**
 * 辞書統計（起動時ログ・診断用）。
 *
 * @returns 全件数、ドメイン別件数、カテゴリ別件数、MCP別件数
 */
export interface AbbreviationStats {
  total: number;
  byDomain: Record<string, number>;
  byCategory: Record<string, number>;
  bySourceMcpHint: Record<string, number>;
}

export function getAbbreviationStats(): AbbreviationStats {
  const byDomain: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const bySourceMcpHint: Record<string, number> = {};
  for (const e of abbreviationEntries) {
    byDomain[e.domain] = (byDomain[e.domain] ?? 0) + 1;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    bySourceMcpHint[e.source_mcp_hint] = (bySourceMcpHint[e.source_mcp_hint] ?? 0) + 1;
  }
  return {
    total: abbreviationEntries.length,
    byDomain,
    byCategory,
    bySourceMcpHint,
  };
}

/* -------------------------------------------------------------------------- */
/* v0.4.0 Track 1: search & fuzzy API (公開ラッパ)                              */
/* -------------------------------------------------------------------------- */

/**
 * 名前で検索 (部分一致)。`abbr` / `formal` / `aliases` のどれかにマッチする
 * エントリを返す。
 *
 * @example
 * ```ts
 * import { searchByName } from '@shuji-bonji/houki-abbreviations';
 *
 * searchByName('労働');
 * // → 労基法, 労契法, 労安衛法, ...
 *
 * searchByName('税法', { mode: 'contains' });
 * // → 法人税法, 消費税法, 所得税法, ...
 *
 * searchByName('労働', { filter: { domain: 'labor' }, limit: 10 });
 * ```
 *
 * @see SearchOptions for filter / mode / limit / normalize
 */
export function searchByName(query: string, options?: _SearchOptions): AbbreviationEntry[] {
  return _searchByName(abbreviationEntries, query, options);
}

/**
 * あいまい一致 (Levenshtein 距離ベース)。「うろ覚え」入力で類似エントリを
 * 探すときに使う。
 *
 * @example
 * ```ts
 * import { findSimilar } from '@shuji-bonji/houki-abbreviations';
 *
 * findSimilar('労働基準法施行例');
 * // → [{ entry: 労基法施行令, matchedKey: '労働基準法施行令', distance: 1 }]
 * ```
 */
export function findSimilar(query: string, options?: _FuzzyOptions): _FuzzyMatch[] {
  return _findSimilar(abbreviationEntries, query, options);
}

/**
 * 「もしかして」サジェスト。`findSimilar` の薄いラッパで、上位 N 件の
 * `formal` だけを文字列配列で返す。LLM プロンプトでそのまま使える形。
 *
 * @example
 * ```ts
 * suggestCorrection('労働基準法施行例');
 * // → ['労働基準法施行令']
 * ```
 */
export function suggestCorrection(query: string, limit = 5): string[] {
  return _suggestCorrection(abbreviationEntries, query, limit);
}

/** internal helper を export (テスト・外部利用用) */
void _levenshtein;

/* -------------------------------------------------------------------------- */
/* v0.5.0: reverse lookup API (公開ラッパ)                                      */
/* -------------------------------------------------------------------------- */

/**
 * e-Gov `law_id` から辞書エントリを引く。完全一致のみ。
 *
 * @example
 * ```ts
 * import { lookupByLawId } from '@shuji-bonji/houki-abbreviations';
 *
 * lookupByLawId('363AC0000000108')?.formal;  // '消費税法'
 * lookupByLawId('321CONSTITUTION')?.formal;  // '日本国憲法'
 * lookupByLawId('999XX0000000000');          // null
 * ```
 */
export function lookupByLawId(law_id: string): AbbreviationEntry | null {
  return _lookupByLawId(abbreviationEntries, law_id);
}

/**
 * 法令番号（漢数字表記）から辞書エントリを引く。完全一致のみ。
 *
 * 漢数字↔算用数字の正規化は v0.5.0 ではサポートしない。呼び出し側で
 * 表記を揃える責務。
 *
 * @example
 * ```ts
 * import { lookupByLawNum } from '@shuji-bonji/houki-abbreviations';
 *
 * lookupByLawNum('昭和六十三年法律第百八号')?.formal;  // '消費税法'
 * lookupByLawNum('昭和63年法律第108号');                 // null（v0.5.0 では正規化なし）
 * ```
 */
export function lookupByLawNum(law_num: string): AbbreviationEntry | null {
  return _lookupByLawNum(abbreviationEntries, law_num);
}

/**
 * `abbr` / `formal` / `aliases` のいずれかから、そのエントリの
 * **全別表記** を文字列配列で返す。
 *
 * 順序は `[abbr, formal, ...aliases]`、重複は除去済み。
 *
 * @example
 * ```ts
 * import { getAllNames } from '@shuji-bonji/houki-abbreviations';
 *
 * getAllNames('消法');
 * // → ['消法', '消費税法', '消費税', 'インボイス', 'インボイス制度', ...]
 *
 * getAllNames('存在しない');
 * // → []
 * ```
 */
export function getAllNames(name: string): string[] {
  return _getAllNames(abbreviationEntries, name);
}

/* -------------------------------------------------------------------------- */
/* v0.5.0: validation helpers (公開ラッパ)                                      */
/* -------------------------------------------------------------------------- */

/**
 * 辞書全体の静的整合性をチェックする。CI 用途を想定。
 *
 * @example
 * ```ts
 * import { validateAllEntries } from '@shuji-bonji/houki-abbreviations';
 *
 * const report = validateAllEntries();
 * if (!report.valid) {
 *   console.error(report.errors);
 *   process.exit(1);
 * }
 * report.warnings.forEach((w) => console.warn(w.message));
 * ```
 */
export function validateAllEntries(): _ValidationReport {
  return _validateAllEntries(abbreviationEntries);
}

/**
 * 入力テキスト中の **法令名らしき文字列** を辞書マッチで抽出する。
 *
 * @example
 * ```ts
 * import { extractLawNames } from '@shuji-bonji/houki-abbreviations';
 *
 * extractLawNames('消費税法と法人税法の改正について。インボイス制度も対象。');
 * // → [
 * //   { entry: <消法>, matchedKey: '消費税法', position: 0, length: 4 },
 * //   { entry: <法法>, matchedKey: '法人税法', position: 5, length: 4 },
 * //   { entry: <消法>, matchedKey: 'インボイス制度', position: 17, length: 7 },
 * // ]
 * ```
 */
export function extractLawNames(text: string, options?: _ExtractOptions): _LawNameMatch[] {
  return _extractLawNames(abbreviationEntries, text, options);
}
