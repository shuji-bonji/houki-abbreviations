# 差分: normalizeJpText（20260927-untested-behaviors）

`specs/current/normalize_jp_text/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-NORMALIZE-JP-TEXT-009 null と undefined には空文字を返す

`input` が `null` または `undefined` のときは `''` を返す。

例: `normalizeJpText(null)` も `normalizeJpText(undefined)` も `''`。

### SPEC-ABBR-NORMALIZE-JP-TEXT-010 表に無い全角記号は変えない

戻り値の表に無い全角記号（`／` `（` `）` `＃` `＿` `！` など）は半角にしない。

例: `normalizeJpText('／（）＃＿！')` は `'／（）＃＿！'`。

### SPEC-ABBR-NORMALIZE-JP-TEXT-011 前後のタブ・改行・ノーブレークスペースも取り除く

前後の空白として取り除くのは、半角スペース・全角スペースのほか、タブ・改行（`\n` `\r`）・ノーブレークスペース（U+00A0）も含む。途中にあるタブは残す。

例: `normalizeJpText('\t消法\n')` は `'消法'`、`normalizeJpText('\r\n消法\r\n')` は `'消法'`、`normalizeJpText(' 消法 ')` は `'消法'`、`normalizeJpText('消\t法')` は `'消\t法'`。
