# 差分: listByDomain（20260927-untested-behaviors）

`specs/current/list_by_domain/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-LIST-BY-DOMAIN-003 辞書の並びのまま返す

返す配列の要素は、辞書（`abbreviationEntries`）での並びのまま並ぶ。`abbreviationEntries.filter((e) => e.domain === domain)` と同じエントリを同じ順で返す。

例: `listByDomain('tax')` の先頭の 3 件は `所法` / `所令` / `所規`、`listByDomain('labor')` の先頭の 3 件は `労基法` / `労基則` / `労契法` で、どれも `abbreviationEntries` での順と同じ。

### SPEC-ABBR-LIST-BY-DOMAIN-004 呼ぶたびに新しい配列を返す

呼ぶたびに新しい配列を返す。返した配列に要素を足したり、配列から要素を除いたりしても、次の呼び出しの結果は変わらない。

例: `const a = listByDomain('tax'); a.push({})` の後も、`listByDomain('tax')` は 35 件を返す。`a.splice(0)` の後も同じ。同じ引数で 2 回呼んだ結果は別の配列（`!==`）。

### SPEC-ABBR-LIST-BY-DOMAIN-005 DOMAINS に無い値には空配列を返す

JavaScript から `DOMAINS` に無い値を渡したときは、例外を投げずに空配列を返す。

例: `listByDomain('xxx')` と `listByDomain('')` は `[]`。
