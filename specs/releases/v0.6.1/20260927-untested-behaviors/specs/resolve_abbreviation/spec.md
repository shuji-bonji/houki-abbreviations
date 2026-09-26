# 差分: resolveAbbreviation（20260927-untested-behaviors）

`specs/current/resolve_abbreviation/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-RESOLVE-ABBREVIATION-010 既定の照合でも前後の全角空白・タブ・改行を除く

`options` を渡さないとき（`options.normalize` が `false`）も、`name` の前後にある全角空白（`　`）・タブ・改行を半角空白と同じく除いてから照合する。

例: `resolveAbbreviation('　消法　')`（前後が全角空白）、`resolveAbbreviation('\t消法\n')`、`resolveAbbreviation('\r\n消法　\t')` はどれも `formal: "消費税法"` のエントリを返す。

### SPEC-ABBR-RESOLVE-ABBREVIATION-011 normalize: false・空のオブジェクト・null の options は options を省いたときと同じ

`options` に `{ normalize: false }`、`{}`、`null`、`undefined` のどれを渡しても、`options` を省いたときと同じ結果を返す。見つかるときは同じエントリ（同じオブジェクト）を返し、全角と半角の違いは吸収しない。

例: `resolveAbbreviation('消法', { normalize: false })`、`resolveAbbreviation('消法', {})`、`resolveAbbreviation('消法', null)` はどれも `resolveAbbreviation('消法')` と同じオブジェクト（`formal: "消費税法"`）を返す。`resolveAbbreviation('ＰＬ法', { normalize: false })`、`resolveAbbreviation('ＰＬ法', {})`、`resolveAbbreviation('ＰＬ法', null)` はどれも `null`。

### SPEC-ABBR-RESOLVE-ABBREVIATION-012 normalize: true でも別名からエントリを返す

`options.normalize` が `true` のときも、`name` が辞書のエントリの別名（`aliases` の要素）と一致すればそのエントリを返す。全角英字を含む `name` は、半角にしたものが別名と一致すればそのエントリを返す。

例: `resolveAbbreviation('消費税', { normalize: true })` は `resolveAbbreviation('消費税')` と同じオブジェクト（`abbr: "消法"`）を返す。`resolveAbbreviation('インボイス', { normalize: true })` も `abbr: "消法"` のエントリを返す。`resolveAbbreviation('ＡＭＬ', { normalize: true })` は別名 `AML` を持つ `abbr: "犯収法"` のエントリ、`resolveAbbreviation('ＪＰＫＩ法', { normalize: true })` は別名 `JPKI法` を持つ `abbr: "公的個人認証法"` のエントリを返す。

### SPEC-ABBR-RESOLVE-ABBREVIATION-013 name が null・undefined のときは null を返す

JavaScript から `name` に `null` または `undefined` を渡したときは、例外を投げずに `null` を返す。`options.normalize` が `true` でも同じ。

例: `resolveAbbreviation(null)`、`resolveAbbreviation(undefined)`、`resolveAbbreviation(null, { normalize: true })`、`resolveAbbreviation(undefined, { normalize: true })` はどれも `null`。
