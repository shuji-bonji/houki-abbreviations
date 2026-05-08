# @shuji-bonji/houki-abbreviations

> 日本の法令略称・通称の共有辞書。houki-hub MCP family が共通で利用する基盤パッケージ。

[![CI](https://github.com/shuji-bonji/houki-abbreviations/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/houki-abbreviations/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@shuji-bonji/houki-abbreviations.svg)](https://www.npmjs.com/package/@shuji-bonji/houki-abbreviations)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 何のパッケージか

日本の法令には「消法」「労基法」「電帳法」のような**略称**と、「電子帳簿保存法」のような**通称**があります。条文を参照したい LLM や MCP は、ユーザーがどの呼称で入力しても正式名称・e-Gov law_id に解決できる必要があります。

このパッケージは、houki-hub MCP family（`houki-egov-mcp`、`houki-nta-mcp`、`houki-mhlw-mcp` 等）が**共通で参照する辞書層**です。各 MCP が独自に同じデータを持たないように、ここに一元化しています。

```mermaid
graph TB
    subgraph "houki-hub MCP family"
        Egov[houki-egov-mcp]
        NTA[houki-nta-mcp]
        MHLW[houki-mhlw-mcp]
    end

    Abbr["@shuji-bonji/houki-abbreviations<br/>略称辞書"]

    Egov --> Abbr
    NTA --> Abbr
    MHLW --> Abbr

    style Abbr fill:#fff4d6
```

## 収録範囲（v0.2.0 時点）

- **174 エントリ**（6 分野）
- **法律・政令・省令・規則・憲法**（e-Gov 法令 API 配下、`source_mcp_hint='houki-egov'`）
- **基本通達 8 件＋個別通達 1 件**（v0.2.0 追加分、`source_mcp_hint='houki-nta'`）

| 分野 | 件数 | 例 |
|---|---|---|
| tax | 35 | 所法、消法、電帳法、消基通、所基通、電帳法取通 |
| labor | 28 | 労基法、安衛法、フリーランス新法 |
| accounting | 9 | 公認会計士法、会計士法 |
| commercial | 31 | 会社、商法、電子署名法、資金決済法 |
| civil | 23 | 民、民訴法、不動産登記法 |
| administrative | 48 | 憲法、行手法、個情法、プロ責法 |

## インストール

```sh
npm install @shuji-bonji/houki-abbreviations
```

## 使い方

```ts
import {
  resolveAbbreviation,
  listByDomain,
  listByCategory,
  listBySourceMcpHint,
  getAbbreviationStats,
} from '@shuji-bonji/houki-abbreviations';

// 略称・通称・正式名称のいずれからもエントリを引ける
const r = resolveAbbreviation('消法');
// {
//   abbr: '消法',
//   formal: '消費税法',
//   law_id: '363AC0000000108',
//   law_num: '昭和六十三年法律第百八号',
//   law_type: 'Act',
//   domain: 'tax',
//   category: 'law',
//   source_mcp_hint: 'houki-egov',
//   aliases: ['消費税']
// }

// 通称・aliases でも引ける
resolveAbbreviation('電子帳簿保存法')?.abbr;  // '電帳法'
resolveAbbreviation('PL法')?.formal;          // '製造物責任法'

// 分野別・カテゴリ別・MCP 別の一覧
listByDomain('tax');                  // 26 件
listByCategory('cabinet-order');      // 政令系
listBySourceMcpHint('houki-egov');    // e-Gov 管轄全件

// 統計
getAbbreviationStats();
// { total: 174, byDomain: {...}, byCategory: {...}, bySourceMcpHint: {...} }
```

### 正規化 API（v0.3.0〜）

ユーザー入力に全角／半角の表記揺れがあっても照合できるようにする正規化ユーティリティ群です。houki-hub MCP family 全体で同じ正規化ルールを使うことで、検索・解決の挙動を統一できます。

```ts
import {
  normalizeJpText,
  normalizeSearchQuery,
  resolveAbbreviation,
} from '@shuji-bonji/houki-abbreviations';

// 全角ゆらぎを保守的に半角化（大文字小文字は保持）
normalizeJpText('１８３－２');     // '183-2'
normalizeJpText('ＰＬ法');         // 'PL法'
normalizeJpText('消　法');         // '消 法'

// 検索クエリ向けの積極的な正規化（さらに小文字化＋空白畳み込み）
normalizeSearchQuery('ＰＬ法');     // 'pl法'
normalizeSearchQuery(' 消    法 '); // '消 法'

// resolveAbbreviation の normalize オプション（デフォルト OFF で後方互換）
resolveAbbreviation('ＰＬ法', { normalize: true })?.formal;
// '製造物責任法'（全角→半角を吸収）

resolveAbbreviation('消　法', { normalize: true })?.formal;
// '消費税法'（全角スペースを吸収）

resolveAbbreviation('ＰＬ法');  // null（normalize: false がデフォルト）
```

正規化ルールは [houki-nta-mcp の Normalize-everywhere パターン](https://github.com/shuji-bonji/houki-nta-mcp) と同じで、漢字・ひらがな・カタカナ・中黒（`・`）は変更しません。詳細は [`src/normalize.ts`](src/normalize.ts) のドキュメントを参照。

## API

### `resolveAbbreviation(name: string, options?: ResolveAbbreviationOptions): AbbreviationEntry | null`

略称・通称・正式名称のいずれかからエントリを引きます。前後の空白はトリムされます。完全一致のみ（部分一致なし）。見つからない場合は `null`。

`options.normalize`（デフォルト `false`）を `true` にすると、全角／半角の表記揺れを吸収して照合します。**大文字小文字は保持**されるため、`PL法` と `pl法` は別物として扱われます。

### `normalizeJpText(input: string): string`

全角数字・全角 ASCII 文字・全角ハイフン（`－` → `-`）・全角チルダ（`～` `〜` → `~`）・全角スペース（`　` → ` `）を半角化します。漢字・かな・中黒は保持。`.trim()` 込み。

### `normalizeSearchQuery(input: string): string`

`normalizeJpText` の処理に加えて、ASCII 大文字を小文字へ変換し、連続する空白文字を単一の半角スペースに畳み込みます。FTS5 検索など、ユーザー入力の揺れを最大限吸収したいケース向け。

### `listByDomain(domain: Domain): AbbreviationEntry[]`

`'tax' | 'labor' | 'accounting' | 'commercial' | 'civil' | 'administrative'` のいずれかで絞り込み。

### `listByCategory(category: Category): AbbreviationEntry[]`

法令種別で絞り込み。`'constitution' | 'law' | 'cabinet-order' | 'imperial-ordinance' | 'ministerial-ordinance' | 'rule' | 'kihon-tsutatsu' | 'kobetsu-tsutatsu' | 'qa-jirei' | 'tax-answer' | 'hanrei' | 'saiketsu'` のいずれか。

### `listBySourceMcpHint(hint: SourceMcpHint): AbbreviationEntry[]`

このエントリを処理すべき MCP で絞り込み。各 MCP が起動時に「自分の管轄エントリだけ」を抽出する用途を想定。

### `getAbbreviationStats(): AbbreviationStats`

辞書全体の統計（総数、ドメイン別、カテゴリ別、MCP 別）。

## エントリ型

```ts
interface AbbreviationEntry {
  abbr: string;            // 略称（例: '消法'）
  formal: string;          // 正式名称（例: '消費税法'）
  law_id: string | null;   // e-Gov law_id（verified 済みのみ。それ以外は null）
  law_num?: string;        // 法令番号（例: '昭和六十三年法律第百八号'）
  law_type?: LawTypeCode;  // 'Act' | 'CabinetOrder' | ...（後方互換）
  domain: Domain;          // 分野タグ
  category: Category;      // 法令カテゴリ
  source_mcp_hint: SourceMcpHint;  // 参照すべき MCP
  aliases?: string[];      // 同義の別表記
  note?: string;           // 備考
}
```

### `law_id` の方針

- **格納するのは e-Gov 法令 API で動作確認済み（verified）の `law_id` のみ**です
- 未確認・未調査・該当なしのエントリは `null` を入れます
- 通達系（`source_mcp_hint='houki-nta'` 等）は e-Gov 配下ではないため、設計上 `law_id` は基本的に `null` です
- 利用側で `if (entry.law_id !== null) { /* e-Gov 取得 */ }` のような分岐を期待しています

## category と source_mcp_hint の対応

| category | 例 | source_mcp_hint |
|---|---|---|
| `constitution` | 日本国憲法 | houki-egov |
| `law` | 消費税法、労働基準法 | houki-egov |
| `cabinet-order` | 消費税法施行令 | houki-egov |
| `ministerial-ordinance` | 消費税法施行規則 | houki-egov |
| `rule` | 各庁規則 | houki-egov |
| `kihon-tsutatsu` *(将来)* | 消費税法基本通達 | houki-nta |
| `kobetsu-tsutatsu` *(将来)* | 個別通達 | houki-nta / houki-mhlw |
| `qa-jirei` *(将来)* | 質疑応答事例 | houki-nta |
| `hanrei` *(将来)* | 判例 | houki-court |
| `saiketsu` *(将来)* | 国税不服審判所裁決 | houki-saiketsu |

v0.1.0 では `houki-egov` 管轄のみ。`houki-nta-mcp` 等の開発と並行してエントリを追加していきます。

## ロードマップ

中期計画は [docs/v0.4.0-roadmap.md](docs/v0.4.0-roadmap.md) を参照。v0.4.0 では検索拡張（部分一致・あいまい一致）と逆引き API を、v0.5.0 でルーティングヘルパー、v0.6.0 で検証ヘルパーを追加予定。辞書増強（aliases / 通称の網羅）は patch release で継続的に。

## 貢献方法

辞書の追加・修正は PR でお願いします。詳しくは [CONTRIBUTING.md](CONTRIBUTING.md) を参照。

## リリース

リリース手順・Trusted Publisher 設定・トラブルシュートは [docs/RELEASE.md](docs/RELEASE.md) を参照。

## ライセンス

MIT
