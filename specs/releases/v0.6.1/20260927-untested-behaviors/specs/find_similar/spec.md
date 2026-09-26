# 差分: findSimilar（20260927-untested-behaviors）

`specs/current/find_similar/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-FIND-SIMILAR-007 既定では全角英数字を半角にしてから比べる

`normalize` を省くか `true` にすると、`query` と辞書の名前の両方の全角英数字を半角にしてから編集距離を求める。

例: `findSimilar('ＰＬ法')` の先頭は `entry.formal: "製造物責任法"`、`matchedKey: "PL法"`、`distance: 0`。

### SPEC-ABBR-FIND-SIMILAR-008 normalize が false のときは全角英数字をそのまま比べる

`normalize: false` のときは、全角英数字を半角にせずに編集距離を求める。

例: `findSimilar('ＰＬ法', { normalize: false })` は `所法`・`法法`・`消法`・`措法`・`相法`（どれも `distance: 2`）で、`製造物責任法` のエントリは入らない。

### SPEC-ABBR-FIND-SIMILAR-009 全角で引いても matchedKey は辞書の表記のまま返す

`normalize` で半角にして比べたときも、`matchedKey` には半角にした後の文字列ではなく、辞書に書かれている名前をそのまま入れる。

例: `findSimilar('ＰＬ法')` の先頭の `matchedKey` は、辞書の別名と同じ `PL法`。

### SPEC-ABBR-FIND-SIMILAR-010 sortByScore が false のときは辞書の並びのまま limit 件で打ち切る

`sortByScore: false` のときは、`distance` で並べ替えず、`abbreviationEntries` の並びのまま候補を `limit` 件で打ち切って返す。辞書の後ろにある距離の小さいエントリが打ち切りで入らないことがある。

例: `findSimilar('労働基準法施行例', { maxDistance: 5, sortByScore: false })` は `所令`・`法令`・`消令`・`相令`・`通令`（どれも `distance: 5`）の 5 件で、`distance: 2` の `労基則` は入らない。

### SPEC-ABBR-FIND-SIMILAR-011 distance が同じエントリは辞書の並びのまま並べる

`distance` の小さい順に並べるとき、`distance` が同じエントリどうしは `abbreviationEntries` での並びを保つ。

例: `findSimilar('労働基準法施行例', { maxDistance: 5, limit: 100 })` の `distance: 5` の 10 件は `所令`・`法令`・`消令`・`相令`・`通令`・`印令`・`地税令`・`労契法`・`労組法`・`建基法` の順で、v0.6.0 の `abbreviationEntries` での順と同じ。

### SPEC-ABBR-FIND-SIMILAR-012 limit を省くと 5 件で打ち切る

`limit` を省くと、候補が 5 件を超えるときに 5 件で打ち切る。

例: `findSimilar('法', { maxDistance: 5 })` は 5 件を返す（`limit: 1000` なら 165 件）。

### SPEC-ABBR-FIND-SIMILAR-013 1 未満の limit は 1 として扱う

`limit` が 1 未満のとき（0・負の値・0.5 など）は 1 として扱い、候補があれば 1 件を返す。

例: `findSimilar('法', { maxDistance: 5, limit: 0 })`・`{ …, limit: -1 }`・`{ …, limit: 0.5 }` は、どれも `所法`（`distance: 1`）の 1 件。

### SPEC-ABBR-FIND-SIMILAR-014 maxDistance を省くと 2 として扱う

`maxDistance` を省くと、編集距離が 2 以下のエントリだけを返す。

例: `findSimilar('労働基準法施行例', { limit: 100 })` は `労基則`（`distance: 2`）の 1 件で、`distance: 3` の `労基法` は入らない（`maxDistance: 3` なら `労基法` も入る）。

### SPEC-ABBR-FIND-SIMILAR-015 maxDistance が 0 のときは名前が一致するエントリだけを返す

`maxDistance: 0` のときは、略称・正式名称・別名のどれかが `query` と一致するエントリだけを、`distance: 0` で返す。

例: `findSimilar('消費税', { maxDistance: 0 })` は、別名 `消費税` に一致した `消法`（`matchedKey: "消費税"`、`distance: 0`）の 1 件。

### SPEC-ABBR-FIND-SIMILAR-016 maxDistance が負の値のときは空配列を返す

`maxDistance` が負の値のときは、名前が一致するエントリがあっても空配列を返す。エラーにはしない。

例: `findSimilar('消費税', { maxDistance: -1 })` と `findSimilar('消法', { maxDistance: -1 })` はどちらも `[]`。

### SPEC-ABBR-FIND-SIMILAR-017 1 つのエントリで距離が同じ名前が複数あるときは、略称・正式名称・別名の順で先の名前を matchedKey にする

エントリの名前のうち `query` との編集距離が最も小さいものが 2 つ以上あるときは、`abbr`・`formal`・`aliases`（辞書の順）の順で先に来る名前を `matchedKey` にする。

例: `findSimilar('消費', { maxDistance: 1 })` の `消法` は、略称 `消法` と別名 `消費税` がどちらも距離 1 で、`matchedKey: "消法"`。`findSimilar('消費税X', { maxDistance: 1 })` の `消法` は、正式名称 `消費税法` と別名 `消費税` がどちらも距離 1 で、`matchedKey: "消費税法"`。
