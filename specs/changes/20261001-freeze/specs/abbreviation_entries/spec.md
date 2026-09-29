# 差分: abbreviationEntries（20261001-freeze）

`specs/current/abbreviation_entries/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### SPEC-ABBR-ABBREVIATION-ENTRIES-010 配列は凍結されていて要素を足せない

`abbreviationEntries` は `Object.isFrozen` が `true` を返す配列で、要素の追加・削除・差し替えはできない。

例: `abbreviationEntries.push({})` は `TypeError: Cannot add property 174, object is not extensible` を投げる。`abbreviationEntries[0] = {}` と `abbreviationEntries.length = 0` も `TypeError`。

要素（各エントリのオブジェクト）と `aliases` の配列も凍結されている（SPEC-ABBR-ABBREVIATION-ENTRIES-019）。

## ADDED

### SPEC-ABBR-ABBREVIATION-ENTRIES-019 各エントリと aliases は凍結されていて、代入は TypeError になる

`abbreviationEntries` の各要素（エントリのオブジェクト）と、その `aliases` の配列は、`Object.isFrozen` が `true` を返す。フィールドへの代入・追加・削除と `aliases` への追加は、strict mode（ES モジュール、TypeScript の出力）では `TypeError` を投げ、値は変わらない。名前から引く関数（`resolveAbbreviation` / `lookupByLawId` / `lookupByLawNum`）と一覧を返す関数（`listByDomain` / `listByCategory` / `listBySourceMcpHint` / `searchByName`、`findSimilar` の `entry`、`extractLawNames` の `entry`）が返すエントリは、この配列の要素そのもの（同じオブジェクト）なので、同じく凍結されている。

例: `Object.isFrozen(abbreviationEntries[0])` と `Object.isFrozen(resolveAbbreviation('消法'))` と `Object.isFrozen(resolveAbbreviation('消法').aliases)` は、どれも `true`。`abbreviationEntries[0].formal = 'X'` は `TypeError` を投げ、その後の `resolveAbbreviation('所法').formal` は `'所得税法'` のまま（v0.6.1 では代入が通り、`'X'` になっていた）。`resolveAbbreviation('消法').aliases.push('x')` は `TypeError`。`delete resolveAbbreviation('消法').note` も `TypeError`。`listByDomain('tax')` が返す配列そのものは呼ぶたびに新しく、凍結されていない（SPEC-ABBR-LIST-BY-DOMAIN-004）。
