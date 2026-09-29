# 差分: judgeStaleness（20261001-input-guards）

`specs/current/judge_staleness/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### 入力

| 引数        | 必須 | 内容                                                                                                                                                                              |
| ----------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daysSince` | 必須 | 経過日数。0 以上の有限の数。通常は `computeDaysSince` の戻り値を渡す。小数でもよい。負の値、`NaN`、`Infinity`、`-Infinity` は `RangeError`、数でない値は `TypeError` を投げる |

## ADDED

### SPEC-ABBR-JUDGE-STALENESS-005 負の値には RangeError を投げる

`daysSince` が負の値のときは、`"fresh"` を返さずに `RangeError` を投げる。0 に丸めるのは呼び出し側の責任にしない。

例: `judgeStaleness(-5)` と `judgeStaleness(-0.5)` は `RangeError`（v0.6.1 では `"fresh"`）。`judgeStaleness(0)` は `"fresh"`。

### SPEC-ABBR-JUDGE-STALENESS-006 NaN・Infinity・数でない値には例外を投げる

`daysSince` が `NaN` か `Infinity` か `-Infinity` のときは `RangeError`、数でない値（文字列・`null`・`undefined` など）のときは `TypeError` を投げる。3 つの段階のどれにも当てはめない。

例: `judgeStaleness(NaN)` は `RangeError`（v0.6.1 では `"outdated"`）。`judgeStaleness(Infinity)` と `judgeStaleness(-Infinity)` も `RangeError`（v0.6.1 では `"outdated"` と `"fresh"`）。`judgeStaleness('7')`、`judgeStaleness(null)`、`judgeStaleness(undefined)` は `TypeError`。
