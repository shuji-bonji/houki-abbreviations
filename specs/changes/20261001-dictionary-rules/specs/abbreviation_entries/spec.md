# 差分: abbreviationEntries（20261001-dictionary-rules）

`specs/current/abbreviation_entries/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### SPEC-ABBR-ABBREVIATION-ENTRIES-007 日本国憲法のエントリを持つ

`category` が `constitution` のエントリがあり、その `formal` は `日本国憲法`、`law_id` は `321CONSTITUTION`。

例: `{ abbr: "憲", formal: "日本国憲法", law_id: "321CONSTITUTION", law_num: "昭和二十一年憲法", domain: "administrative", category: "constitution", source_mcp_hint: "houki-egov", aliases: ["憲法"] }`（v0.6.1 の `aliases` にあった `日本国憲法` は `formal` と同じ値なので、SPEC-ABBR-ABBREVIATION-ENTRIES-018 により外す）。

### SPEC-ABBR-ABBREVIATION-ENTRIES-009 houki-nta 管轄のエントリは通達・告示系のカテゴリだけである

`source_mcp_hint` が `houki-nta` のエントリが 1 件以上あり、その `category` はどれも `kihon-tsutatsu` / `kobetsu-tsutatsu` / `kokuji` / `qa-jirei` / `tax-answer` のどれか。

例: `消基通` は `kihon-tsutatsu`、`電帳法取通` は `kobetsu-tsutatsu`。v0.6.1 の辞書に `kokuji` のエントリは無い。

## ADDED

### SPEC-ABBR-ABBREVIATION-ENTRIES-017 名前は別のエントリの間で重ならない

どのエントリの `abbr`・`formal`・`aliases` の値も、`normalizeJpText` を通した後で比べて、別のエントリの `abbr`・`formal`・`aliases` のどの値とも同じにならない。名前から 1 件を返す関数（`resolveAbbreviation` / `getAllNames` / `findSimilar` の `distance: 0`）が、どの名前でも 1 件に決まる。`validateAllEntries` はこの約束の違反を `duplicate_name`（`abbr` どうしは `duplicate_abbr`）のエラーにする。

例: v0.6.1 の辞書 174 件の名前 482 個（重なりを除いて 416 個）は、エントリをまたいで重なるものが 0 件（`normalizeJpText` を通した後も 0 件）。`aliases: ["消費税法"]` を持つ別のエントリを足すと違反になる（`消費税法` は `消法` の `formal`）。

### SPEC-ABBR-ABBREVIATION-ENTRIES-018 aliases に自分の abbr・formal と同じ値を入れない

どのエントリの `aliases` にも、そのエントリの `abbr` や `formal` と同じ値は入れない。`abbr` と `formal` が同じ値であることは許す（`酒税法` など 33 件）。`validateAllEntries` はこの約束の違反を `alias_equals_own_name` のエラーにする。

例: v0.6.1 の `消基通` は `formal: "消費税法基本通達"` で `aliases: ["消費税法基本通達"]` だったが、0.7.0 では `aliases` を持たない。v0.6.1 で `aliases` に自分の `formal` を持つエントリは 33 件（`消基通` `所基通` `法基通` `相基通` `通基通` `徴基通` `措通` `印基通` `最賃法` `社労士法` `会社` `会社規` `商` `商登法` `金商法` `不競法` `消契法` `民` `民訴` `破` `不登` `住民台帳法` `人訴` `憲` `国賠法` `刑` `都計法` `司書法` `行書法` `大防法` `水濁法` `電通事業法` `デジ庁設置法`）で、実装 PR で直す。
