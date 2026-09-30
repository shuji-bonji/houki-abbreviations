# 機能: computeDaysSince（取得時刻から今までの経過日数を返す）

- 機能 ID: ABBR
- 版: current
- 承認日: 2026-09-27 （PR #26）。差分 `20261001-input-guards` は 2026-09-30（PR #31）
- 起こした元: v0.6.0 の `src/freshness.ts`（`computeDaysSince`）、`src/freshness.test.ts`
- 関連する Issue: houki-abbreviations #3（JSDoc の強化）。共通化の発端は houki-nta-mcp #15

この文書は「この関数は何をするか」を書きます。どう実装しているか（内部の変数名・計算の手順）は書きません。

## アクター

- houki-hub family の MCP サーバー（houki-nta-mcp など）。自分のローカル DB やキャッシュに持っている取得時刻 `fetched_at` を渡して経過日数を受け取り、`judgeStaleness` に渡して鮮度を判定する

## 入力

| 引数        | 必須 | 内容                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchedAt` | 必須 | 取得時刻。ISO 8601 の次の 3 つの形だけを受け付ける。(a) 日付だけ `YYYY-MM-DD`（UTC の 0 時として扱う）、(b) UTC の時刻 `YYYY-MM-DDTHH:mm:ss(.sss)Z`、(c) 時差付きの時刻 `YYYY-MM-DDTHH:mm:ss(.sss)±hh:mm`。例: `2026-04-01T00:00:00Z` / `2026-04-01T00:00:00.000Z` / `2026-04-01` / `2026-04-01T09:00:00+09:00`。それ以外の書き方、時差の無い時刻、存在しない日付は `RangeError`、文字列でない値は `TypeError` を投げる |
| `nowMs`     | 任意 | 「今」とする時刻（1970-01-01T00:00:00Z からのミリ秒）。省略すると呼び出した時点のシステム時刻を使う。テストで時刻を固定するときに渡す。有限の数でなければ `RangeError`、数でない値は `TypeError` を投げる                                                                                                                                                                                                               |

houki-nta-mcp の `fetched_at` は (b) の形（`new Date().toISOString()`）、houki-egov-mcp の `sync_state.last_sync_date` は (a) の形で書かれている。

## 戻り値

`number`。`fetchedAt` から `nowMs` までの経過日数（0 以上の整数）。`fetchedAt` が受け付けない値のときは戻り値を返さず、例外を投げる。

`judgeStaleness` と組み合わせたときの結果（`nowMs` は `2026-05-08T00:00:00Z`）。

| `fetchedAt`                              | `computeDaysSince` | `judgeStaleness(computeDaysSince(...))` | v0.6.1                      |
| ---------------------------------------- | ------------------ | --------------------------------------- | --------------------------- |
| `"2026-05-07T00:00:00Z"`                 | `1`                | `"fresh"`                               | 同じ                        |
| `"2026-05-07"`                           | `1`                | `"fresh"`                               | 同じ                        |
| `"2026-05-08T09:00:00+09:00"`            | `0`                | `"fresh"`                               | 同じ                        |
| `"2026-06-01T00:00:00Z"`（今より後）     | `0`                | `"fresh"`                               | 同じ                        |
| `"not-a-date"`、`""`                     | `RangeError`       | 呼ばれない                              | `0` → `"fresh"`             |
| `"2026/05/07"`、`"May 7, 2026"`          | `RangeError`       | 呼ばれない                              | `1` → `"fresh"`             |
| `"2026-05-07T08:00:00"`（時差なし）      | `RangeError`       | 呼ばれない                              | 実行環境の時差で `0` か `1` |
| `"2026-02-30T00:00:00Z"`（存在しない日） | `RangeError`       | 呼ばれない                              | `67` → `"outdated"`         |
| `nowMs` に `NaN`                         | `RangeError`       | 呼ばれない                              | `NaN` → `"outdated"`        |

## 処理の流れ

図の中の番号は「できること」の仕様 ID の末尾 3 桁です。

```mermaid
flowchart TD
  A["呼び出し（fetchedAt, nowMs）"] --> B{"fetchedAt を時刻として解釈できるか"}
  B -- いいえ --> E1["0 を返す（003）"]
  B -- はい --> N{"nowMs が渡されたか"}
  N -- いいえ --> N2["呼び出した時点のシステム時刻を使う（004）"]
  N -- はい --> C
  N2 --> C{"fetchedAt が今より後か"}
  C -- はい --> E2["0 を返す（002）"]
  C -- いいえ --> D["経過時間を 24 時間で割り、小数点以下を切り捨てて返す（001）"]
