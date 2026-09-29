# 差分: suggestCorrection（20261001-input-guards）

`specs/current/suggest_correction/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

`limit` の規則は `searchByName` / `findSimilar` と同じにする。

## MODIFIED

### 入力

| 引数    | 必須 | 内容                                                                                                                                                                |
| ------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query` | 必須 | 誤っているかもしれない名前。例: `労働基準法施行例`                                                                                                                  |
| `limit` | 任意 | 返す件数の上限。1 以上 500 以下の整数。省くと 5。それ以外の値（1 未満、小数、500 超、`NaN`、`Infinity`）は `RangeError`、数でない値は `TypeError` を投げる。丸めない |

編集距離の上限・絞り込み・全角と半角の扱いは指定できない。`findSimilar` の既定値（`maxDistance: 2`、`sortByScore: true`、`normalize: true`、`filter` なし）で探す。

### SPEC-ABBR-SUGGEST-CORRECTION-004 1 未満の limit には RangeError を投げる

`limit` が 1 未満のとき（0・負の値・0.5 など）は、1 として扱わずに `RangeError` を投げる。

例: `suggestCorrection('所得税法施行令', 0)`、`suggestCorrection('所得税法施行令', -1)`、`suggestCorrection('所得税法施行令', 0.5)` は、どれも `RangeError` を投げる（v0.6.1 では 1 件を返していた）。

## ADDED

### SPEC-ABBR-SUGGEST-CORRECTION-006 小数の limit には RangeError を投げる

`limit` が整数でないときは `RangeError` を投げる。

例: `suggestCorrection('所得税法施行令', 2.5)` は `RangeError`。`suggestCorrection('所得税法施行令', 3)` は 3 件以内を返す。

### SPEC-ABBR-SUGGEST-CORRECTION-007 NaN・Infinity・数でない limit には例外を投げる

`limit` が `NaN` か `Infinity` か `-Infinity` のときは `RangeError`、数でない値（文字列・`null`・オブジェクトなど）のときは `TypeError` を投げる。`undefined` は省いたときと同じく 5 として扱う。

例: `suggestCorrection('所得税法施行令', NaN)` と `suggestCorrection('所得税法施行令', Infinity)` は `RangeError`（v0.6.1 では `NaN` のとき `[]` を返していた）。`suggestCorrection('所得税法施行令', '3')` と `suggestCorrection('所得税法施行令', null)` は `TypeError`。`suggestCorrection('所得税法施行令', undefined)` は `suggestCorrection('所得税法施行令')` と同じ結果。

### SPEC-ABBR-SUGGEST-CORRECTION-008 500 を超える limit には RangeError を投げる

`limit` が 500 を超えるときは `RangeError` を投げる。500 は受け付ける。v0.6.1 には上限が無かった。

例: `suggestCorrection('所得税法施行令', 501)` は `RangeError`。`suggestCorrection('所得税法施行令', 500)` は候補をすべて返す。
