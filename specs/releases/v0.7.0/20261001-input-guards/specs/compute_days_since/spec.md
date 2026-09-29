# 差分: computeDaysSince（20261001-input-guards）

`specs/current/compute_days_since/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### 入力

| 引数        | 必須 | 内容                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fetchedAt` | 必須 | 取得時刻。ISO 8601 の次の 3 つの形だけを受け付ける。(a) 日付だけ `YYYY-MM-DD`（UTC の 0 時として扱う）、(b) UTC の時刻 `YYYY-MM-DDTHH:mm:ss(.sss)Z`、(c) 時差付きの時刻 `YYYY-MM-DDTHH:mm:ss(.sss)±hh:mm`。例: `2026-04-01T00:00:00Z` / `2026-04-01T00:00:00.000Z` / `2026-04-01` / `2026-04-01T09:00:00+09:00`。それ以外の書き方、時差の無い時刻、存在しない日付は `RangeError`、文字列でない値は `TypeError` を投げる |
| `nowMs`     | 任意 | 「今」とする時刻（1970-01-01T00:00:00Z からのミリ秒）。省略すると呼び出した時点のシステム時刻を使う。テストで時刻を固定するときに渡す。有限の数でなければ `RangeError`、数でない値は `TypeError` を投げる                                                                                                                                  |

houki-nta-mcp の `fetched_at` は (b) の形（`new Date().toISOString()`）、houki-egov-mcp の `sync_state.last_sync_date` は (a) の形で書かれている。

### 戻り値

`number`。`fetchedAt` から `nowMs` までの経過日数（0 以上の整数）。`fetchedAt` が受け付けない値のときは戻り値を返さず、例外を投げる。

`judgeStaleness` と組み合わせたときの結果（`nowMs` は `2026-05-08T00:00:00Z`）。

| `fetchedAt`                              | `computeDaysSince`      | `judgeStaleness(computeDaysSince(...))` | v0.6.1                    |
| ---------------------------------------- | ----------------------- | --------------------------------------- | ------------------------- |
| `"2026-05-07T00:00:00Z"`                 | `1`                     | `"fresh"`                               | 同じ                      |
| `"2026-05-07"`                           | `1`                     | `"fresh"`                               | 同じ                      |
| `"2026-05-08T09:00:00+09:00"`            | `0`                     | `"fresh"`                               | 同じ                      |
| `"2026-06-01T00:00:00Z"`（今より後）     | `0`                     | `"fresh"`                               | 同じ                      |
| `"not-a-date"`、`""`                     | `RangeError`            | 呼ばれない                              | `0` → `"fresh"`           |
| `"2026/05/07"`、`"May 7, 2026"`          | `RangeError`            | 呼ばれない                              | `1` → `"fresh"`           |
| `"2026-05-07T08:00:00"`（時差なし）      | `RangeError`            | 呼ばれない                              | 実行環境の時差で `0` か `1` |
| `"2026-02-30T00:00:00Z"`（存在しない日） | `RangeError`            | 呼ばれない                              | `67` → `"outdated"`       |
| `nowMs` に `NaN`                         | `RangeError`            | 呼ばれない                              | `NaN` → `"outdated"`      |

### SPEC-ABBR-COMPUTE-DAYS-SINCE-003 時刻として解釈できない文字列には RangeError を投げる

`fetchedAt` が受け付ける 3 つの形のどれにも当たらない文字列のときは、`0` を返さずに `RangeError` を投げる。壊れた取得時刻を `fresh` と判定させない。

例: `computeDaysSince('not-a-date', nowMs)` と `computeDaysSince('', nowMs)` はどちらも `RangeError`（v0.6.1 では `0`）。

## ADDED

### SPEC-ABBR-COMPUTE-DAYS-SINCE-005 日付だけ・UTC・時差付きの 3 つの形を受け付ける

`YYYY-MM-DD`、`YYYY-MM-DDTHH:mm:ssZ`（秒の小数 `.sss` があってもよい）、`YYYY-MM-DDTHH:mm:ss±hh:mm` の 3 つの形を受け付ける。日付だけの形は UTC の 0 時として扱う。

例（`nowMs` は `2026-05-08T00:00:00Z`）: `computeDaysSince('2026-05-07', nowMs)` → `1`、`computeDaysSince('2026-05-07T00:00:00.000Z', nowMs)` → `1`、`computeDaysSince('2026-05-08T09:00:00+09:00', nowMs)` → `0`（同じ時刻）、`computeDaysSince('2026-05-07T15:00:00-09:00', nowMs)` → `0`（同じ時刻）、`computeDaysSince('2026-04-24', nowMs)` → `14`。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-006 ISO 8601 以外の書き方には RangeError を投げる

`Date.parse` が読める書き方でも、3 つの形に当たらなければ `RangeError` を投げる。

例: `computeDaysSince('2026/05/07', nowMs)`、`computeDaysSince('May 7, 2026', nowMs)`、`computeDaysSince('20260507', nowMs)` は、どれも `RangeError`（v0.6.1 では前の 2 つは `1`）。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-007 時差の無い時刻には RangeError を投げる

`T` 以降があるのに末尾が `Z` でも `±hh:mm` でもない時刻は、実行環境の時差で結果が変わるので `RangeError` を投げる。

例: `computeDaysSince('2026-05-07T08:00:00', nowMs)` は `RangeError`（v0.6.1 では実行環境が UTC なら `0`、Asia/Tokyo なら `1`）。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-008 存在しない日付には RangeError を投げる

形は合っていても、暦に無い日付（2 月 30 日、13 月、4 月 31 日）は繰り上げずに `RangeError` を投げる。

例: `computeDaysSince('2026-02-30T00:00:00Z', nowMs)`、`computeDaysSince('2026-13-01', nowMs)`、`computeDaysSince('2026-04-31', nowMs)` は、どれも `RangeError`（v0.6.1 では 2 月 30 日を 3 月 2 日として `67`）。`computeDaysSince('2024-02-29', Date.parse('2024-03-01T00:00:00Z'))` は閏日なので `1`。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-009 有限でない nowMs には例外を投げる

`nowMs` が `NaN` か `Infinity` か `-Infinity` のときは `RangeError`、数でない値（文字列など）のときは `TypeError` を投げる。`undefined` は省いたときと同じくシステム時刻を使う。

例: `computeDaysSince('2026-05-07T00:00:00Z', NaN)` は `RangeError`（v0.6.1 では `NaN`）。`computeDaysSince('2026-05-07T00:00:00Z', '1')` は `TypeError`。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-010 文字列でない fetchedAt には TypeError を投げる

`fetchedAt` が文字列でないとき（`null`、`undefined`、数値、`Date`）は `TypeError` を投げる。

例: `computeDaysSince(null, nowMs)`、`computeDaysSince(undefined, nowMs)`、`computeDaysSince(1778198400000, nowMs)`、`computeDaysSince(new Date(), nowMs)` は、どれも `TypeError`。
