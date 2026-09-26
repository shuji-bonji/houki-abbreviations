# 差分: extractLawNames（20260927-untested-behaviors）

`specs/current/extract_law_names/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-EXTRACT-LAW-NAMES-010 preferLonger を指定しなければ true として扱う

`options` に `preferLonger` を入れなければ、`preferLonger: true` と同じく、ほかの、より長い一致の範囲にすっぽり入る短い一致を返さない。

例: `民法の解釈`、`{ minLength: 1 }`（`preferLonger` なし）→ `民`（位置 0、長さ 1）の一致は無く、`民法`（位置 0、長さ 2）の一致はある。同じ入力に `preferLonger: false` を足すと `民` の一致も返る。

### SPEC-ABBR-EXTRACT-LAW-NAMES-011 minLength が 1 未満なら 1 として扱う

`minLength` に 0 や負の数を渡すと、`minLength: 1` と同じく 1 文字のキーも探す。

例: `民の規定`、`{ minLength: 0 }` → `matchedKey: "民"`、`position: 0` の一致がある。`{ minLength: -5 }` でも同じ。`minLength` を指定しなければ、同じ `民の規定` は `[]`。

### SPEC-ABBR-EXTRACT-LAW-NAMES-012 同じ位置・同じ長さで別のエントリに一致したら両方を返す

2 件の別のエントリが同じキーを持ち、そのキーが `text` に出てくれば、同じ `position`・同じ `length` の一致を、エントリごとに 1 件ずつ返す。どちらもほかの一致より短くはないので、`preferLonger: true` でも除かない。`abbr` が違うので、`dedupe: true` でも 1 件にしない。

v0.6.0 の同梱辞書には、別のエントリどうしで同じキーが無い。この振る舞いは `src/validate.ts` の `extractLawNames(entries, text, options)` にエントリの配列を渡して確かめる。

例: エントリ `{ abbr: "甲", formal: "甲法" }` と `{ abbr: "乙", formal: "乙法", aliases: ["甲法"] }` の 2 件、`甲法の規定` → 2 件。どちらも `matchedKey: "甲法"`、`position: 0`、`length: 2` で、1 件目の `entry.abbr` は `甲`、2 件目は `乙`。`{ dedupe: true }` を渡しても同じ 2 件。

### SPEC-ABBR-EXTRACT-LAW-NAMES-013 dedupe: true では並べた順で最初の一致を残す

`dedupe: true` のとき、同じエントリへの一致のうち、戻り値の並び（`position` の小さい順、同じ `position` なら `length` の大きい順）で最初の 1 件を残す。長いキーの一致が後ろにあっても、前の短いキーの一致を残す。

例: `消法と消費税法`、`{ dedupe: true }` → 1 件。`matchedKey: "消法"`、`position: 0`（エントリは `消法`）。`消費税法`（位置 3）の一致は返さない。

### SPEC-ABBR-EXTRACT-LAW-NAMES-014 text が null か undefined なら空の配列を返す

`text` に `null` か `undefined` を渡すと、辞書を探さずに `[]` を返す。

例: `extractLawNames(null)` と `extractLawNames(undefined)` は、どちらも `[]`。
