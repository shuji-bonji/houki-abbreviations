/**
 * Validation Helpers — v0.5.0
 *
 * 辞書データ・law_id 形式・LLM 出力テキストに対する検証ヘルパ群。
 * すべて純関数で実装し、外部 API は叩かない（CI スクリプトは別途 scripts/ 配下）。
 *
 * ## 関数一覧
 *
 * - {@link isValidLawId} — e-Gov law_id の形式判定（純粋な正規表現）
 * - {@link validateAllEntries} — 辞書全体の静的整合性チェック（CI 用）
 * - {@link extractLawNames} — 入力テキスト中の法令名を辞書マッチで抽出
 *
 * @see docs/v0.5-v0.6-design.md
 */

import type { AbbreviationEntry, Category, SourceMcpHint } from './types.js';
import { normalizeJpChars } from './normalize.js';

/* -------------------------------------------------------------------------- */
/* isValidLawId                                                               */
/* -------------------------------------------------------------------------- */

/**
 * 元号 1 桁 + 年 2 桁。元号は `1`（明治）`2`（大正）`3`（昭和）`4`（平成）`5`（令和）。
 * 年の 2 桁は 0 埋めで、値の範囲は確かめない。
 */
const ERA_YEAR = '[1-5]\\d{2}';

/**
 * 法律・政令・勅令・太政官布告・太政官達・太政官布達（15 文字: 元号 1 + 年 2 + 種別 2 + 番号 10）。
 *
 * - `AC` = Act（法律）
 * - `CO` = CabinetOrder（政令）
 * - `IO` = ImperialOrdinance（勅令）
 * - `DF` = 太政官布告（明治 5〜17 年）
 * - `DT` = 太政官達（明治 8〜16 年）
 * - `DH` = 太政官布達（公式仕様にあり、2026-10-01 の e-Gov には 0 件。v0.7.0 から）
 *
 * 番号 10 桁のうち 6〜12 桁目（閣法・議員立法・効力の区別）の値は確かめない。
 */
const LAW_ID_STANDARD = new RegExp(`^${ERA_YEAR}(AC|CO|IO|DF|DT|DH)\\d{10}$`);

/**
 * 府省令（15 文字: 元号 1 + 年 2 + `M` + 世代 1 + 府省令ビットフラグ 7 + 番号 3）。
 *
 * `M` の次の 1 文字は `1`〜`6`（府省令ビットフラグの世代）、続く 7 文字は 16 進
 * （`0-9A-F`）で、共同省令では `F` `A` `C` などが並ぶ（例 `415M60000F4A003` =
 * 平成十五年内閣府・総務省・財務省・厚生労働省・農林水産省・経済産業省・国土交通省令第三号）。
 */
const LAW_ID_MINISTERIAL = new RegExp(`^${ERA_YEAR}M[1-6][0-9A-F]{7}\\d{3}$`);

/**
 * 会計検査院規則・行政機関の規則・その他機関の規則（15 文字: 元号 1 + 年 2 + `R` +
 * 機関番号 8 + 番号 3）。機関番号は 10 進の 8 桁（公式仕様の `00000001`〜`00000019`。
 * 値の範囲は確かめない）。例 `322R00000001001`（会計検査院規則）、`326R00000002002`（海上保安庁令）。
 * v0.6.1 までは `M` と同じ 16 進 8 文字を通していたが、v0.7.0 から 10 進だけにする。
 */
const LAW_ID_RULE = new RegExp(`^${ERA_YEAR}R\\d{8}\\d{3}$`);

/** 人事院規則（`RJNJ` + 8 桁。例 `324RJNJ01001000` = 昭和二十四年人事院規則一―一） */
const LAW_ID_JINJIIN = new RegExp(`^${ERA_YEAR}RJNJ\\d{8}$`);

/** 内閣総理大臣決定（`RPMD` + 月日 4 桁 + 連番 4 桁。例 `351RPMD12230000`） */
const LAW_ID_PM_DECISION = new RegExp(`^${ERA_YEAR}RPMD\\d{8}$`);

/**
 * 憲法専用パターン。e-Gov にある憲法は昭和二十一年憲法（日本国憲法）の 1 件だけなので
 * `321CONSTITUTION` だけを受け付ける（v0.7.0 から。v0.6.1 までは先頭 3 桁を確かめなかった）。
 */
const LAW_ID_CONSTITUTION = /^321CONSTITUTION$/;

