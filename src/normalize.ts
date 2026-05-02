/**
 * Text Normalization — @shuji-bonji/houki-abbreviations
 *
 * 日本の法令・通達テキストにおける全角／半角の表記ゆらぎを吸収するための
 * 正規化ユーティリティ。houki-hub MCP family が共通で利用する。
 *
 * ## 設計方針
 *
 * - **触らないもの**: 中黒 `・`、「共」「の」「条」「項」「章」「節」「款」、
 *   漢数字、全角ひらがな・カタカナ、半角カナ
 * - **触るもの**: 全角ハイフン `－` → `-`、全角チルダ `～`/`〜` → `~`、
 *   全角数字 `０-９` → `0-9`、全角 ASCII 文字 `Ａ-Ｚ`/`ａ-ｚ` → `A-Z`/`a-z`、
 *   全角スペース `　` → 半角
 *
 * houki-nta-mcp v0.3.0-alpha.6 で確立された Normalize-everywhere パターンを
 * 共通パッケージに昇格したもの（DB 投入と検索クエリで同じ関数を通す方針）。
 *
 * @example
 * ```ts
 * import { normalizeJpText, normalizeSearchQuery } from '@shuji-bonji/houki-abbreviations';
 *
 * normalizeJpText('１８３－２');       // → '183-2'
 * normalizeJpText('ＰＬ法');           // → 'PL法'（大文字は保持）
 * normalizeJpText('  消　法  ');      // → '消 法'（全角スペースのみ半角化）
 *
 * normalizeSearchQuery('ＰＬ法');     // → 'pl法'（さらに小文字化）
 * normalizeSearchQuery('  消   法 '); // → '消 法'（連続空白を単一化）
 * ```
 */

/**
 * 全角 → 半角 変換テーブル（数字・ASCII 文字）
 *
 * U+FF10 (０) 〜 U+FF19 (９)、U+FF21 (Ａ) 〜 U+FF3A (Ｚ)、U+FF41 (ａ) 〜 U+FF5A (ｚ)
 * を対応する ASCII にマップする。U+FF01〜U+FF5E の全角範囲のうち、
 * 数字・ASCII 文字のみを対象とし、記号（全角スラッシュ等）は範囲外として保持する。
 */
function toHalfWidthAscii(s: string): string {
  return s.replace(/[０-９Ａ-Ｚａ-ｚ]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

/**
 * 日本語テキストの全角ゆらぎを保守的に半角化する。
 *
 * 数値表記・ASCII 文字・特定記号（ハイフン、チルダ、スペース）の全角／半角
 * 表記揺れを吸収するための関数。**大文字小文字は保持する**ため、
 * 「ＰＬ法」→「PL法」のように元の casing は変わらない。
 *
 * 漢字・ひらがな・カタカナ・中黒（・）・各種句読点は変更しない。
 *
 * 入力が空文字や `null`/`undefined` 相当（`!input`）の場合は空文字を返す。
 *
 * @param input 正規化対象の文字列
 * @returns 半角化された文字列（前後の空白は trim 済み）
 *
 * @example
 * ```ts
 * normalizeJpText('１８３－２');     // '183-2'
 * normalizeJpText('183～193共-1');  // '183~193共-1'（チルダのみ半角化）
 * normalizeJpText('ＰＬ法');         // 'PL法'（大文字保持）
 * normalizeJpText('  消法  ');      // '消法'（trim）
 * normalizeJpText('消　法');         // '消 法'（全角スペース → 半角）
 * ```
 */
export function normalizeJpText(input: string): string {
  if (!input) return '';
  let s = input;
  // 全角数字・ASCII 文字 → 半角
  s = toHalfWidthAscii(s);
  // 全角ハイフン → 半角ハイフン
  s = s.replace(/－/g, '-');
  // 全角チルダ（FULLWIDTH TILDE / WAVE DASH）→ 半角チルダ
  s = s.replace(/[～〜]/g, '~');
  // 全角スペース → 半角
  s = s.replace(/　/g, ' ');
  // 前後の空白を除去
  return s.trim();
}

/**
 * 検索クエリ向けの積極的な正規化。
 *
 * `normalizeJpText` の処理に加えて以下を行う:
 * - ASCII 大文字 → 小文字（case folding）
 * - 連続する空白文字 → 単一の半角スペース
 *
 * houki-nta-mcp の FTS5 検索のように、ユーザー入力の表記ゆれを最大限
 * 吸収したいケース向け。実際の DB 検索では、本関数の出力に対して
 * さらに FTS5 用のエスケープ（`"`、`^` など）を別途行うこと。
 *
 * 注意: この関数は「`PL法`」と「`pl法`」を同一視するため、
 * `resolveAbbreviation({ normalize: true })` の内部処理では使用していない
 * （`PL法` のような大文字混じりエントリを正しく解決するため、
 * width-only の `normalizeJpText` のみを使用）。
 *
 * @param input 検索クエリ
 * @returns 正規化された検索クエリ
 *
 * @example
 * ```ts
 * normalizeSearchQuery('ＰＬ法');         // 'pl法'
 * normalizeSearchQuery(' 消    法 ');    // '消 法'（連続空白を単一化）
 * normalizeSearchQuery('１８３－２');     // '183-2'
 * ```
 */
export function normalizeSearchQuery(input: string): string {
  if (!input) return '';
  // まず保守的な正規化（width のみ）
  let s = normalizeJpText(input);
  // ASCII 大文字 → 小文字
  s = s.toLowerCase();
  // 連続する空白を単一の半角スペースへ
  s = s.replace(/\s+/g, ' ');
  return s;
}
