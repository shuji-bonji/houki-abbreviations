# 差分: normalizeLawNum（20260927-untested-behaviors）

`specs/current/normalize_law_num/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-NORMALIZE-LAW-NUM-010 読めない漢数字の並びはそのまま残す

`kanjiToNumber` が `null` を返す漢数字の並びは、算用数字にせず元の文字のまま残す。同じ入力の中の読める並びは算用数字にする。

例: `normalizeLawNum('昭和十十年法律第一号')` は `'昭和十十年法律第1号'`。

### SPEC-ABBR-NORMALIZE-LAW-NUM-011 空白で分かれた元年も 1 年にする

空白を取り除いてから `元年` を `1年` にするので、`元` と `年` のあいだや前後に空白があっても `1年` になる。

例: `normalizeLawNum('令和 元 年法律第一号')` は `'令和1年法律第1号'`。

### SPEC-ABBR-NORMALIZE-LAW-NUM-012 U+2015 以外のダッシュ類も半角ハイフンにする

`‐`（U+2010）、`‑`（U+2011）、`–`（U+2013）、`—`（U+2014）、`−`（U+2212）も、`―`（U+2015）と同じく `-` にする。

例: `normalizeLawNum('昭和二十四年人事院規則一‐一')`、`normalizeLawNum('昭和二十四年人事院規則一‑一')`、`normalizeLawNum('昭和二十四年人事院規則一–一')`、`normalizeLawNum('昭和二十四年人事院規則一—一')`、`normalizeLawNum('昭和二十四年人事院規則一−一')` はどれも `'昭和24年人事院規則1-1'`。

### SPEC-ABBR-NORMALIZE-LAW-NUM-013 罫線と長音は半角ハイフンにしない

罫線 `─`（U+2500）と長音 `ー`（U+30FC）はダッシュ類として扱わず、変えない。

例: `normalizeLawNum('昭和二十四年人事院規則一─一')` は `'昭和24年人事院規則1─1'`、`normalizeLawNum('昭和二十四年人事院規則一ー一')` は `'昭和24年人事院規則1ー1'`。

### SPEC-ABBR-NORMALIZE-LAW-NUM-014 null と undefined には空文字を返す

`input` が `null` または `undefined` のときは `''` を返す。

例: `normalizeLawNum(null)` も `normalizeLawNum(undefined)` も `''`。
