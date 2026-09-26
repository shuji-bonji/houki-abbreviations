# 差分: searchByName（20260927-untested-behaviors）

`specs/current/search_by_name/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-SEARCH-BY-NAME-009 一致したエントリを辞書の並びのまま返す

一致したエントリは `abbreviationEntries` での並びのまま返す。一致の近さや名前の長さでは並べ替えない。

例: `searchByName('労働')` は `労基法`・`労基則`・`労契法`・`労組法`・`労調法`・`安衛法`・`安衛則`・`派遣法`・`労災法`・`徴収法`・`育介法`・`パート法` の 12 件で、この順は v0.6.0 の `abbreviationEntries` での順と同じ。

### SPEC-ABBR-SEARCH-BY-NAME-010 複数の名前が一致しても 1 つのエントリは 1 回だけ返す

1 つのエントリの略称・正式名称・別名のうち 2 つ以上が `query` に一致しても、そのエントリは結果に 1 回だけ入る。

例: `searchByName('消費税')` は `消法`（`formal: "消費税法"`、別名 `消費税` も一致）・`消令`・`消規`・`消基通` の 4 件で、`消法` は 1 回だけ。

### SPEC-ABBR-SEARCH-BY-NAME-011 既定では全角英数字を半角にしてから比べる

`normalize` を省くか `true` にすると、`query` と辞書の名前の両方の全角英数字を半角にしてから比べる。

例: `searchByName('ＰＬ法')` は、別名 `PL法` を持つ `製造物責任法` のエントリを返す（`searchByName('PL法')` と同じ結果）。

### SPEC-ABBR-SEARCH-BY-NAME-012 normalize が false のときは全角英数字をそのまま比べる

`normalize: false` のときは、全角英数字を半角にせずに比べる。

例: `searchByName('ＰＬ法', { normalize: false })` は `[]`。

### SPEC-ABBR-SEARCH-BY-NAME-013 filter.category で文書の種類を絞る

`filter.category` を渡すと、`category` がその値のエントリだけを返す。単一の値でも配列でもよい。

例: `searchByName('通達', { filter: { category: ['kihon-tsutatsu'] } })` は `消基通`・`所基通`・`法基通`・`相基通`・`通基通`・`徴基通`・`措通`・`印基通` の 8 件で、すべて `category: "kihon-tsutatsu"`。`{ category: 'kihon-tsutatsu' }` と単一の値で渡しても同じ 8 件。

### SPEC-ABBR-SEARCH-BY-NAME-014 filter に複数のキーを渡すと、すべてを満たすエントリだけを返す

`filter` に `domain`・`category`・`source_mcp_hint` のうち 2 つ以上を渡すと、渡したキーのすべての条件に当たるエントリだけを返す。

例: `searchByName('税', { filter: { domain: 'tax', source_mcp_hint: 'houki-nta' } })` は 9 件で、すべて `domain: "tax"` かつ `source_mcp_hint: "houki-nta"`（`domain: 'tax'` だけなら 35 件）。

### SPEC-ABBR-SEARCH-BY-NAME-015 filter のキーに空の配列を渡すと、そのキーでは絞らない

`filter` のキーに空の配列を渡したときは、そのキーの条件を付けなかったときと同じに扱う。

例: `searchByName('税', { filter: { domain: [] } })` は、`searchByName('税')` と同じ 37 件。

### SPEC-ABBR-SEARCH-BY-NAME-016 limit を省くと 50 件で打ち切る

`limit` を省くと、一致したエントリが 50 件を超えるときに 50 件で打ち切る。

例: `searchByName('法')` は 50 件を返す（`limit: 500` なら 167 件）。

### SPEC-ABBR-SEARCH-BY-NAME-017 1 未満の limit は 1 として扱う

`limit` が 1 未満のとき（0・負の値・0.5 など）は 1 として扱い、一致したエントリがあれば 1 件を返す。

例: `searchByName('法', { limit: 0 })`・`{ limit: -3 }`・`{ limit: 0.5 }` は、どれも `所法` の 1 件（`limit: 1` と同じ）。

### SPEC-ABBR-SEARCH-BY-NAME-018 小数の limit は切り上げた件数で打ち切る

`limit` が 1 以上の小数のときは、切り上げた整数の件数で打ち切る。

例: `searchByName('法', { limit: 1.2 })` は 2 件、`{ limit: 2.5 }` と `{ limit: 2.9 }` は 3 件を返す。
