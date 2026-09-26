# 差分: getAbbreviationStats（20260927-untested-behaviors）

`specs/current/get_abbreviation_stats/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-GET-ABBREVIATION-STATS-004 呼ぶたびに新しいオブジェクトを返す

呼ぶたびに新しいオブジェクトを返す。`byDomain`・`byCategory`・`bySourceMcpHint` も呼ぶたびに新しいオブジェクトになる。返したオブジェクトやその中の値を書き換えても、次の呼び出しの結果は変わらない。

例: `const s = getAbbreviationStats(); s.total = 0; s.byDomain.tax = 0; s.byCategory.law = 0` の後も、`getAbbreviationStats()` は `total: 174`、`byDomain.tax: 35`、`byCategory.law: 138` を返す。2 回呼んだ結果は別のオブジェクト（`!==`）で、`byDomain` なども別のオブジェクト。
