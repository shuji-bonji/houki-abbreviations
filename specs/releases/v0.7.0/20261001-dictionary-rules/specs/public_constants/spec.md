# 差分: 公開定数（20261001-dictionary-rules）

`specs/current/public_constants/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える

## MODIFIED

### `CATEGORIES`

辞書エントリの `category`（法律・通達・判例など、どの種類の文書か）がとりうる値の一覧。`listByCategory` の引数や `getAbbreviationStats` の `byCategory` のキーに使う。13 の値を持つ。

| 値                      | 文書の種類       | 本文を持つ MCP サーバー      | 件数 |
| ----------------------- | ---------------- | ---------------------------- | ---- |
| `constitution`          | 憲法             | houki-egov-mcp               | 1    |
| `law`                   | 法律             | houki-egov-mcp               | 138  |
| `cabinet-order`         | 政令             | houki-egov-mcp               | 8    |
| `imperial-ordinance`    | 勅令             | houki-egov-mcp               | 0    |
| `ministerial-ordinance` | 省令             | houki-egov-mcp               | 16   |
| `rule`                  | 規則             | houki-egov-mcp               | 2    |
| `kokuji`                | 告示             | houki-nta-mcp・houki-mhlw-mcp など。e-Gov 法令 API は告示を持たない | 0    |
| `kihon-tsutatsu`        | 基本通達         | houki-nta-mcp など           | 8    |
| `kobetsu-tsutatsu`      | 個別通達         | houki-nta-mcp など           | 1    |
| `qa-jirei`              | 質疑応答事例     | houki-nta-mcp など           | 0    |
| `tax-answer`            | タックスアンサー | houki-nta-mcp など           | 0    |
| `hanrei`                | 判例             | （未定）                     | 0    |
| `saiketsu`              | 裁決             | （未定）                     | 0    |

件数 0 の値は、辞書にまだエントリが無い種類として先に定義している。`kokuji` は v0.7.0 で足す。告示は `law_type` を持たず（`LAW_TYPE_CODES` に対応するキーは無い）、`law_id` は `null`（`isValidLawId` が受け付ける形に告示は無い）。

### `SOURCE_MCP_HINTS`

辞書エントリの `source_mcp_hint`（そのエントリの本文をどの MCP サーバーで取得するか）がとりうる値の一覧。各 MCP サーバーは、エントリの `source_mcp_hint` が自分の名前でないときに管轄外と判定し、この値の MCP サーバーを案内する。`listBySourceMcpHint` の引数や `getAbbreviationStats` の `bySourceMcpHint` のキーに使う。6 つの値を持つ。

| 値               | 本文の取得元                                         | 件数 |
| ---------------- | ---------------------------------------------------- | ---- |
| `houki-egov`     | e-Gov 法令 API（憲法・法律・政令・勅令・府省令・規則） | 165  |
| `houki-nta`      | 国税庁の通達・告示・質疑応答事例・タックスアンサー   | 9    |
| `houki-mhlw`     | 厚生労働省の通達・告示・通知                         | 0    |
| `houki-jaish`    | 労働安全衛生の通達（未決 3）                         | 0    |
| `houki-court`    | 裁判所サイトの判例                                   | 0    |
| `houki-saiketsu` | 国税不服審判所の裁決                                 | 0    |

`houki-egov` の取得元から「告示」を外す。e-Gov 法令 API（`GET /api/2/laws`）は憲法・法律・政令・勅令・府省令・規則だけを持ち、告示を持たない。

### SPEC-ABBR-PUBLIC-CONSTANTS-007 CATEGORIES は 13 の値をこの順で持つ

`CATEGORIES` は `["constitution", "law", "cabinet-order", "imperial-ordinance", "ministerial-ordinance", "rule", "kokuji", "kihon-tsutatsu", "kobetsu-tsutatsu", "qa-jirei", "tax-answer", "hanrei", "saiketsu"]` で、値と順序がこのとおりになっている。`kokuji` は `rule` の次（法令系の値の末尾）に置く。

例: `CATEGORIES.length` は 13、`CATEGORIES[6]` は `"kokuji"`、`CATEGORIES.indexOf('kihon-tsutatsu')` は 7（v0.6.1 では 6）。
