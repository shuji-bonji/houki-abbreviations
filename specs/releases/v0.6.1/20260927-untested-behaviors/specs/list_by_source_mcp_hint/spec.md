# 差分: listBySourceMcpHint（20260927-untested-behaviors）

`specs/current/list_by_source_mcp_hint/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-003 辞書の並びのまま返す

返す配列の要素は、辞書（`abbreviationEntries`）での並びのまま並ぶ。`abbreviationEntries.filter((e) => e.source_mcp_hint === hint)` と同じエントリを同じ順で返す。

例: `listBySourceMcpHint('houki-egov')` の先頭の 3 件は `所法` / `所令` / `所規`、`listBySourceMcpHint('houki-nta')` の先頭の 3 件は `消基通` / `所基通` / `法基通` で、どれも `abbreviationEntries` での順と同じ。

### SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-004 呼ぶたびに新しい配列を返す

呼ぶたびに新しい配列を返す。返した配列に要素を足したり、配列から要素を除いたりしても、次の呼び出しの結果は変わらない。

例: `const a = listBySourceMcpHint('houki-nta'); a.push({})` の後も、`listBySourceMcpHint('houki-nta')` は 9 件を返す。`a.splice(0)` の後も同じ。同じ引数で 2 回呼んだ結果は別の配列（`!==`）。

### SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-005 SOURCE_MCP_HINTS に無い値には空配列を返す

JavaScript から `SOURCE_MCP_HINTS` に無い値を渡したときは、例外を投げずに空配列を返す。大文字と小文字は区別する。

例: `listBySourceMcpHint('xxx')` と `listBySourceMcpHint('HOUKI-EGOV')` は `[]`。
