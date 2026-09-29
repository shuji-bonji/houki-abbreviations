# 差分: normalizeSearchQuery（20261001-normalize）

`specs/current/normalize_search_query/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### SPEC-ABBR-NORMALIZE-SEARCH-QUERY-001 normalizeJpText と同じ全角→半角の変換をする

全角数字・全角英字・ダッシュ類（`－` `‐` `‑` `–` `—` `―` `−`）・全角チルダ・波ダッシュ・全角スペースを、`normalizeJpText` と同じ規則で半角にする。

例: `normalizeSearchQuery('１８３－２')` は `'183-2'`、`normalizeSearchQuery('１８３―２')` も `'183-2'`、`normalizeSearchQuery('１８３〜１９３')` は `'183~193'`。

### SPEC-ABBR-NORMALIZE-SEARCH-QUERY-002 英大文字を小文字にする

半角の英大文字 `A`〜`Z` を `a`〜`z` にする。全角の英大文字は半角にしたうえで小文字にする。小文字にするのはこの 52 字の範囲だけ。

例: `normalizeSearchQuery('PL法')` も `normalizeSearchQuery('ＰＬ法')` も `'pl法'`。

## ADDED

### SPEC-ABBR-NORMALIZE-SEARCH-QUERY-008 英字以外の大文字は変えない

`A`〜`Z`（全角なら `Ａ`〜`Ｚ`）以外の文字は小文字にしない。ローマ数字 `Ⅰ`（U+2160）、ギリシャ文字 `Α`（U+0391）、ラテン文字の拡張 `À`（U+00C0）はそのまま残す。

例: `normalizeSearchQuery('Ⅰ Α À PL')` は `'Ⅰ Α À pl'`（v0.6.1 では `'ⅰ α à pl'`）。
