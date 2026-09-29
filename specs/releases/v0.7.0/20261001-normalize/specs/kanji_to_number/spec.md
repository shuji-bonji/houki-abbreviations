# 差分: kanjiToNumber（20261001-normalize）

`specs/current/kanji_to_number/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-KANJI-TO-NUMBER-009 位ごとの並びが 16 文字以上なら null を返す

位ごとの書き方（`十` `百` `千` を含まない並び）で 16 文字以上の入力は、値が正確に表せないので `null` を返す。丸めた値は返さない。15 文字までは読む。位取りの書き方は千の位までしか無いので、この上限は関係しない。

例: `kanjiToNumber('一'.repeat(15))` は `111111111111111`（15 桁）。`kanjiToNumber('一'.repeat(16))` は `null`（v0.6.1 では `1111111111111111`）。`kanjiToNumber('一'.repeat(20))` は `null`（v0.6.1 では `11111111111111110000`）。`kanjiToNumber('〇'.repeat(20))` も `null`。