/**
 * e-Gov の `law_id` 形式が妥当かを判定する純粋関数。
 *
 * 外部 API は叩かないので「e-Gov 上で実際に存在するか」は確認しない
 * （それは CI スクリプト `scripts/verify-law-ids.mjs` の責務）。
 *
 * ## 認識する種別
 *
 * e-Gov の公式仕様（法令データ ドキュメンテーション「法令種別と法令ID」
 * https://laws.e-gov.go.jp/docs/law-data-basic/607318a-lawtypes-and-lawid/ ）に合わせた
 * 次の 6 つの形だけを受け付ける（v0.7.0、Issue #23）。長さはどれも 15 文字、英字は大文字だけ。
 * 元号の 1 桁は `1`〜`5`。件数は 2026-10-01 に e-Gov 法令 API v2 `GET /api/2/laws` で
 * 取得した全 9,570 件の内訳で、6 つの形で全件が `true` になる。
 *
 * | 形 | 件数 | 例 |
 * |---|---|---|
 * | 元号 + 年 + `AC` / `CO` / `IO` / `DF` / `DT` / `DH` + 10 桁 | 4,677 | `363AC0000000108`（消費税法） |
 * | 元号 + 年 + `M` + `1`〜`6` + 16 進 7 文字 + 3 桁 | 4,687 | `340M50000040011`（所得税法施行規則） |
 * | 元号 + 年 + `R` + 10 進 8 桁 + 3 桁 | 49 | `322R00000001001`（会計検査院規則） |
 * | 元号 + 年 + `RJNJ` + 8 桁 | 142 | `324RJNJ01001000`（人事院規則一―一） |
 * | 元号 + 年 + `RPMD` + 8 桁 | 14 | `351RPMD12230000`（内閣総理大臣決定） |
 * | `321CONSTITUTION` | 1 | 日本国憲法 |
 *
 * v0.6.1 までは元号の桁・`M` の次の桁・`R` の機関番号・`CONSTITUTION` の先頭を確かめて
 * いなかった（`000AC0000000000` `340M70000040011` `322R0000000A001` `363CONSTITUTION` も
 * `true`）。v0.5.x が受け付けていた `MO` / `RU` は e-Gov の実データに 1 件も無かったため
 * v0.6.0 で外した（省令は `M`、規則は `M` か `R` で始まる）。
 *
 * @since 0.5.0
 * @group 検証
 * @param law_id 判定対象の文字列
 * @returns 形式が妥当なら `true`、そうでなければ `false`
 *
 * @example
 * ```ts
 * isValidLawId('363AC0000000108');  // true（消費税法）
 * isValidLawId('340M50000040011');  // true（所得税法施行規則。v0.6.0 から）
 * isValidLawId('105DF0000000337');  // true（太政官布告。v0.6.0 から）
 * isValidLawId('321CONSTITUTION');  // true（日本国憲法）
 * isValidLawId('106DH0000000016');  // true（太政官布達。v0.7.0 から）
 * isValidLawId('363CONSTITUTION');  // false（v0.7.0 から。v0.6.1 では true だった）
 * isValidLawId('699AC0000000001');  // false（元号の桁は 1〜5。v0.7.0 から）
 * isValidLawId('505MO0000000020');  // false（e-Gov に無い形。v0.5.x では true だった）
 * isValidLawId('AAA');              // false
 * isValidLawId('');                 // false
 * isValidLawId(' 363AC0000000108'); // false（前後空白は呼び出し側で trim）
 * ```
 */
export function isValidLawId(law_id: string): boolean {
  if (typeof law_id !== 'string' || law_id.length === 0) return false;
  return (
    LAW_ID_STANDARD.test(law_id) ||
    LAW_ID_MINISTERIAL.test(law_id) ||
    LAW_ID_RULE.test(law_id) ||
    LAW_ID_JINJIIN.test(law_id) ||
    LAW_ID_PM_DECISION.test(law_id) ||
    LAW_ID_CONSTITUTION.test(law_id)
  );
}

/* -------------------------------------------------------------------------- */
/* validateAllEntries                                                         */
/* -------------------------------------------------------------------------- */

/**
 * 静的整合性チェックの error / warning 共通型。
 *
 * @since 0.5.0
 * @group 検証
 */
export interface ValidationIssue {
  /** 機械可読なコード（family 共通の error contract と同じ語彙を使う） */
  code: string;
  /** 人間可読な説明 */
  message: string;
  /** 該当エントリ（特定できる場合のみ） */
  entry?: AbbreviationEntry;
}

