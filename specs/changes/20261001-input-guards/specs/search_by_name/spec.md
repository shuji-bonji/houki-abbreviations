# 差分: searchByName（20261001-input-guards）

`specs/current/search_by_name/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### 入力

| 引数                | 必須 | 内容                                                                                                                                                                         |
| ------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query`             | 必須 | 探す文字列。例: `労働` / `施行令` / `インボイス`。前後の空白は無視する                                                                                                       |
| `options.mode`      | 任意 | 一致の仕方。`contains`（既定。どこかに含む）/ `prefix`（先頭が一致）/ `suffix`（末尾が一致）。型は `SearchMode`                                                              |
| `options.filter`    | 任意 | 絞り込み。型は `SearchFilter`。キーは `domain` / `category` / `source_mcp_hint` で、それぞれ単一の値か配列を取る                                                             |
| `options.limit`     | 任意 | 返す件数の上限。1 以上 500 以下の整数。省くと 50。それ以外の値（1 未満、小数、500 超、`NaN`、`Infinity`）は `RangeError`、数でない値は `TypeError` を投げる。丸めない       |
| `options.normalize` | 任意 | 全角英数字・ダッシュ類・全角チルダ・全角スペースを半角にしてから比べるか。既定 `true`                                                                                        |

辞書は関数が持っている（v0.6.1 で 174 件）。エントリの配列を渡す引数は無い。`limit` の規則は `findSimilar` / `suggestCorrection` と同じ。

### SPEC-ABBR-SEARCH-BY-NAME-017 1 未満の limit には RangeError を投げる

`limit` が 1 未満のとき（0・負の値・0.5 など）は、1 として扱わずに `RangeError` を投げる。辞書は調べない。

例: `searchByName('法', { limit: 0 })`、`{ limit: -3 }`、`{ limit: 0.5 }` は、どれも `RangeError` を投げる（v0.6.1 では `所法` の 1 件を返していた）。

### SPEC-ABBR-SEARCH-BY-NAME-018 小数の limit には RangeError を投げる

`limit` が整数でないときは、切り上げずに `RangeError` を投げる。

例: `searchByName('法', { limit: 1.2 })`、`{ limit: 2.5 }`、`{ limit: 2.9 }` は、どれも `RangeError` を投げる（v0.6.1 では 2 件・3 件・3 件を返していた）。`{ limit: 3 }` と `{ limit: 3.0 }` は同じ数なので 3 件を返す。

## ADDED

### SPEC-ABBR-SEARCH-BY-NAME-019 NaN・Infinity・数でない limit には例外を投げる

`limit` が `NaN` か `Infinity` か `-Infinity` のときは `RangeError`、数でない値（文字列・`null`・オブジェクトなど）のときは `TypeError` を投げる。`undefined` は省いたときと同じく 50 として扱う。既定値に置き換えたり、打ち切らずに返したりはしない。

例: `searchByName('法', { limit: NaN })` と `searchByName('法', { limit: Infinity })` は `RangeError`（v0.6.1 では `NaN` のとき 167 件をすべて返していた）。`searchByName('法', { limit: '3' })` と `searchByName('法', { limit: null })` は `TypeError`。`searchByName('法', { limit: undefined })` は `searchByName('法')` と同じ 50 件。

### SPEC-ABBR-SEARCH-BY-NAME-020 500 を超える limit には RangeError を投げる

`limit` が 500 を超えるときは、500 に丸めずに `RangeError` を投げる。500 は受け付ける。

例: `searchByName('法', { limit: 501 })` と `searchByName('法', { limit: 10000 })` は `RangeError`（v0.6.1 では 500 として扱っていた）。`searchByName('法', { limit: 500 })` は 167 件を返す。
