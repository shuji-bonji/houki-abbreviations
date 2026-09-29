# 差分: getAbbreviationStats（20261001-dictionary-rules）

`specs/current/get_abbreviation_stats/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### 戻り値

`AbbreviationStats`。次の 4 つのフィールドを持つオブジェクト。

| フィールド        | 型                              | 内容                                                                                                                 |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `total`           | `number`                        | 辞書のエントリの件数                                                                                                 |
| `byDomain`        | `Record<Domain, number>`        | キーは `DOMAINS` の全値（定数の順）、値はその分野のエントリの件数。辞書に無い分野は `0`                              |
| `byCategory`      | `Record<Category, number>`      | キーは `CATEGORIES` の全値（定数の順）、値はその種別のエントリの件数。辞書に無い種別は `0`                           |
| `bySourceMcpHint` | `Record<SourceMcpHint, number>` | キーは `SOURCE_MCP_HINTS` の全値（定数の順）、値はその MCP のエントリの件数。辞書に無い MCP は `0`                   |

件数の実数（総数 174 など）は仕様に固定しない。エントリを足すたびに変わる。

例: v0.6.1 の辞書では次の値を返す（`byCategory` の `kokuji` は `spec/20261001-dictionary-rules` で足す種別）。

```json
{
  "total": 174,
  "byDomain": {
    "tax": 35,
    "labor": 28,
    "accounting": 9,
    "commercial": 31,
    "civil": 23,
    "administrative": 48
  },
  "byCategory": {
    "constitution": 1,
    "law": 138,
    "cabinet-order": 8,
    "imperial-ordinance": 0,
    "ministerial-ordinance": 16,
    "rule": 2,
    "kokuji": 0,
    "kihon-tsutatsu": 8,
    "kobetsu-tsutatsu": 1,
    "qa-jirei": 0,
    "tax-answer": 0,
    "hanrei": 0,
    "saiketsu": 0
  },
  "bySourceMcpHint": {
    "houki-egov": 165,
    "houki-nta": 9,
    "houki-mhlw": 0,
    "houki-jaish": 0,
    "houki-court": 0,
    "houki-saiketsu": 0
  }
}
```

## ADDED

### SPEC-ABBR-GET-ABBREVIATION-STATS-005 byDomain・byCategory・bySourceMcpHint は定数の全値をキーに、定数の順で持つ

`byDomain` のキーは `DOMAINS` の全値、`byCategory` のキーは `CATEGORIES` の全値、`bySourceMcpHint` のキーは `SOURCE_MCP_HINTS` の全値で、それ以外のキーは無い。`Object.keys` の順は定数の順と同じ。

例: `Object.keys(getAbbreviationStats().byCategory)` は `[...CATEGORIES]` と同じ配列。`Object.keys(getAbbreviationStats().bySourceMcpHint)` は `[...SOURCE_MCP_HINTS]` と同じ配列（v0.6.1 では `['houki-egov', 'houki-nta']` の 2 つだけだった）。

### SPEC-ABBR-GET-ABBREVIATION-STATS-006 辞書にエントリの無い値は 0 を返す

辞書に 1 件も無い分野・種別・MCP のキーの値は `0`。`undefined` にはしない。

例: `getAbbreviationStats().byCategory.hanrei` は `0`（v0.6.1 では `undefined`）。`getAbbreviationStats().bySourceMcpHint['houki-mhlw']` は `0`。`getAbbreviationStats().byCategory.law` は 1 以上。
