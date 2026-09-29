# 差分: validateAllEntries（20261001-dictionary-rules）

`specs/current/validate_all_entries/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す
- `REMOVED` の見出しは、current から外す。テストは取り込みと同じコミットで消す

## MODIFIED

### 戻り値

`ValidationReport`。

| フィールド | 型                  | 内容                                                           |
| ---------- | ------------------- | -------------------------------------------------------------- |
| `valid`    | `boolean`           | `errors` が 0 件なら `true`。警告があっても `true` のまま      |
| `errors`   | `ValidationIssue[]` | エラーの一覧（辞書の誤り。CI を失敗させる対象）。無ければ `[]` |
| `warnings` | `ValidationIssue[]` | 警告の一覧（CI を失敗させない不整合）。無ければ `[]`           |

`ValidationIssue`（エラーと警告で同じ型）。

| フィールド | 型                  | 内容                                                                                            |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `code`     | `string`            | 種類を表す文字列。下の 2 つの表のどれか                                                         |
| `message`  | `string`            | 日本語の説明。該当する `abbr` や値を含む。例: `law_id の形式が不正です: 'INVALID'（abbr=消法）` |
| `entry`    | `AbbreviationEntry` | 問題のあったエントリ。すべてのエラーと警告に付く（型の上では省略可）                            |

エラーの種類（`errors` に入る）。

| `code`                    | 起きる条件                                                                                                                                                       | 仕様 ID |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `missing_required_field`  | `abbr` / `formal` / `domain` / `category` / `source_mcp_hint` のどれかが空（空文字・未設定）。欠けたフィールドごとに 1 件                                        | 006     |
| `invalid_domain`          | `domain` が空でなく、`DOMAINS` に無い値                                                                                                                          | 017     |
| `invalid_category`        | `category` が空でなく、`CATEGORIES` に無い値                                                                                                                     | 017     |
| `invalid_source_mcp_hint` | `source_mcp_hint` が空でなく、`SOURCE_MCP_HINTS` に無い値                                                                                                        | 017     |
| `duplicate_abbr`          | 同じ `abbr` のエントリが 2 件以上ある。2 件目以降に 1 件ずつ                                                                                                     | 002     |
| `duplicate_name`          | `abbr` / `formal` / `aliases` のどれかが、`normalizeJpText` を通した後で、別のエントリの `abbr` / `formal` / `aliases` のどれかと同じ。`abbr` どうしの重なりは `duplicate_abbr` だけにする。後のエントリに、重なる名前ごとに 1 件 | 015     |
| `alias_equals_own_name`   | `aliases` に、そのエントリの `abbr` か `formal` と同じ値がある。値ごとに 1 件                                                                                    | 016     |
| `invalid_law_id`          | `law_id` が `null` でも未設定でもなく、`isValidLawId` が `false`                                                                                                 | 004     |
| `duplicate_law_id`        | 同じ `law_id` のエントリが 2 件以上ある。2 件目以降に 1 件ずつ                                                                                                   | 003     |

警告の種類（`warnings` に入る）。

| `code`                         | 起きる条件                                               | 仕様 ID |
| ------------------------------ | -------------------------------------------------------- | ------- |
| `category_hint_mismatch`       | `category` に対して `source_mcp_hint` が下の許容表に無い | 007・018 |
| `duplicate_alias_within_entry` | 1 件のエントリの `aliases` に同じ値が 2 回以上ある       | 010     |

v0.6.1 にあった警告 `alias_collides_with_abbr`（別名がほかのエントリの `abbr` と同じ）は、`duplicate_name` のエラーに含まれるので無くす。

`category_hint_mismatch` の許容表（`category` ごとに許す `source_mcp_hint`）。

| `category`                                                                                         | 許す `source_mcp_hint`     |
| -------------------------------------------------------------------------------------------------- | -------------------------- |
| `constitution` / `law` / `cabinet-order` / `imperial-ordinance` / `ministerial-ordinance` / `rule` | `houki-egov`               |
| `kokuji` / `kihon-tsutatsu` / `kobetsu-tsutatsu`                                                   | `houki-nta` / `houki-mhlw` |
| `qa-jirei` / `tax-answer`                                                                          | `houki-nta`                |
| `hanrei`                                                                                           | `houki-court`              |
| `saiketsu`                                                                                         | `houki-saiketsu`           |

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-014 エラーと警告の message に該当エントリの abbr が入る

`ValidationIssue` の `message` は、該当エントリの `abbr` が空でなければ、その `abbr` を含む。文言そのものは約束にしない。

例: `law_id: "INVALID"` の `A1` のエントリなら、`invalid_law_id` のエラーの `message` に `A1` が入る。`A1` のエントリと、`aliases: ["A1"]` を持つ `B1` のエントリの 2 件なら、`duplicate_name` のエラーの `message` に `B1` が入る。

## ADDED

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-015 別のエントリと重なる名前をエラーにする

あるエントリの `abbr` / `formal` / `aliases` のどれかが、`normalizeJpText` を通した後で、別のエントリの `abbr` / `formal` / `aliases` のどれかと同じなら、`code: "duplicate_name"` のエラーを返し、`valid` は `false`。`entry` は後のエントリ。`abbr` どうしが同じときは `duplicate_abbr` だけを返し、`duplicate_name` は返さない。

例: `{ abbr: "A1", formal: "F" }` と `{ abbr: "A2", formal: "F" }`（ほかのフィールドは正しい値）の 2 件なら、`errors` は `duplicate_name` の 1 件で `entry` は `A2`（v0.6.1 では `valid: true`）。`A1` のエントリと `aliases: ["A1"]` を持つ `B1` の 2 件なら、`duplicate_name` の 1 件（v0.6.1 では警告 `alias_collides_with_abbr`）。`aliases: ["PL法"]` の `A1` と `aliases: ["ＰＬ法"]` の `A2` の 2 件も `duplicate_name`（半角にすると同じ）。同じ `abbr: "A1"` の 2 件なら `duplicate_abbr` の 1 件だけ。

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-016 自分の abbr・formal と同じ別名をエラーにする

あるエントリの `aliases` に、そのエントリの `abbr` か `formal` と同じ値があれば、`code: "alias_equals_own_name"` のエラーを返し、`valid` は `false`。

例: `{ abbr: "消基通", formal: "消費税法基本通達", aliases: ["消費税法基本通達"] }`（ほかのフィールドは正しい値）1 件なら、`errors` は `alias_equals_own_name` の 1 件（v0.6.1 では `valid: true`、`warnings: []`）。`{ abbr: "民", formal: "民法", aliases: ["民"] }` も同じ。`{ abbr: "酒税法", formal: "酒税法" }`（`aliases` なし）はエラーにしない。

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-017 一覧に無い domain・category・source_mcp_hint をエラーにする

`domain` が `DOMAINS` に無い値なら `invalid_domain`、`category` が `CATEGORIES` に無い値なら `invalid_category`、`source_mcp_hint` が `SOURCE_MCP_HINTS` に無い値なら `invalid_source_mcp_hint` のエラーを返す。空文字・未設定は `missing_required_field` にし、この 3 つにはしない。

例: `{ abbr: "A1", formal: "F1", law_id: null, domain: "x", category: "foo", source_mcp_hint: "houki-zzz" }` 1 件なら、`valid: false` で、`errors` は `invalid_domain`・`invalid_category`・`invalid_source_mcp_hint` の 3 件（v0.6.1 では `valid: true`）。`category: ""` なら `missing_required_field` の 1 件で、`invalid_category` は返さない。

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-018 kokuji の source_mcp_hint は houki-nta か houki-mhlw

`category` が `kokuji` のエントリの `source_mcp_hint` が `houki-nta` でも `houki-mhlw` でもなければ、`code: "category_hint_mismatch"` の警告を返す。エラーにはしない。

例: `category: "kokuji"` で `source_mcp_hint: "houki-egov"` のエントリがあれば、`warnings` に `category_hint_mismatch` があり、`errors` には無い（e-Gov 法令 API は告示を持たない）。`source_mcp_hint: "houki-nta"` なら警告は無い。

## REMOVED

### SPEC-ABBR-VALIDATE-ALL-ENTRIES-008 ほかのエントリの abbr と同じ別名は警告にする

外す。別名がほかのエントリの `abbr` と同じことは、SPEC-ABBR-VALIDATE-ALL-ENTRIES-015 の `duplicate_name` のエラーになる。警告 `alias_collides_with_abbr` は返さない。`src/validate.test.ts` のこの ID のテストは、取り込みのコミットで消す（015 のテストが同じ入力をエラーとして確かめる）。