/**
 * 辞書全体の検証レポート。
 *
 * @since 0.5.0
 * @group 検証
 */
export interface ValidationReport {
  /** `errors.length === 0` のとき `true` */
  valid: boolean;
  /** 重大な不整合（CI を fail させる） */
  errors: ValidationIssue[];
  /** 軽微な不整合（CI は fail させないがログに出す） */
  warnings: ValidationIssue[];
}

/**
 * `category` と `source_mcp_hint` の整合表。
 *
 * `category` ごとに「許容される `source_mcp_hint`」の集合を持ち、整合しない
 * エントリは warning として検出する（error にはしない、3 つ目の MCP 追加時に
 * 表が更新されるまでの暫定運用のため）。
 */
const CATEGORY_HINT_MAP: Record<Category, readonly SourceMcpHint[]> = {
  constitution: ['houki-egov'],
  law: ['houki-egov'],
  'cabinet-order': ['houki-egov'],
  'imperial-ordinance': ['houki-egov'],
  'ministerial-ordinance': ['houki-egov'],
  rule: ['houki-egov'],
  'kihon-tsutatsu': ['houki-nta', 'houki-mhlw'],
  'kobetsu-tsutatsu': ['houki-nta', 'houki-mhlw'],
  'qa-jirei': ['houki-nta'],
  'tax-answer': ['houki-nta'],
  hanrei: ['houki-court'],
  saiketsu: ['houki-saiketsu'],
};

/**
 * 辞書全体の静的整合性をチェックする。
 *
 * CI で `npm run validate` のように呼ぶ想定。エントリ追加時のレビュー支援
 * （PR の事前チェック）にも使える。
 *
 * ## チェック項目
 *
 * **errors（CI fail 対象）:**
 * - `abbr` の重複
 * - 必須フィールド欠損（`abbr` / `formal` / `domain` / `category` / `source_mcp_hint`）
 * - `law_id !== null` なのに `isValidLawId` が `false`
 * - `law_id` の重複
 *
 * **warnings（CI fail させない）:**
 * - `category` × `source_mcp_hint` の不整合（`law` なのに `source_mcp_hint='houki-nta'` など）
 * - `aliases` の重複（同一エントリ内）
 * - `aliases` が他エントリの `abbr` と衝突
 *
 * @param entries 検証対象のエントリ配列
 * @returns 検証レポート
 *
 * @example
 * ```ts
 * import { abbreviationEntries, validateAllEntries } from '@shuji-bonji/houki-abbreviations';
 *
 * const report = validateAllEntries(abbreviationEntries);
 * if (!report.valid) {
 *   console.error(report.errors);
 *   process.exit(1);
 * }
 * report.warnings.forEach((w) => console.warn(w.message));
 * ```
 */
