/**
 * Public Types — @shuji-bonji/houki-abbreviations
 *
 * houki-hub MCP family が共有する辞書エントリの型定義。
 *
 * - 既存 houki-hub-mcp の AbbreviationEntry と互換を保ちつつ、
 *   Architecture E で必要となる category / source_mcp_hint を追加。
 */

/** e-Gov law_id の種別プレフィックス */
export const LAW_TYPE_CODES = {
  Act: 'AC',
  CabinetOrder: 'CO',
  ImperialOrdinance: 'IO',
  MinisterialOrdinance: 'MO',
  Rule: 'RU',
} as const;

export type LawTypeCode = keyof typeof LAW_TYPE_CODES;

/** ドメインタグ（実務分野での分類） */
export const DOMAINS = [
  'tax',
  'labor',
  'accounting',
  'commercial',
  'civil',
  'administrative',
] as const;

export type Domain = (typeof DOMAINS)[number];

/**
 * 法令カテゴリ — どの種類のテキスト（法律本体・通達・判例など）を指すか。
 *
 * - 'constitution' / 'law' / 'cabinet-order' / 'imperial-ordinance' /
 *   'ministerial-ordinance' / 'rule' は e-Gov 配下（houki-egov-mcp）。
 * - 'kihon-tsutatsu' / 'kobetsu-tsutatsu' / 'qa-jirei' / 'tax-answer' は
 *   各省庁公式サイト配下（houki-nta-mcp 等）。
 * - 'hanrei' / 'saiketsu' は判例・裁決系。
 */
export const CATEGORIES = [
  'constitution',
  'law',
  'cabinet-order',
  'imperial-ordinance',
  'ministerial-ordinance',
  'rule',
  'kihon-tsutatsu',
  'kobetsu-tsutatsu',
  'qa-jirei',
  'tax-answer',
  'hanrei',
  'saiketsu',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * 参照すべき MCP のヒント。
 *
 * houki ファミリーの各 MCP が、自分の管轄外エントリを LLM に「正しい MCP に
 * 誘導する」ために使う。
 *
 * - 'houki-egov': e-Gov 法令API (法律・政令・省令・規則・告示)
 * - 'houki-nta': 国税庁通達・Q&A・タックスアンサー
 * - 'houki-mhlw': 厚労省通達・通知
 * - 'houki-jaish': 労災（労働安全衛生総合研究所）
 * - 'houki-court': 判例（裁判所サイト）
 * - 'houki-saiketsu': 国税不服審判所裁決
 */
export const SOURCE_MCP_HINTS = [
  'houki-egov',
  'houki-nta',
  'houki-mhlw',
  'houki-jaish',
  'houki-court',
  'houki-saiketsu',
] as const;

export type SourceMcpHint = (typeof SOURCE_MCP_HINTS)[number];

/**
 * 略称辞書エントリ
 *
 * 1 件 = 1 つの法令／通達／判例 等のメタ情報。
 * 複数の略称・通称・正式名称から逆引きするための共通テーブル。
 *
 * ## freshness は持たない
 *
 * 本エントリは **静的なメタ情報のみ** を保持する。「いつ取得したか」という
 * 運用状態（`fetched_at` 等）は各 MCP のローカル DB / キャッシュ側で管理し、
 * 判定は `freshness` モジュール（`judgeStaleness` / `computeDaysSince`）で
 * 行う。詳細は [`src/freshness.ts`](./freshness.ts) のヘッダ JSDoc を参照。
 */
export interface AbbreviationEntry {
  /** 略称・通称。例: "消法", "民" */
  abbr: string;

  /** 正式名称。例: "消費税法", "民法" */
  formal: string;

  /** e-Gov law_id。verified 済みのもののみ格納。未確認・該当なしは null */
  law_id: string | null;

  /** 法令番号。例: "昭和六十三年法律第百八号" */
  law_num?: string;

  /**
   * e-Gov の法令種別コード。法令系のみ持つ。
   *
   * @deprecated 将来は category の方が表現力が高いため、こちらに集約予定。
   *             v0.1.x では後方互換として残す。
   */
  law_type?: LawTypeCode;

  /** 分野タグ（実務分野での分類） */
  domain: Domain;

  /**
   * 法令カテゴリ。どの種類のテキストか（法律本体・通達・判例 等）。
   *
   * v0.1.0 では「法律 / 政令 / 省令 / 規則 / 憲法」のみ実エントリあり。
   * 'kihon-tsutatsu' 以降は houki-nta-mcp 開発時に追加される。
   */
  category: Category;

  /**
   * 参照すべき MCP のヒント。
   *
   * このエントリを LLM が引いたとき、どの MCP に対してさらに本文取得を
   * 依頼すべきかを示す。各 MCP は自分の hint と一致しないエントリに対して
   * 「管轄外」と判定し、正しい MCP に誘導する。
   */
  source_mcp_hint: SourceMcpHint;

  /** 同義の別表記。略称・通称・英語名など */
  aliases?: string[];

  /** 備考（例: "通称: 電子帳簿保存法"） */
  note?: string;
}
