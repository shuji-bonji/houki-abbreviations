# 差分: suggestCorrection（20260927-untested-behaviors）

`specs/current/suggest_correction/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-SUGGEST-CORRECTION-003 limit を省くと 5 件で打ち切る

`limit` を省くと、候補が 5 件を超えるときに 5 件で打ち切る。

例: `suggestCorrection('法')` は `['所得税法', '法人税法', '法人税法施行令', '法人税法施行規則', '消費税法']` の 5 件（`suggestCorrection('法', 100)` は 100 件）。

### SPEC-ABBR-SUGGEST-CORRECTION-004 1 未満の limit は 1 として扱う

`limit` が 1 未満のとき（0・負の値）は 1 として扱い、候補があれば 1 件を返す。

例: `suggestCorrection('法', 0)` と `suggestCorrection('法', -1)` はどちらも `['所得税法']`。

### SPEC-ABBR-SUGGEST-CORRECTION-005 空の query には空配列を返す

`query` が空文字か、前後の空白を除くと空になるときは、空配列を返す。エラーにはしない。

例: `suggestCorrection('')` と `suggestCorrection('   ')` はどちらも `[]`。
