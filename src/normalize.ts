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
 * - **触るもの**: ダッシュ類 `－` `‐` `‑` `–` `—` `―` `−` → `-`、
 *   全角チルダ `～`/`〜` → `~`、全角数字 `０-９` → `0-9`、
 *   全角 ASCII 文字 `Ａ-Ｚ`/`ａ-ｚ` → `A-Z`/`a-z`、全角スペース `　` → 半角
 *   （罫線 `─` と長音 `ー` はダッシュ類に含めない）
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
 * ダッシュ類。全角ハイフン `－`（U+FF0D）、`‐`（U+2010）、`‑`（U+2011）、`–`（U+2013）、
 * `—`（U+2014）、`―`（U+2015）、`−`（U+2212）。`normalizeJpText` と `normalizeLawNum` で
 * 同じ範囲を `-`（U+002D）にする。罫線 `─`（U+2500）と長音 `ー`（U+30FC）は含めない。
 */
const DASH_LIKE = /[－‐‑–—―−]/g;

/**
 * `normalizeJpText` の変換のうち、前後の空白を取り除く手前まで（1 文字を 1 文字に置き換える
 * 変換だけ）を行う。文字数と位置が変わらないので、`extractLawNames` の `normalize` のように
 * 元の文字列の位置を保ちたいときに使う（パッケージの外には出さない）。
 *
 * @internal
 */
export function normalizeJpChars(input: string): string {
  if (!input) return '';
  let s = input;
  // 全角数字・ASCII 文字 → 半角
  s = toHalfWidthAscii(s);
  // ダッシュ類 → 半角ハイフン
  s = s.replace(DASH_LIKE, '-');
  // 全角チルダ（FULLWIDTH TILDE / WAVE DASH）→ 半角チルダ
  s = s.replace(/[～〜]/g, '~');
  // 全角スペース → 半角
  s = s.replace(/　/g, ' ');
  return s;
}

/**
 * 日本語テキストの全角ゆらぎを保守的に半角化する。
 *
 * 数値表記・ASCII 文字・特定記号（ダッシュ類、チルダ、スペース）の全角／半角
 * 表記揺れを吸収するための関数。**大文字小文字は保持する**ため、
 * 「ＰＬ法」→「PL法」のように元の casing は変わらない。
 * ダッシュ類は `－` `‐` `‑` `–` `—` `―` `−` の 7 文字を `-` にする（v0.7.0 から。
 * v0.6.1 までは全角ハイフン `－` だけだった）。罫線 `─` と長音 `ー` は変えない。
 *
 * 漢字・ひらがな・カタカナ・中黒（・）・各種句読点は変更しない。どの変換も
 * 1 文字を 1 文字に置き換えるので、文字数が変わるのは前後の空白を取り除くときだけ。
 *
 * 入力が空文字や `null`/`undefined` 相当（`!input`）の場合は空文字を返す。
 *
 * @since 0.3.0
 * @group 表記の正規化
 * @param input 正規化対象の文字列
 * @returns 半角化された文字列（前後の空白は trim 済み）
 *
 * @example
 * ```ts
 * normalizeJpText('１８３－２');     // '183-2'
 * normalizeJpText('１８３―２');     // '183-2'（U+2015 などのダッシュ類も。v0.7.0 から）
 * normalizeJpText('183～193共-1');  // '183~193共-1'（チルダのみ半角化）
 * normalizeJpText('ＰＬ法');         // 'PL法'（大文字保持）
 * normalizeJpText('  消法  ');      // '消法'（trim）
 * normalizeJpText('消　法');         // '消 法'（全角スペース → 半角）
 * ```
 */
export function normalizeJpText(input: string): string {
  if (!input) return '';
  // 前後の空白を除去
  return normalizeJpChars(input).trim();
}

