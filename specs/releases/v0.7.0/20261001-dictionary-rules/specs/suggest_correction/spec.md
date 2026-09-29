# 差分: suggestCorrection（20261001-dictionary-rules）

`specs/current/suggest_correction/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

`limit` の規則（1 以上 500 以下の整数）は `spec/20261001-input-guards` の差分のとおり。

## MODIFIED

### 戻り値

文字列の配列。各要素はエントリの `formal`（正式名称）。並びは `findSimilar` と同じ（編集距離の小さい順）。`query` と一致した名前を持つエントリ（`distance: 0`）は入れない。1 件も無ければ空配列。

### SPEC-ABBR-SUGGEST-CORRECTION-001 近いエントリの正式名称を文字列の配列で返す

`query` に編集距離が近いエントリ（`findSimilar` が返すもののうち `distance` が 1 以上のもの）の `formal` を、同じ順に並べた文字列の配列で返す。エントリそのものや編集距離は返さない。

例: `suggestCorrection('労働基準法施行例')` は `['労働基準法施行規則']`。`suggestCorrection('所得税法施行令')` は `['所得税法施行規則', '法人税法施行令', '消費税法施行令', '相続税法施行令', '印紙税法施行令']`（`所得税法施行令` 自身は入らない）。`suggestCorrection('法')` は `[]`（v0.6.1 では `['所得税法', '法人税法', '法人税法施行令', '法人税法施行規則', '消費税法']`）。

### SPEC-ABBR-SUGGEST-CORRECTION-002 limit の件数で打ち切る

`limit` を渡すと、その件数までで打ち切って返す。打ち切るのは距離 0 のエントリを除いた後。

例: `suggestCorrection('所得税法施行令', 3)` は `['所得税法施行規則', '法人税法施行令', '消費税法施行令']`。

### SPEC-ABBR-SUGGEST-CORRECTION-003 limit を省くと 5 件で打ち切る

`limit` を省くと、候補が 5 件を超えるときに 5 件で打ち切る。

例: `suggestCorrection('所得税法施行令')` は `['所得税法施行規則', '法人税法施行令', '消費税法施行令', '相続税法施行令', '印紙税法施行令']` の 5 件（`suggestCorrection('所得税法施行令', 100)` は 6 件で、`地方税法施行令` が末尾に付く）。

## ADDED

### SPEC-ABBR-SUGGEST-CORRECTION-009 query と一致した名前を持つエントリは候補に入れない

`query` が辞書の略称・正式名称・別名のどれかと一致するとき（`findSimilar` で `distance: 0`）、そのエントリの `formal` は返さない。「もしかして」に入力そのものを含めない。ほかのエントリは返す。

例: `suggestCorrection('民法')` は `['民事訴訟法', '民事執行法', '民事保全法']` で、`民法` は入らない（v0.6.1 では先頭が `民法` だった）。`suggestCorrection('労働基準法')` は `[]`。`suggestCorrection('労基側')` は `['労働基準法', '労働基準法施行規則']`。
