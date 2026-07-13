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

/* -------------------------------------------------------------------------- */
/* isValidLawId                                                               */
/* -------------------------------------------------------------------------- */

/**
 * e-Gov の標準 law_id パターン（15 文字: 元号1+年2+種別2+連番10）。
 *
 * 種別コード:
 * - `AC` = Act（法律）
 * - `CO` = CabinetOrder（政令）
 * - `IO` = ImperialOrdinance（勅令）
 * - `MO` = MinisterialOrdinance（省令）
 * - `RU` = Rule（規則）
 */
const LAW_ID_STANDARD = /^\d{3}(AC|CO|IO|MO|RU)\d{10}$/;

/** 憲法専用パターン（`321CONSTITUTION`） */
const LAW_ID_CONSTITUTION = /^\d{3}CONSTITUTION$/;

/**
 * e-Gov の `law_id` 形式が妥当かを判定する純粋関数。
 *
 * 外部 API は叩かないので「e-Gov 上で実際に存在するか」は確認しない
 * （それは CI スクリプト `scripts/verify-law-ids.mjs` の責務）。
 *
 * ## 認識する種別
 *
 * 現時点で本パッケージの辞書に実エントリが存在する種別のみ厳格に判定する:
 *
 * - 標準: `AC` / `CO` / `IO` / `MO` / `RU`（15 文字）
 * - 憲法: `CONSTITUTION`（15 文字）
 *
 * e-Gov の bulk data には他の種別コード（例: `DF` 系、`M\d{2}` 形式の省令系
 * など）も存在することが確認されているが、**正確な仕様未確定** のため
 * v0.5.0 では未対応。新種別の law_id を持つエントリを辞書に追加する場合は、
 * 本パッケージ側でパターンを拡張するまで `validateAllEntries` が
 * `invalid_law_id` error を返すので注意。
 *
 * 将来 v0.6.x で e-Gov 全種別の正確な仕様確認後に対応予定。
 *
 * @param law_id 判定対象の文字列
 * @returns 形式が妥当なら `true`、そうでなければ `false`
 *
 * @example
 * ```ts
 * isValidLawId('363AC0000000108');  // true（消費税法）
 * isValidLawId('321CONSTITUTION');  // true（日本国憲法）
 * isValidLawId('AAA');              // false
 * isValidLawId('');                 // false
 * isValidLawId(' 363AC0000000108'); // false（前後空白は呼び出し側で trim）
 *
 * // 未対応の種別（v0.5.0 では false が返る）
 * isValidLawId('105DF0000000337');  // false（DF 種別は未対応）
 * ```
 */
export function isValidLawId(law_id: string): boolean {
  if (typeof law_id !== 'string' || law_id.length === 0) return false;
  return LAW_ID_STANDARD.test(law_id) || LAW_ID_CONSTITUTION.test(law_id);
}

/* -------------------------------------------------------------------------- */
/* validateAllEntries                                                         */
/* -------------------------------------------------------------------------- */

/**
 * 静的整合性チェックの error / warning 共通型。
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
   * 部分包含時に長い方を優先するか。
   *
   * 例: テキスト「民法等の一部を改正する法律」内に `民法` と
   * `民法等の一部を改正する法律` の両方がマッチする場合、`true` なら
   * 長い方（後者）だけを返す。
   *
   * @default true
   */
  preferLonger?: boolean;
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

  const matches: LawNameMatch[] = [];

  for (const entry of entries) {
    const keys = [entry.abbr, entry.formal, ...(entry.aliases ?? [])];
    for (const key of keys) {
      if (!key || key.length < minLength) continue;
      let from = 0;
      while (from <= text.length) {
        const pos = text.indexOf(key, from);
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
    result = removeContained(result);
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
 * 「他のマッチに完全に包含されるマッチ」を除去。
 * 例: `民法` が `民法等の一部を改正する法律` に位置・範囲ともに包含されるなら、
 * 短い方を捨てる。
 */
function removeContained(matches: LawNameMatch[]): LawNameMatch[] {
  const result: LawNameMatch[] = [];
  for (const m of matches) {
    const mEnd = m.position + m.length;
    const isContained = matches.some((other) => {
      if (other === m) return false;
      const oEnd = other.position + other.length;
      // m が other に厳密に含まれる（other の方が長い）
      return other.position <= m.position && oEnd >= mEnd && other.length > m.length;
    });
    if (!isContained) result.push(m);
  }
  return result;
}
