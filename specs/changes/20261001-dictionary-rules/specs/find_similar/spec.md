# 差分: findSimilar（20261001-dictionary-rules）

`specs/current/find_similar/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

`limit` の規則（1 以上 500 以下の整数）は `spec/20261001-input-guards` の差分のとおり。この差分は「近さ」の決め方だけを変える。

## MODIFIED

### アクター

- houki-abbreviations を import する利用者（houki-nta-mcp・houki-egov-mcp などの MCP サーバー、または独自のコード）。`労働基準法施行例` のように 1〜2 文字誤った名前を渡して、近い名前を持つ辞書のエントリと、その近さ（編集距離）を受け取る
- この関数は編集距離で近い名前を返す関数で、名前の一部から一覧を得る関数ではない。`民法` のような短い名前を渡しても、`民` で始まる法令の一覧にはならない。一覧が欲しいときは `searchByName` を使う（README と JSDoc にも同じ文を書く）

### 入力

| 引数                  | 必須 | 内容                                                                                                                                                                           |
| --------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `query`               | 必須 | 探す名前。例: `労働基準法` / `消費税法施行令例`。前後の空白は無視する                                                                                                          |
| `options.maxDistance` | 任意 | 返すエントリの編集距離の上限。既定 2。編集距離がこの値以下でも、距離の比（下記）がしきい値を超える名前は返さない                                                               |
| `options.limit`       | 任意 | 返す件数の上限。1 以上 500 以下の整数。省くと 5                                                                                                                                |
| `options.sortByScore` | 任意 | 編集距離の小さい順に並べるか。既定 `true`                                                                                                                                      |
| `options.filter`      | 任意 | 絞り込み。型は `SearchFilter`（`searchByName` と同じ）。キーは `domain` / `category` / `source_mcp_hint` で、それぞれ単一の値か配列を取る                                      |
| `options.normalize`   | 任意 | 全角英数字・ダッシュ類・全角チルダ・全角スペースを半角にしてから比べるか。既定 `true`                                                                                          |

型は `FuzzyOptions`。辞書は関数が持っている（v0.6.1 で 174 件）。エントリの配列を渡す引数は無い。

距離の比: `query` と名前の編集距離を、2 つのうち長い方の文字数（コードポイント数）で割った値。比が 1/3 を超える名前は、`maxDistance` 以下でも返さない（`距離 × 3 ≤ 長い方の文字数` のときだけ返す）。距離 0（一致）は文字数によらず返す。この比は指定できない。

| 長い方の文字数 | 返す編集距離 |
| -------------- | ------------ |
| 1〜2           | 0            |
| 3〜5           | 0〜1         |
| 6〜8           | 0〜2         |
| 9 以上         | 0〜3（既定の `maxDistance: 2` では 0〜2） |

### SPEC-ABBR-FIND-SIMILAR-001 名前が一致するエントリは distance 0 で先頭に返す

`query` がエントリの略称・正式名称・別名のどれかと一致するとき、そのエントリを `distance: 0` で返す。既定の並び順では先頭に来る。

例: `findSimilar('所得税法施行令')` の先頭は `entry.abbr: "所令"`、`entry.formal: "所得税法施行令"`、`matchedKey: "所得税法施行令"`、`distance: 0`。続いて `所規`（`所得税法施行規則`、2）・`法令`（`法人税法施行令`、2）・`消令`（`消費税法施行令`、2）・`相令`（`相続税法施行令`、2）。`findSimilar('労働基準法')` は `労基法`（`労働基準法`、0）の 1 件（v0.6.1 では `労契法`・`労組法`・`建基法` も距離 2 で続いていたが、5 文字に対する距離 2 は比が 1/3 を超えるので返さない）。

### SPEC-ABBR-FIND-SIMILAR-003 既定では編集距離の小さい順に並べる

`sortByScore` を省くか `true` にすると、`distance` の小さい順に並べてから返す。

例: `findSimilar('法人税法施行令')` は `法令`（0）・`所令`（2）・`法規`（2）・`消令`（2）・`相令`（2）の順。辞書では `所令` が `法令` より前にあるが、距離の順で `法令` が先頭になる。

### SPEC-ABBR-FIND-SIMILAR-004 limit の件数で打ち切る

候補が `limit` を超えるときは、並べた後で `limit` 件に打ち切って返す。

例: `findSimilar('所得税法施行令', { limit: 3 })` は 3 件を返す（`limit` を付けなければ 5 件、`limit: 500` なら 7 件）。

### SPEC-ABBR-FIND-SIMILAR-005 filter で候補のエントリを絞る

`filter` を渡すと、その条件に当たるエントリだけを候補にする。キーの意味は `searchByName` と同じ（SPEC-ABBR-SEARCH-BY-NAME-005）。

例: `findSimilar('所得税法施行令', { filter: { domain: 'tax' }, limit: 100 })` は 7 件を返し、すべて `entry.domain: "tax"`。`findSimilar('所得税法施行令', { filter: { domain: 'labor' }, limit: 100 })` は `[]`。

### SPEC-ABBR-FIND-SIMILAR-008 normalize が false のときは全角英数字をそのまま比べる

`normalize: false` のときは、全角英数字を半角にせずに編集距離を求める。

例: `findSimilar('ＰＬ法', { normalize: false })` は `[]`（`PL法` との距離 2 は 3 文字に対して比が 1/3 を超える）。`findSimilar('ＰＬ法')` は `製造物責任法` のエントリ（`matchedKey: "PL法"`、`distance: 0`）を返す。

### SPEC-ABBR-FIND-SIMILAR-010 sortByScore が false のときは辞書の並びのまま limit 件で打ち切る

`sortByScore: false` のときは、`distance` で並べ替えず、`abbreviationEntries` の並びのまま候補を `limit` 件で打ち切って返す。辞書の後ろにある距離の小さいエントリが打ち切りで入らないことがある。

例: `findSimilar('法人税法施行令', { sortByScore: false })` は `所令`（2）・`法令`（0）・`法規`（2）・`消令`（2）・`相令`（2）の 5 件で、距離 0 の `法令` が 2 番目に来る。`findSimilar('法人税法施行令', { sortByScore: false, limit: 1 })` は `所令`（2）の 1 件で、`法令` は入らない。

### SPEC-ABBR-FIND-SIMILAR-011 distance が同じエントリは辞書の並びのまま並べる

`distance` の小さい順に並べるとき、`distance` が同じエントリどうしは `abbreviationEntries` での並びを保つ。

例: `findSimilar('所得税法施行令', { limit: 100 })` の `distance: 2` の 6 件は `所規`・`法令`・`消令`・`相令`・`印令`・`地税令` の順で、v0.6.1 の `abbreviationEntries` での順と同じ。

### SPEC-ABBR-FIND-SIMILAR-012 limit を省くと 5 件で打ち切る

`limit` を省くと、候補が 5 件を超えるときに 5 件で打ち切る。

例: `findSimilar('所得税法施行令')` は 5 件を返す（`limit: 500` なら 7 件）。

### SPEC-ABBR-FIND-SIMILAR-014 maxDistance を省くと 2 として扱う

`maxDistance` を省くと、編集距離が 2 以下のエントリだけを返す。

例: `findSimilar('租税特別措置法施行令', { limit: 100 })` は `措令`（`租税特別措置法施行令`、0）と `措規`（`租税特別措置法施行規則`、2）の 2 件で、`distance: 3` の `措法`（`租税特別措置法`）は入らない（`maxDistance: 3` なら `措法` も入る。10 文字に対する距離 3 は比が 1/3 以下）。

### SPEC-ABBR-FIND-SIMILAR-017 1 つのエントリで距離が同じ名前が複数あるときは、略称・正式名称・別名の順で先の名前を matchedKey にする

エントリの名前のうち `query` との編集距離が最も小さいものが 2 つ以上あるときは、`abbr`・`formal`・`aliases`（辞書の順）の順で先に来る名前を `matchedKey` にする。

例: `findSimilar('消費法', { maxDistance: 1 })` の `消法` は、略称 `消法` と正式名称 `消費税法` と別名 `消費税` がどれも距離 1 で、`matchedKey: "消法"`。`findSimilar('消費税X', { maxDistance: 1 })` の `消法` は、正式名称 `消費税法` と別名 `消費税` がどちらも距離 1 で、`matchedKey: "消費税法"`。

## ADDED

### SPEC-ABBR-FIND-SIMILAR-021 編集距離の比が 1/3 を超える名前は返さない

`query` と名前の編集距離を、2 つのうち長い方の文字数（コードポイント数）で割った比が 1/3 を超える名前は、`maxDistance` 以下でも候補にしない。`距離 × 3 ≤ 長い方の文字数` のときだけ候補にする。2〜3 文字の `query` が、意味の違う短い略称に当たることを防ぐ。

例: `findSimilar('民法')` は `民`（`民法`、0）に続いて `民訴`（`民訴法`、1）・`民執`（`民執法`、1）・`民保`（`民保法`、1）の 4 件（v0.6.1 では `所法`・`法法`・`消法`・`措法` が距離 1 で続いていた。2 文字に対する距離 1 は比 1/2）。`findSimilar('法', { maxDistance: 5, limit: 100 })` は `[]`（v0.6.1 では 165 件）。`findSimilar('労基側')` は `労基法`（1）と `労基則`（1）の 2 件（3 文字に対する距離 1 は比 1/3）。

### SPEC-ABBR-FIND-SIMILAR-022 距離 0 の一致は文字数によらず返す

`query` が名前と一致するときは、名前が 1 文字でも `distance: 0` で返す。`query` の最短文字数は設けない。

例: `findSimilar('民')` は `民`（`matchedKey: "民"`、`distance: 0`）の 1 件。`findSimilar('会社')` は `会社`（`matchedKey: "会社"`、0）と `会社規`（`会社規`、1）の 2 件。