/**
 * 検索クエリ向けの積極的な正規化。
 *
 * `normalizeJpText` の処理に加えて以下を行う:
 * - ASCII 大文字 `A`〜`Z` → 小文字（全角の `Ａ`〜`Ｚ` は半角にしたうえで小文字）。
 *   小文字にするのはこの 52 字だけで、ローマ数字 `Ⅰ`・ギリシャ文字 `Α`・`À` などは
 *   変えない（v0.7.0 から。v0.6.1 までは `toLowerCase` で英字以外も小文字にしていた）
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
 * @since 0.3.0
 * @group 表記の正規化
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
  // ASCII 大文字 → 小文字（A〜Z だけ。表に無い文字は変えない）
  s = s.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
  // 連続する空白を単一の半角スペースへ
  s = s.replace(/\s+/g, ' ');
  return s;
}

/* -------------------------------------------------------------------------- */
/* 漢数字 → 算用数字（v0.6.0、Issue #6）                                       */
/* -------------------------------------------------------------------------- */

const KANJI_DIGITS: Readonly<Record<string, number>> = {
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const KANJI_UNITS: Readonly<Record<string, number>> = { 十: 10, 百: 100, 千: 1000 };

/** 全体が漢数字だけでできているか */
const KANJI_NUMERAL_ONLY = /^[〇一二三四五六七八九十百千]+$/;

/**
 * 位ごとの書き方で読む文字数の上限。`number` で正確に表せる 15 桁まで
 * （`Number.MAX_SAFE_INTEGER` は 16 桁の 9007199254740991）。16 文字以上は `null`。
 */
const MAX_POSITIONAL_DIGITS = 15;

/**
 * `normalizeLawNum` で算用数字にする漢数字の並び。年・番号の位置にあるものだけ:
 * 直前が `第` か `-`、または直後が `年` `号` `-`（`-` は `normalizeJpChars` で揃えた後のダッシュ）。
 * 地名や語の一部（`千葉県` `一般`）の漢数字は変えない（v0.7.0 から）。
 */
const KANJI_NUMERAL_AT_NUMBER_POSITION =
  /(?<=[第-])[〇一二三四五六七八九十百千]+|[〇一二三四五六七八九十百千]+(?=[年号-])/g;

/**
 * 漢数字を数値にする。
 *
 * 次の 2 つの書き方を受け付ける。どちらとも読めない並びは `null`。
 *
 * - **位取り**（単位 十・百・千 を使う書き方）: `三十` → 30、`百八` → 108、
 *   `千五十` → 1050、`一千` → 1000。千の位までを扱い、万以上は対象にしない。
 *   `三三`（数字が続く）や `十十`（位が下がらない）は `null`。
 * - **位ごと**（算用数字と同じく 1 桁ずつ並べる書き方。単位を含まず、`〇` を使える）:
 *   `二五` → 25、`一三七` → 137、`三〇` → 30。人事院規則の番号（`一四―五`）や
 *   判例の引用（`昭二五・一〇・二五`）がこの書き方。
 *
 * 2 つの書き方が混ざった並び（`二〇十`）は `null`。1 文字（`五`）はどちらの
 * 読み方でも同じ値になる。位ごとの書き方は 15 文字まで読み、16 文字以上は値を
 * 正確に表せないので丸めずに `null` を返す（v0.7.0 から）。
 *
 * houki-egov-mcp v0.7.0 の `kanjiToNumber`（条番号用。位取りのみ）と同じ名前で、
 * 位取りの読み方はそちらと同じ結果を返す。位ごとの書き方を受け付ける点だけが違う。
 *
 * @since 0.6.0
 * @group 表記の正規化
 * @param input 漢数字だけの文字列
 * @returns 数値。漢数字として読めなければ `null`
 *
 * @example
 * ```ts
 * kanjiToNumber('二十五');   // 25
 * kanjiToNumber('百三十七'); // 137
 * kanjiToNumber('二五');     // 25（位ごと）
 * kanjiToNumber('一三七');   // 137（位ごと）
 * kanjiToNumber('元');       // null（「元年」は normalizeLawNum が扱う）
 * kanjiToNumber('25');       // null（算用数字は対象外）
 * ```
 */
export function kanjiToNumber(input: string): number | null {
  if (typeof input !== 'string' || !KANJI_NUMERAL_ONLY.test(input)) return null;

  const hasUnit = /[十百千]/.test(input);
  if (!hasUnit) {
    // 位ごとの書き方: 1 文字ずつ桁として並べる。16 文字以上は丸めずに null
    if (input.length > MAX_POSITIONAL_DIGITS) return null;
    let n = 0;
    for (const ch of input) {
      n = n * 10 + KANJI_DIGITS[ch];
    }
    return n;
  }

  // 位取りの書き方
  if (input.includes('〇')) return null; // 位取りに 〇 は現れない
  let total = 0;
  let current = 0;
  let lastUnit = Number.POSITIVE_INFINITY;
  for (const ch of input) {
    const digit = KANJI_DIGITS[ch];
    if (digit !== undefined) {
      if (current !== 0) return null; // 「三三十」のように数字が続く
      current = digit;
      continue;
    }
    const unit = KANJI_UNITS[ch];
    if (unit >= lastUnit) return null; // 「十十」「五百百」のように位が下がらない
    total += (current === 0 ? 1 : current) * unit;
    current = 0;
    lastUnit = unit;
  }
  return total + current;
}

/**
 * 法令番号の表記を、照合に使える 1 つの形に揃える。
 *
 * `昭和二十五年法律第百三十七号` と `昭和25年法律第137号` と `昭和２５年法律第１３７号`
 * を同じ文字列（`昭和25年法律第137号`）にする。`lookupByLawNum` はこの関数を
 * 入力と辞書の両方に通してから比較する（Normalize-everywhere）。
 *
 * 行うこと:
 *
 * 1. `normalizeJpText` と同じ全角 → 半角の変換（数字・英字・ダッシュ類 `―` `－` `‐` `‑` `–` `—` `−`
 *    → `-`・チルダ・空白）。人事院規則の `一―一` のダッシュもここで `-` になる
 * 2. 空白をすべて取り除く（`昭和25年 法律 第137号` → `昭和25年法律第137号`）
 * 3. `元年` → `1年`（`令和元年` → `令和1年`）
 * 4. 年・番号の位置にある漢数字の並びを算用数字にする（{@link kanjiToNumber}。位取りと
 *    位ごとの両方）。対象は直後が `年` か `号`、直前が `第`、直前か直後が `-` のどれかに
 *    当たる並びだけで、地名や語の一部の漢数字（`千葉県` `一般`）は変えない（v0.7.0 から。
 *    v0.6.1 までは `千葉県` → `1000葉県` になっていた）。読めない並びはそのまま残す
 * 5. 算用数字の先頭の 0 を取る（`第0137号` → `第137号`）。桁数の上限は無く、数値に
 *    変換して丸めることはしない（v0.7.0 から）
 *
 * 行わないこと: 元号の別表記（`S25` / `昭25`）、`第` や `号` の有無の吸収、
 * 法令の種別名（`法律` / `政令`）の補完。これらは表記の揺れではなく別の書き方なので、
 * 呼び出し側で揃える。
 *
 * 入力が空文字や `null`/`undefined` 相当（`!input`）の場合は空文字を返す。
 *
 * @since 0.6.0
 * @group 表記の正規化
 * @param input 法令番号（漢数字・算用数字・全角数字のいずれでも）
 * @returns 算用数字に揃えた法令番号
 *
 * @example
 * ```ts
 * normalizeLawNum('昭和二十五年法律第百三十七号'); // '昭和25年法律第137号'
 * normalizeLawNum('昭和25年法律第137号');         // '昭和25年法律第137号'
 * normalizeLawNum('昭和２５年法律第１３７号');     // '昭和25年法律第137号'
 * normalizeLawNum('昭和二五年法律第一三七号');     // '昭和25年法律第137号'（位ごとの漢数字）
 * normalizeLawNum('令和元年法律第一号');           // '令和1年法律第1号'
 * normalizeLawNum('昭和二十四年人事院規則一―一'); // '昭和24年人事院規則1-1'
 * normalizeLawNum('昭和二十一年憲法');             // '昭和21年憲法'
 * ```
 */
export function normalizeLawNum(input: string): string {
  if (!input) return '';
  let s = normalizeJpText(input);
  s = s.replace(/\s+/g, '');
  s = s.replace(/元年/g, '1年');
  s = s.replace(KANJI_NUMERAL_AT_NUMBER_POSITION, (run) => {
    const n = kanjiToNumber(run);
    return n === null ? run : String(n);
  });
  // 先頭の 0 を文字列の操作で取る（数値を経由しないので桁数によらず丸めない）
  s = s.replace(/\d+/g, (digits) => digits.replace(/^0+(?=\d)/, ''));
  return s;
}
