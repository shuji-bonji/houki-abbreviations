/**
 * Reverse Lookup API — v0.5.0
 *
 * `resolveAbbreviation` は `abbr` / `formal` / `aliases` のいずれからも引けるが、
 * 法令固有の識別子（`law_id` / `law_num`）からの逆引きはサポートしていない。
 * 本モジュールはその不足を埋め、また 1 エントリの「全別表記列挙」も提供する。
 *
 * ## 関数一覧
 *
 * - {@link lookupByLawId} — e-Gov law_id から entry を引く
 * - {@link lookupByLawNum} — 法令番号（漢数字）から entry を引く
 * - {@link getAllNames} — abbr/formal/aliases いずれかから「全別表記」を返す
 *
 * すべての関数は `entries` を第一引数に取る純関数として実装し、
 * `index.ts` 側で `abbreviationEntries` を埋めた公開ラッパを提供する。
 *
 * ## 性能
 *
 * 現状の辞書サイズ（数百件）では線形走査で十分高速。Map インデックス化は
 * `index.ts` の公開ラッパ側で必要になったら lazy 構築する方針（`searchByName`
 * と同じパターン）。
 *
 * @see docs/v0.5-v0.6-design.md
 */

import type { AbbreviationEntry } from './types.js';

/**
 * e-Gov `law_id` から辞書エントリを引く。完全一致のみ（大小区別あり）。
 *
 * `entry.law_id !== null` のエントリのみが対象。`null` のエントリは
 * 検索対象外（仕様上 `law_id` が確定していないため）。
 *
 * @param entries 検索対象のエントリ配列
 * @param law_id e-Gov の law_id（例: '363AC0000000108'）
 * @returns 該当エントリ、見つからなければ `null`
 *
 * @example
 * ```ts
 * import { abbreviationEntries, lookupByLawId } from '@shuji-bonji/houki-abbreviations';
 *
 * lookupByLawId(abbreviationEntries, '363AC0000000108')?.formal;  // '消費税法'
 * lookupByLawId(abbreviationEntries, '321CONSTITUTION')?.formal;  // '日本国憲法'
 * lookupByLawId(abbreviationEntries, '999XX0000000000');          // null
 * ```
 */
export function lookupByLawId(
  entries: readonly AbbreviationEntry[],
  law_id: string
): AbbreviationEntry | null {
  if (!law_id) return null;
  const trimmed = law_id.trim();
  if (!trimmed) return null;
  for (const entry of entries) {
    if (entry.law_id === trimmed) return entry;
  }
  return null;
}

/**
 * 法令番号（漢数字表記）から辞書エントリを引く。完全一致のみ。
 *
 * v0.5.0 では漢数字↔算用数字の正規化はサポートしない（呼び出し側で
 * 表記を揃える責務）。将来 `normalizeLawNum` を追加した際に拡張予定。
 *
 * `entry.law_num !== undefined` のエントリのみが対象。
 *
 * @param entries 検索対象のエントリ配列
 * @param law_num 法令番号（例: '昭和六十三年法律第百八号'）
 * @returns 該当エントリ、見つからなければ `null`
 *
 * @example
 * ```ts
 * lookupByLawNum(abbreviationEntries, '昭和六十三年法律第百八号')?.formal;
 * // → '消費税法'
 *
 * lookupByLawNum(abbreviationEntries, '昭和63年法律第108号');
 * // → null（v0.5.0 では漢数字正規化なし）
 * ```
 */
export function lookupByLawNum(
  entries: readonly AbbreviationEntry[],
  law_num: string
): AbbreviationEntry | null {
  if (!law_num) return null;
  const trimmed = law_num.trim();
  if (!trimmed) return null;
  for (const entry of entries) {
    if (entry.law_num === trimmed) return entry;
  }
  return null;
}

/**
 * 任意の `abbr` / `formal` / `aliases` から、そのエントリの **全別表記**
 * を文字列配列で返す。
 *
 * 重複は除去し、順序は `[abbr, formal, ...aliases]` を維持。エントリが
 * 見つからなければ空配列（`null` ではなく `[]`、配列演算をそのまま続けられる）。
 *
 * **用途**: LLM プロンプトで「この法令の全表記」を列挙するシナリオ。
 * 例: 「消費税法は『消法』『インボイス制度』『軽減税率』などの呼称でも
 * 参照される」と LLM に伝える前段。
 *
 * @param entries 検索対象のエントリ配列
 * @param name 略称・正式名・別名のいずれか
 * @returns そのエントリの全別表記。見つからなければ `[]`
 *
 * @example
 * ```ts
 * getAllNames(abbreviationEntries, '消法');
 * // → ['消法', '消費税法', '消費税', 'インボイス', 'インボイス制度', ...]
 *
 * getAllNames(abbreviationEntries, '消費税法');
 * // → 上と同じ（formal から引いても同じエントリにヒット）
 *
 * getAllNames(abbreviationEntries, '存在しない');
 * // → []
 * ```
 */
export function getAllNames(entries: readonly AbbreviationEntry[], name: string): string[] {
  if (!name) return [];
  const trimmed = name.trim();
  if (!trimmed) return [];

  for (const entry of entries) {
    if (entry.abbr === trimmed || entry.formal === trimmed) {
      return collectNames(entry);
    }
    if (entry.aliases?.includes(trimmed)) {
      return collectNames(entry);
    }
  }
  return [];
}

/** abbr + formal + aliases を重複除去して配列化（順序維持） */
function collectNames(entry: AbbreviationEntry): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const push = (s: string | undefined) => {
    if (!s || seen.has(s)) return;
    seen.add(s);
    result.push(s);
  };
  push(entry.abbr);
  push(entry.formal);
  for (const alias of entry.aliases ?? []) {
    push(alias);
  }
  return result;
}
