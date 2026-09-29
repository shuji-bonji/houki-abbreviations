# 差分: extractLawNames（20261001-normalize）

`specs/current/extract_law_names/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### 入力

| 引数      | 必須 | 内容                                                                             |
| --------- | ---- | -------------------------------------------------------------------------------- |
| `text`    | 必須 | 探す対象の文字列。例: `消費税法と法人税法の改正について。インボイス制度も対象。` |
| `options` | 任意 | `ExtractOptions`。下の表                                                         |

`ExtractOptions` のフィールド（どれも任意）。

| フィールド     | 型        | 既定値  | 内容                                                                                                                                                       |
| -------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minLength`    | `number`  | `2`     | これより短いキー（略称・正式名称・別名）は探さない。既定では `民` `商` のような 1 文字の略称を探さない                                                     |
| `preferLonger` | `boolean` | `true`  | `true` なら、ほかの、より長い一致と範囲が重なる短い一致を除く                                                                                              |
| `dedupe`       | `boolean` | `false` | `true` なら、同じエントリ（同じ `abbr`）への一致を位置が最も前の 1 件だけにする                                                                            |
| `normalize`    | `boolean` | `false` | `true` なら、`text` と辞書のキーの両方を `normalizeJpText` に通してから探す（全角英数字・ダッシュ類・全角チルダ・全角スペースを半角にする）。`position` と `length` は元の `text` の位置と長さで返す |

探すキーは、同梱の辞書の各エントリの `abbr`・`formal`・`aliases` の全部です。v0.6.1 の辞書で 1 文字のキーは `商` `民` `破` `憲` `刑`（`abbr`）と `裁`（`裁判所法` の別名）の 6 つです。`normalize` は `resolveAbbreviation` の `options.normalize` と同じ意味で、既定も同じ `false`。houki-egov-mcp・houki-nta-mcp は入口で `normalize: true` を渡す。

### SPEC-ABBR-EXTRACT-LAW-NAMES-005 preferLonger: true なら長い一致と重なる短い一致を除く

`preferLonger` が `true` のとき、ある一致の範囲（`position` から `position + length` まで）が、ほかの、より長い一致の範囲と 1 文字でも重なるなら、その短い一致を返さない。長い一致の中にすっぽり入る場合も、長い一致の端にまたがる場合も同じ。長さが同じ一致どうしは、重なっていてもどちらも返す。

例: `民法の解釈`、`{ minLength: 1, preferLonger: true }` → `民`（位置 0、長さ 1）は `民法`（位置 0、長さ 2）の範囲に入るので返さず、`民法` の一致は返す。`消費税法法人税法`（`preferLonger` は既定の `true`）→ `消費税法`（位置 0、長さ 4）と `法人税法`（位置 4、長さ 4）の 2 件。`法法`（位置 3、長さ 2）は両方の長い一致と重なるので返さない（v0.6.1 では `法法` も返していた）。

### SPEC-ABBR-EXTRACT-LAW-NAMES-010 preferLonger を指定しなければ true として扱う

`options` に `preferLonger` を入れなければ、`preferLonger: true` と同じく、ほかの、より長い一致と範囲が重なる短い一致を返さない。

例: `民法の解釈`、`{ minLength: 1 }`（`preferLonger` なし）→ `民`（位置 0、長さ 1）の一致は無く、`民法`（位置 0、長さ 2）の一致はある。同じ入力に `preferLonger: false` を足すと `民` の一致も返る。`消費税法法人税法`（`options` なし）→ `消費税法` と `法人税法` の 2 件で、`法法` は返さない。

## ADDED

### SPEC-ABBR-EXTRACT-LAW-NAMES-015 preferLonger: true でも長さが同じ一致は重なっていても両方返す

重なる 2 つの一致の長さが同じときは、どちらが正しいか決められないので、`preferLonger: true` でも両方を返す。

例: `所得税法人税法` → `所得税法`（位置 0、長さ 4。エントリは `所法`）と `法人税法`（位置 3、長さ 4。エントリは `法法`）の 2 件。位置 3 の `法` を両方の一致が共有するが、長さが同じなのでどちらも残す。

### SPEC-ABBR-EXTRACT-LAW-NAMES-016 normalize: true では全角英数字・ダッシュ類を半角にしてから探す

`options.normalize` が `true` のとき、`text` と辞書のキーの両方を `normalizeJpText` と同じ規則で半角にしてから探す。`matchedKey` は辞書に書かれた表記のまま返す。

例: `ＰＬ法の規定`、`{ normalize: true }` → 1 件。`matchedKey: "PL法"`、`entry.formal: "製造物責任法"`、`position: 0`、`length: 3`。

### SPEC-ABBR-EXTRACT-LAW-NAMES-017 normalize: true でも position と length は元の text の位置と長さで返す

`normalize: true` で半角にして探したときも、`position` は元の `text` での一致の開始位置、`length` は元の `text` での一致の文字数（UTF-16 の文字単位）で返す。`normalizeJpText` の変換はどれも 1 文字を 1 文字に置き換えるので、`length` は `matchedKey` の長さと同じになる。`text` の先頭の空白は位置に数える（探すときに取り除かない）。

例: `　ＰＬ法の規定`（先頭が全角スペース）、`{ normalize: true }` → `position: 1`、`length: 3`。`text.slice(1, 4)` は `'ＰＬ法'`。`消費税法の改正と法人税法`、`{ normalize: true }` → `消費税法`（位置 0）と `法人税法`（位置 8）で、`normalize` を省いたときと同じ位置。

### SPEC-ABBR-EXTRACT-LAW-NAMES-018 normalize を省くか false にすると全角と半角を別の文字として探す

`options` を渡さないとき、`{}`、`{ normalize: false }` のどれでも、全角と半角の違いは吸収しない。v0.6.1 までの `extractLawNames(text, options)` と同じ結果を返す。

例: `ＰＬ法の規定`（`options` なし）、`{ normalize: false }` はどちらも `[]`。`PL法の規定` は `options` の有無によらず `matchedKey: "PL法"` の 1 件。
