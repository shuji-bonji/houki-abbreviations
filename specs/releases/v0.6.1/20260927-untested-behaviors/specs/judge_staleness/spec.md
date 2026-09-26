# 差分: judgeStaleness（20260927-untested-behaviors）

`specs/current/judge_staleness/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-JUDGE-STALENESS-004 小数の日数も境界の値と「未満」で比べて判定する

`daysSince` が小数でも、整数のときと同じく `fresh_days`（7）・`stale_days`（30）と「未満」で比べて段階を返す。丸めはしない。

例: `6.99` → `"fresh"`、`29.5` → `"stale"`、`29.999` → `"stale"`、`30.0` → `"outdated"`。