export function validateAllEntries(entries: readonly AbbreviationEntry[]): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const abbrSeen = new Map<string, AbbreviationEntry>();
  const lawIdSeen = new Map<string, AbbreviationEntry>();
  const allAbbrs = new Set<string>();
  for (const e of entries) allAbbrs.add(e.abbr);

  for (const entry of entries) {
    // 必須フィールドの欠損
    if (!entry.abbr) {
      errors.push({
        code: 'missing_required_field',
        message: 'abbr が空です',
        entry,
      });
    }
    if (!entry.formal) {
      errors.push({
        code: 'missing_required_field',
        message: `formal が空です（abbr=${entry.abbr ?? '?'}）`,
        entry,
      });
    }
    if (!entry.domain) {
      errors.push({
        code: 'missing_required_field',
        message: `domain が空です（abbr=${entry.abbr}）`,
        entry,
      });
    }
    if (!entry.category) {
      errors.push({
        code: 'missing_required_field',
        message: `category が空です（abbr=${entry.abbr}）`,
        entry,
      });
    }
    if (!entry.source_mcp_hint) {
      errors.push({
        code: 'missing_required_field',
        message: `source_mcp_hint が空です（abbr=${entry.abbr}）`,
        entry,
      });
    }

    // abbr 重複
    if (entry.abbr) {
      const prev = abbrSeen.get(entry.abbr);
      if (prev) {
        errors.push({
          code: 'duplicate_abbr',
          message: `abbr が重複しています: '${entry.abbr}'（formal: '${prev.formal}' と '${entry.formal}'）`,
          entry,
        });
      } else {
        abbrSeen.set(entry.abbr, entry);
      }
    }

    // law_id 形式不正
    if (entry.law_id !== null && entry.law_id !== undefined) {
      if (!isValidLawId(entry.law_id)) {
        errors.push({
          code: 'invalid_law_id',
          message: `law_id の形式が不正です: '${entry.law_id}'（abbr=${entry.abbr}）`,
          entry,
        });
      }
      // law_id 重複
      const prev = lawIdSeen.get(entry.law_id);
      if (prev) {
        errors.push({
          code: 'duplicate_law_id',
          message: `law_id が重複しています: '${entry.law_id}'（'${prev.abbr}' と '${entry.abbr}'）`,
          entry,
        });
      } else {
        lawIdSeen.set(entry.law_id, entry);
      }
    }

    // category × source_mcp_hint の整合（warning）
    if (entry.category && entry.source_mcp_hint) {
      const allowed = CATEGORY_HINT_MAP[entry.category];
      if (allowed && !allowed.includes(entry.source_mcp_hint)) {
        warnings.push({
          code: 'category_hint_mismatch',
          message: `category='${entry.category}' に対して source_mcp_hint='${entry.source_mcp_hint}' は想定外です（許容: ${allowed.join(', ')}）`,
          entry,
        });
      }
    }

    // aliases 重複（warning）
    if (entry.aliases && entry.aliases.length > 0) {
      const seen = new Set<string>();
      for (const alias of entry.aliases) {
        if (seen.has(alias)) {
          warnings.push({
            code: 'duplicate_alias_within_entry',
            message: `同一エントリ内で aliases が重複: '${alias}'（abbr=${entry.abbr}）`,
            entry,
          });
        }
        seen.add(alias);
        // 他エントリの abbr との衝突（自分の abbr は除外）
        if (alias !== entry.abbr && allAbbrs.has(alias)) {
          warnings.push({
            code: 'alias_collides_with_abbr',
            message: `alias '${alias}' が他エントリの abbr と衝突しています（abbr=${entry.abbr}）`,
            entry,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* extractLawNames                                                            */
/* -------------------------------------------------------------------------- */

/**
 * テキスト中の法令名抽出結果。
 *
 * @since 0.5.0
 * @group 検証
 */
export interface LawNameMatch {
  /** マッチした辞書エントリ */
  entry: AbbreviationEntry;
  /** マッチした文字列（abbr / formal / aliases のいずれかの値） */
  matchedKey: string;
  /** text 内での開始位置（0-based） */
  position: number;
  /** マッチした長さ */
  length: number;
}

/**
 * `extractLawNames` のオプション。
 *
 * @since 0.5.0
 * @group 検証
 */
export interface ExtractOptions {
  /**
   * 最小マッチ長（これより短いキーは無視）。
   *
   * デフォルト 2。「民」「税」のような 1 文字略称はノイズが多いので
   * デフォルトでは抽出対象外。1 文字も含めたい場合は `minLength: 1` を指定。
   *
   * @default 2
   */
  minLength?: number;

  /**
   * 同一エントリへのマッチを 1 件に絞るか。
   *
   * @default false
   */
  dedupe?: boolean;

  /**
   * 範囲が重なるときに長い方を優先するか。
   *
   * `true` なら、ほかの、より長い一致と 1 文字でも範囲が重なる短い一致を返さない。
   * 例: テキスト「民法等の一部を改正する法律」内に `民法` と
   * `民法等の一部を改正する法律` の両方がマッチする場合、長い方（後者）だけを返す。
   * 「消費税法法人税法」の `法法` のように、2 つの長い一致の端にまたがる短い一致も
   * 返さない（v0.7.0 から。v0.6.1 までは、すっぽり含まれる一致だけを除いていた）。
   * 長さが同じ一致どうしは、重なっていても両方返す。
   *
   * @default true
   */
  preferLonger?: boolean;

  /**
   * 全角／半角の表記ゆらぎを吸収して探すか。
   *
   * `true` なら、`text` と辞書のキーの両方を `normalizeJpText` と同じ規則で半角にしてから
   * 探す（全角英数字・ダッシュ類・全角チルダ・全角スペース）。`matchedKey` は辞書の表記の
   * まま、`position` と `length` は元の `text` の位置と長さで返す。
   * `resolveAbbreviation` の `options.normalize` と同じ意味で、既定も同じ `false`。
   * MCP サーバーは入口で `true` を渡す。
   *
   * @since 0.7.0
   * @default false
   */
  normalize?: boolean;
}

/**
 * 入力テキスト中の **法令名らしき文字列** を辞書マッチで抽出する。
 *
 * **用途**:
 * - LLM が出力したテキストに、辞書に存在する法令名が含まれているかを検出
 * - 抽出された法令の `source_mcp_hint` を使って「次に取得すべき MCP」を決める
 * - LLM の参照網羅性チェック（必要な法令を引用できているか）
 *
 * **アプローチ**: 全エントリの `abbr` / `formal` / `aliases` を検索キーとし、
 * `text.indexOf` で線形走査。データ規模が数百件程度なら実用的に高速。
 *
 * **既知の限界**: 文脈解析はしない。「民法 の解釈は…」と「民法人 の認可は…」
 * のような文脈区別は呼び出し側で行う（v0.5.0 では `民法人` 内の `民法` も
 * ヒットする可能性があるため、`preferLonger` で多少緩和される程度）。
 *
 * `options.normalize` が `true` のときは、全角英数字などを半角にしてから探す
 * （v0.7.0 から）。`position` / `length` は元の `text` の位置で返す。
 *
 * @param entries 検索対象のエントリ配列
 * @param text 抽出対象のテキスト
 * @param options 抽出オプション
 * @returns マッチ結果（`position` 昇順）
 *
 * @example
 * ```ts
 * extractLawNames(
 *   abbreviationEntries,
 *   '消費税法と法人税法の改正について。インボイス制度も対象。'
 * );
 * // → [
 * //   { entry: <消法>, matchedKey: '消費税法', position: 0, length: 4 },
 * //   { entry: <法法>, matchedKey: '法人税法', position: 5, length: 4 },
 * //   { entry: <消法>, matchedKey: 'インボイス制度', position: 17, length: 7 },
 * // ]
 * ```
 */
export function extractLawNames(
  entries: readonly AbbreviationEntry[],
  text: string,
  options: ExtractOptions = {}
): LawNameMatch[] {
  if (!text) return [];
  const minLength = Math.max(options.minLength ?? 2, 1);
  const dedupe = options.dedupe ?? false;
  const preferLonger = options.preferLonger ?? true;
  const normalize = options.normalize ?? false;

  // normalize のときは、位置を保つために前後の空白を取り除かずに半角化する
  // （どの変換も 1 文字を 1 文字に置き換えるので、位置と長さは元の text と同じ）
  const haystack = normalize ? normalizeJpChars(text) : text;

  const matches: LawNameMatch[] = [];

  for (const entry of entries) {
    const keys = [entry.abbr, entry.formal, ...(entry.aliases ?? [])];
    for (const key of keys) {
      if (!key || key.length < minLength) continue;
      const needle = normalize ? normalizeJpChars(key) : key;
      let from = 0;
      while (from <= haystack.length) {
        const pos = haystack.indexOf(needle, from);
        if (pos < 0) break;
        matches.push({
          entry,
          matchedKey: key,
          position: pos,
          length: key.length,
        });
        from = pos + key.length; // overlap は許容、ただし同一マッチを 2 度返さない
      }
    }
  }

  // position 昇順、同位置なら長い方を先に
  matches.sort((a, b) => a.position - b.position || b.length - a.length);

  let result = matches;
  if (preferLonger) {
    result = removeOverlappedByLonger(result);
  }
  if (dedupe) {
    const seen = new Set<string>();
    result = result.filter((m) => {
      if (seen.has(m.entry.abbr)) return false;
      seen.add(m.entry.abbr);
      return true;
    });
  }
  return result;
}

/**
 * 「ほかの、より長いマッチと範囲が 1 文字でも重なるマッチ」を除去。
 * 例: `民法` が `民法等の一部を改正する法律` に含まれるなら短い方を捨てる。
 * `消費税法法人税法` の `法法`（位置 3）は `消費税法`（0〜4）と `法人税法`（4〜8）の
 * 端にまたがるので捨てる。長さが同じマッチどうしは重なっていても両方残す。
 */
function removeOverlappedByLonger(matches: LawNameMatch[]): LawNameMatch[] {
  const result: LawNameMatch[] = [];
  for (const m of matches) {
    const mEnd = m.position + m.length;
    const overlapped = matches.some((other) => {
      if (other === m || other.length <= m.length) return false;
      const oEnd = other.position + other.length;
      return other.position < mEnd && m.position < oEnd;
    });
    if (!overlapped) result.push(m);
  }
  return result;
}
