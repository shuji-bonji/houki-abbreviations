# 差分: kanjiToNumber（20260927-untested-behaviors）

`specs/current/kanji_to_number/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-KANJI-TO-NUMBER-005 位ごとの並びの先頭の〇は数に入れない

位ごとの並びの先頭にある `〇` は、算用数字の先頭の 0 と同じく値に影響しない。`〇` だけの並びは 0。

例: `kanjiToNumber('〇五')` → 5、`kanjiToNumber('〇一三')` → 13、`kanjiToNumber('〇〇')` → 0。

### SPEC-ABBR-KANJI-TO-NUMBER-006 文字列でない値には null を返す

`input` が文字列でないとき（数値・`null`・`undefined`）は `null` を返す。

例: `kanjiToNumber(123)`、`kanjiToNumber(null)`、`kanjiToNumber(undefined)` はどれも `null`。

### SPEC-ABBR-KANJI-TO-NUMBER-007 空白を含む入力には null を返す

空白を取り除かない。前後や途中に空白が 1 つでもあれば `null` を返す。

例: `kanjiToNumber(' 五')` → `null`、`kanjiToNumber('五 ')` → `null`、`kanjiToNumber('二十 五')` → `null`。

### SPEC-ABBR-KANJI-TO-NUMBER-008 単位の前の一は十・百でも 1 として読む

`千` と同じく、`十` `百` の前に `一` を書いても、書かないときと同じ値になる。

例: `kanjiToNumber('一十')` → 10、`kanjiToNumber('一百')` → 100、`kanjiToNumber('一千一百一十一')` → 1111、`kanjiToNumber('千百十')` → 1110。
