# 差分: findSimilar（20261001-input-guards）

`specs/current/find_similar/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

`options.limit` の規則は `searchByName` と同じにする。`options.maxDistance` はこの差分では変えない（負の値は空配列のまま。SPEC-ABBR-FIND-SIMILAR-016）。

## MODIFIED

### SPEC-ABBR-FIND-SIMILAR-013 1 未満の limit には RangeError を投げる

`limit` が 1 未満のとき（0・負の値・0.5 など）は、1 として扱わずに `RangeError` を投げる。辞書は調べない。

例: `findSimilar('所得税法施行令', { limit: 0 })`、`{ limit: -1 }`、`{ limit: 0.5 }` は、どれも `RangeError` を投げる（v0.6.1 では 1 件を返していた）。

## ADDED

### SPEC-ABBR-FIND-SIMILAR-018 小数の limit には RangeError を投げる

`limit` が整数でないときは、切り捨てずに `RangeError` を投げる。

例: `findSimilar('所得税法施行令', { limit: 2.5 })` は `RangeError`（v0.6.1 では 2 件を返していた。`searchByName` は切り上げで 3 件だったので、関数ごとに違っていた）。`{ limit: 3 }` は 3 件を返す。

### SPEC-ABBR-FIND-SIMILAR-019 NaN・Infinity・数でない limit には例外を投げる

`limit` が `NaN` か `Infinity` か `-Infinity` のときは `RangeError`、数でない値（文字列・`null`・オブジェクトなど）のときは `TypeError` を投げる。`undefined` は省いたときと同じく 5 として扱う。

例: `findSimilar('所得税法施行令', { limit: NaN })` と `{ limit: Infinity }` は `RangeError`（v0.6.1 では `NaN` のとき `[]` を返していた）。`{ limit: '3' }` と `{ limit: null }` は `TypeError`。`{ limit: undefined }` は `findSimilar('所得税法施行令')` と同じ結果。

### SPEC-ABBR-FIND-SIMILAR-020 500 を超える limit には RangeError を投げる

`limit` が 500 を超えるときは `RangeError` を投げる。500 は受け付ける。v0.6.1 には上限が無かった。

例: `findSimilar('所得税法施行令', { limit: 501 })` は `RangeError`。`findSimilar('所得税法施行令', { limit: 500 })` は候補をすべて返す（候補が 500 件を超えることは v0.6.1 の辞書では無い）。
