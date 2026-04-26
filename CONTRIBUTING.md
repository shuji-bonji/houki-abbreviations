# Contributing

houki-abbreviations は houki-hub MCP family の共通辞書層です。エントリ追加・修正・新カテゴリ提案を歓迎します。

## エントリを追加する

`src/data/{domain}.json` に追加してください。`domain` は以下から選びます:

| domain | 範囲 |
|---|---|
| `tax` | 国税法・地方税法・税務手続 |
| `labor` | 労働法・社会保険・労災・年金 |
| `accounting` | 会計士・経理関連 |
| `commercial` | 会社法・商取引・金融・電子商取引 |
| `civil` | 民事法・不動産・家族・相続 |
| `administrative` | 行政法・刑事・情報通信・知財・憲法 |

### 必須フィールド

```json
{
  "abbr": "略称",
  "formal": "正式名称",
  "law_id": null,
  "domain": "tax",
  "category": "law",
  "source_mcp_hint": "houki-egov"
}
```

### オプションフィールド

| フィールド | 用途 |
|---|---|
| `law_num` | 法令番号（例: `"昭和六十三年法律第百八号"`） |
| `law_type` | e-Gov 種別（`Act` / `CabinetOrder` / `MinisterialOrdinance` 等） |
| `aliases` | 通称・別表記（配列、例: `["消費税"]`） |
| `note` | 備考（例: `"通称: 電子帳簿保存法"`） |

### law_id を確認する

`law_id` は **e-Gov で動作確認したもののみ**入れてください。未確認は `null` のままで問題ありません。

確認方法:

1. https://laws.e-gov.go.jp/ で法令名検索
2. URL の末尾が law_id（例: `https://laws.e-gov.go.jp/law/363AC0000000108` → `363AC0000000108`）
3. もしくは e-Gov 法令API v2 の `/laws?law_title=...` で確認

### category の選び方

| category | 制定主体 | 例 |
|---|---|---|
| `constitution` | 国民 | 日本国憲法 |
| `law` | 国会 | 消費税法、労働基準法 |
| `cabinet-order` | 内閣 | ◯◯法施行令 |
| `imperial-ordinance` | 戦前 | （戦後の追加は基本的に無し） |
| `ministerial-ordinance` | 各大臣 | ◯◯法施行規則 |
| `rule` | 各庁 | 各種規則 |
| `kihon-tsutatsu` | 各省庁長官 | ◯◯基本通達 *(houki-nta-mcp 開発時に追加)* |
| `kobetsu-tsutatsu` | 各省庁 | 個別通達 *(houki-nta / houki-mhlw)* |
| `qa-jirei` | 各省庁 | 質疑応答事例 *(houki-nta)* |
| `tax-answer` | 国税庁 | タックスアンサー *(houki-nta)* |
| `hanrei` | 裁判所 | 判例 *(houki-court)* |
| `saiketsu` | 審判所 | 裁決 *(houki-saiketsu)* |

v0.1.x では `constitution` ～ `rule` のみ実エントリあり。

### source_mcp_hint の選び方

そのエントリの本文を取得すべき MCP を選びます:

| hint | 担当範囲 |
|---|---|
| `houki-egov` | e-Gov 法令API（法律・政令・省令・規則・告示） |
| `houki-nta` | 国税庁通達・Q&A・タックスアンサー |
| `houki-mhlw` | 厚労省通達・通知 |
| `houki-jaish` | 労災（労働安全衛生総合研究所） |
| `houki-court` | 判例（裁判所サイト） |
| `houki-saiketsu` | 国税不服審判所裁決 |

## 重複チェック

`abbr` フィールドは全 JSON ファイル横断でユニークである必要があります。テストが落ちるので衝突したら別の略称を選んでください。

## 開発

```sh
npm install
npm run lint        # ESLint
npm run format      # Prettier 整形
npm test            # vitest
npm run build       # tsc + JSON コピー
```

### houki-hub-mcp からの再マイグレーション

`scripts/migrate.mjs` は houki-hub-mcp 側 `src/abbreviations/*.json` を取り込んで `category` / `source_mcp_hint` を付与します（v0.1.0 初期化時に使用）。

```sh
npm run migrate
```

houki-hub-mcp 側で辞書を直接編集することは v0.2.0 以降は非推奨。**こちらのリポジトリが Single Source of Truth** になります。

## PR の流れ

1. Issue で追加内容を共有（スパム防止）
2. PR 作成
3. CI（lint + test + build）通過
4. レビュー後マージ
5. 次の minor リリースに含まれる

## ライセンス

PR を送った時点で MIT ライセンスでの公開に同意したものとみなします。
