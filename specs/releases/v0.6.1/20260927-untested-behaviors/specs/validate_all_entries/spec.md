# 差分: validateAllEntries（20260927-untested-behaviors）

`specs/current/validate_all_entries/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-010 1 件のエントリの中で重なる別名は警告にする

1 件のエントリの `aliases` に同じ値が 2 回あれば、`code: "duplicate_alias_within_entry"` の警告を返す。エラーにはしないので、これだけなら `valid` は `true` のまま。

例: `{ abbr: "A1", formal: "F1", law_id: null, domain: "tax", category: "law", source_mcp_hint: "houki-egov", aliases: ["Q", "Q"] }` 1 件なら、`valid: true`、`errors: []` で、`warnings` は `duplicate_alias_within_entry` の 1 件（`message` は `同一エントリ内で aliases が重複: 'Q'（abbr=A1）`）。

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-011 law_id が空文字なら形の誤りにする

`law_id: ""` は `null` と同じには扱わず、`code: "invalid_law_id"` のエラーを返す。

例: 上の `A1` のエントリの `aliases` を除き、`law_id` を `""` にした 1 件なら、`valid: false` で、`errors` は `invalid_law_id` の 1 件。

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-012 形の誤った law_id でも重なれば重複のエラーにする

形の誤った同じ `law_id` のエントリが 2 件あれば、`invalid_law_id` のエラーを 2 件（エントリごとに 1 件）と、`duplicate_law_id` のエラーを 1 件返す。

例: `law_id: ""` のエントリが `A1` と `A2` の 2 件なら、`errors` は `invalid_law_id`（`A1`）、`invalid_law_id`（`A2`）、`duplicate_law_id`（`A2`）の 3 件。

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-013 エラーと警告には問題のあったエントリが付く

`errors` と `warnings` のどの `ValidationIssue` にも `entry` が付き、問題のあったエントリそのもの（渡した配列の要素）を指す。`duplicate_abbr` と `duplicate_law_id` では、重なったうちの 2 件目以降のエントリを指す。

例: `formal: ""` の `A1` のエントリ 1 件なら、`missing_required_field` のエラーの `entry` は渡したそのエントリ。同じ内容の `A1` のエントリを 2 件渡せば、`duplicate_abbr` のエラーの `entry` は 2 件目のエントリ。

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-014 エラーと警告の message に該当エントリの abbr が入る

`ValidationIssue` の `message` は、該当エントリの `abbr` が空でなければ、その `abbr` を含む。文言そのものは約束にしない。

例: `law_id: "INVALID"` の `A1` のエントリなら、`invalid_law_id` のエラーの `message` に `A1` が入る。`A1` のエントリと、`aliases: ["A1"]` を持つ `B1` のエントリの 2 件なら、`alias_collides_with_abbr` の警告の `message` に `B1` が入る。