```

## できること

### SPEC-ABBR-COMPUTE-DAYS-SINCE-001 経過日数を 1 日未満切り捨ての整数で返す

`fetchedAt` から `nowMs` までの経過時間を 24 時間単位で数え、小数点以下を切り捨てた整数を返す。同じ時刻なら 0、24 時間未満の差も 0 になる。

例（`nowMs` は `2026-05-08T00:00:00Z`）: `fetchedAt: "2026-05-08T00:00:00Z"` → `0`、`"2026-05-07T00:00:00Z"` → `1`、`"2026-04-24T00:00:00Z"` → `14`、`"2026-05-07T12:00:00Z"`（12 時間前）→ `0`。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-002 今より後の取得時刻には 0 を返す

`fetchedAt` が `nowMs` より後のときは、負の値ではなく `0` を返す。

例: `fetchedAt: "2026-06-01T00:00:00Z"`、`nowMs` が `2026-05-08T00:00:00Z` → `0`。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-003 時刻として解釈できない文字列には RangeError を投げる

`fetchedAt` が受け付ける 3 つの形のどれにも当たらない文字列のときは、`0` を返さずに `RangeError` を投げる。壊れた取得時刻を `fresh` と判定させない。

例: `computeDaysSince('not-a-date', nowMs)` と `computeDaysSince('', nowMs)` はどちらも `RangeError`（v0.6.1 では `0`）。

### SPEC-ABBR-COMPUTE-DAYS-SINCE-004 nowMs を省略すると呼び出した時点のシステム時刻を使う

`nowMs` を渡さないときは、呼び出した時点のシステム時刻を「今」として経過日数を数える。

例: 呼び出す 5 分後の時刻を `fetchedAt` に渡し、`nowMs` を省略すると `0`。

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

## できないこと

- 経過日数から鮮度（`fresh` / `stale` / `outdated`）を判定すること（`judgeStaleness`）
- `fetched_at` を DB やキャッシュから読むこと（各 MCP サーバーが持つ）
- 今より後の時刻を、呼び出し側に別の値やエラーで知らせること（`0` になる。時計のずれで起きるので、壊れた値とは扱わない）
- 時・分の単位で経過時間を返すこと

## 未決

初版起こしで見つけた、意図か不具合かを人が決める項目です。決まったら「できること」に ID を振るか、`specs/changes/` の差分にします。

意図か不具合かの判断が要る項目は houki-abbreviations の Issue に移し、ここには題と Issue の番号だけを残します。今の振る舞いのままでよくテストが無いだけの項目は、受入テストを書いてから「できること」に ID を振ります。

1. **ISO 8601 以外の書き方も受け付ける。** → SPEC-ABBR-COMPUTE-DAYS-SINCE-006
2. **時差の書かれていない時刻は、実行環境のタイムゾーンで結果が変わる。** → SPEC-ABBR-COMPUTE-DAYS-SINCE-007
3. **存在しない日付が繰り上がって数えられる。** → SPEC-ABBR-COMPUTE-DAYS-SINCE-008
4. **解釈できない文字列や今より後の時刻を `judgeStaleness` に渡すと `fresh` になる。** → SPEC-ABBR-COMPUTE-DAYS-SINCE-003
5. **`nowMs` に `NaN` を渡すと `NaN` を返す。** → SPEC-ABBR-COMPUTE-DAYS-SINCE-009
