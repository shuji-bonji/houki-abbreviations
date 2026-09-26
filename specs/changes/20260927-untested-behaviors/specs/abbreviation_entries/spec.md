# 差分: abbreviationEntries（20260927-untested-behaviors）

`specs/current/abbreviation_entries/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-ABBREVIATION-ENTRIES-012 分野の JSON ファイルの順に結合し、ファイルの中の順を保って並ぶ

`abbreviationEntries` は、`src/data/tax.json` → `labor.json` → `accounting.json` → `commercial.json` → `civil.json` → `administrative.json` の順に各ファイルのエントリをつなげた並びになる。各ファイルの中のエントリは、ファイルに書かれた順のまま並ぶ。`searchByName` などが返す順は、この並びに従う。

例: v0.6.0 では先頭が `所法`（`tax.json` の先頭）、`labor` の最初のエントリ `労基法` は 36 番目（添字 35）、末尾が `デジ庁設置法`（`administrative.json` の末尾）。`searchByName("基通")` は `消基通` / `所基通` / `法基通` / `相基通` / `通基通` / `徴基通` / `印基通` を `tax.json` に書かれた順で返す。

### SPEC-ABBR-ABBREVIATION-ENTRIES-013 全エントリが law_id のキーを持ち、値は文字列か null である

どのエントリも `law_id` のキーを持ち、その値は文字列か `null` のどちらか。`undefined` のエントリやキーの無いエントリは無い。

例: `所法` の `law_id` は `"340AC0000000033"`、`消基通` の `law_id` は `null`。

### SPEC-ABBR-ABBREVIATION-ENTRIES-014 各エントリの domain は、そのエントリが書かれた JSON ファイルの名前と同じである

`src/data/<domain>.json` に書かれたエントリの `domain` は、どれもファイル名の `<domain>` と同じ値を持つ。

例: `tax.json` の `電帳法取通` は `domain: "tax"`、`administrative.json` の `憲` は `domain: "administrative"`。

### SPEC-ABBR-ABBREVIATION-ENTRIES-015 houki-nta 管轄のエントリは law_id が null である

`source_mcp_hint` が `houki-nta` のエントリは、どれも `law_id` が `null`。通達などは e-Gov の法令 ID を持たない。

例: `消基通`・`措通`・`電帳法取通` の `law_id` はどれも `null`。

### SPEC-ABBR-ABBREVIATION-ENTRIES-016 houki-egov 管轄のエントリは法令系のカテゴリだけである

`source_mcp_hint` が `houki-egov` のエントリの `category` は、どれも `constitution` / `law` / `cabinet-order` / `imperial-ordinance` / `ministerial-ordinance` / `rule` のどれか。

例: `憲` は `constitution`、`所法` は `law`。v0.6.0 では `imperial-ordinance` のエントリは無い。
