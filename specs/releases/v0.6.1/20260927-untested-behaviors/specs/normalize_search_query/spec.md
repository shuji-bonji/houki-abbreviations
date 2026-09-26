# 差分: normalizeSearchQuery（20260927-untested-behaviors）

`specs/current/normalize_search_query/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-NORMALIZE-SEARCH-QUERY-007 null と undefined には空文字を返す

`input` が `null` または `undefined` のときは `''` を返す。

例: `normalizeSearchQuery(null)` も `normalizeSearchQuery(undefined)` も `''`。
