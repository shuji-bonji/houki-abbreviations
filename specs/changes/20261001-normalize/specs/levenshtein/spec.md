# 差分: levenshtein（20261001-normalize）

`specs/current/levenshtein/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### SPEC-ABBR-LEVENSHTEIN-002 片方が空文字ならもう一方の文字数を返す

どちらかが空文字なら、もう一方の文字数（コードポイント数）を返す。両方とも空文字なら 0。

例: `levenshtein('', 'abc')` と `levenshtein('abc', '')` はどちらも 3。`levenshtein('', '')` は 0。`levenshtein('', '𠮷')` は 1（`'𠮷'.length` は 2 だが、1 文字と数える）。

## ADDED

### SPEC-ABBR-LEVENSHTEIN-005 BMP の外の文字を 1 文字として数える

文字はコードポイント単位で数える。サロゲートペアで表す文字（`𠮷` U+20BB7 など）は 1 文字で、その置換は 1 回と数える。

例: `levenshtein('𠮷', '吉')` は 1（v0.6.1 では 2）。`levenshtein('𠮷野家', '吉野家')` は 1。`levenshtein('𠮷', '')` は 1。`findSimilar` と `suggestCorrection` の `distance` もこの数え方になる。
