# 変更: 引数の検査を「丸めない」に揃える（limit・取得時刻・law_id の形）

- 対象: `specs/current/` の `search_by_name` / `find_similar` / `suggest_correction` / `compute_days_since` / `judge_staleness` / `is_valid_law_id`
- 実装の変更: 要
- 承認日: 2026-10-01（PR #31）
- 状態: 草案
- 起こした日: 2026-10-01（JST）
- 起こした役: Spec Steward
- 対象 Issue: houki-abbreviations #22（`limit` の `NaN` と上限）、#18（壊れた取得時刻と鮮度判定）、#23（`isValidLawId` の厳しさ）
- 決定の出典: houki-hub `docs/DECISIONS.md` 2026-09-29「T1 引数の検査」、2026-09-30「houki-abbreviations #23（`isValidLawId`）」、`docs/notes/2026-09-29-plan-spec-issues.md` 4 章「段階 3」の 2
- 前提: `spec/20261001-normalize` の上に積む（`find_similar` / `suggest_correction` の ID はその差分の後から採番している）

## なぜ変えるか

3 つの関数の `limit` は、`NaN` を渡したときの結果（打ち切らない / 0 件）と上限の有無が関数ごとに違う（#22）。`computeDaysSince` は解釈できない取得時刻に `0` を返すので、`judgeStaleness` に渡すと壊れた取得時刻が `fresh` になる（#18）。`isValidLawId` は e-Gov に無い形（元号 0 や 9、`363CONSTITUTION`、`M0`）も `true` にする（#23）。

T1（引数の検査は丸めない。MCP では inputSchema と `INVALID_ARGUMENT`）の規則を、このパッケージでは例外に置き換える。数の範囲の誤りは `RangeError`、型の誤りは `TypeError`。呼び出し側（MCP サーバー）が inputSchema で止めた後にこのパッケージに届く値は正しいので、通常の呼び出しでは例外は起きない。`isValidLawId` は公式仕様（2026-09-30 の決定）に合わせて狭める。

## 変わる振る舞い

| 関数                                                            | v0.6.1                                                                                            | この差分                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `searchByName` / `findSimilar` / `suggestCorrection` の `limit` | 1 未満は 1、小数は切り上げか切り捨て、`NaN` は打ち切らないか 0 件、上限は `searchByName` だけ 500 | 1 以上 500 以下の整数だけ。それ以外の数は `RangeError`、数でない値は `TypeError`。`undefined` は既定値     |
| `computeDaysSince` の `fetchedAt`                               | `Date.parse` が読めるものは何でも受け付け、読めなければ `0`                                       | ISO 8601 の 3 つの形（日付だけ・UTC・時差付き）だけ。それ以外は `RangeError`、文字列でなければ `TypeError` |
| `computeDaysSince` の `nowMs`                                   | `NaN` を渡すと `NaN` を返す                                                                       | 有限でない数は `RangeError`、数でなければ `TypeError`                                                      |
| `judgeStaleness` の `daysSince`                                 | 負の値は `fresh`、`NaN` は `outdated`                                                             | 負の値・`NaN`・`±Infinity` は `RangeError`、数でなければ `TypeError`                                       |
| `isValidLawId`                                                  | 元号の桁・`M` の次の桁・`R` の機関番号・`CONSTITUTION` の先頭を確かめない                         | 元号 `1`〜`5`、`M1`〜`M6`、`R` の機関番号は 10 進 8 桁、憲法は `321CONSTITUTION` だけ。`DH` を足す         |

houki-egov-mcp の `freshness.ts` と houki-nta-mcp の `freshness.ts` は `computeDaysSince` と `judgeStaleness` を呼ぶ。DB の `fetched_at` / `last_sync_date` が壊れていると、v0.6.1 では `fresh` と表示していたものが、0.7.0 では例外になる。段階 4（依存を `^0.7.0` に上げる実装 PR）で、例外を `INTERNAL_ERROR` か `freshness: null` のどちらで返すかを MCP 側の仕様に書く。

## 変わらない振る舞い

- `limit` の既定値（`searchByName` 50、`findSimilar` / `suggestCorrection` 5）と、既定値以内の整数を渡したときの結果
- `computeDaysSince` で今より後の取得時刻に `0` を返すこと（SPEC-ABBR-COMPUTE-DAYS-SINCE-002）。時刻が未来なのは書き込んだ側と読む側の時計のずれで起きるので、壊れた値とは扱わない
- `judgeStaleness` の境界（7 / 30）と小数の扱い（001〜004）
- `isValidLawId` が空文字・小文字・全角・前後の空白・15 文字以外を `false` にすること（007〜012）。2026-10-01 の e-Gov 全 9,570 件が `true` になること（差分の「戻り値」の表）
- `findSimilar` の `maxDistance` と `extractLawNames` の `minLength` の丸め（SPEC-ABBR-FIND-SIMILAR-016、SPEC-ABBR-EXTRACT-LAW-NAMES-011）。#22 の対象は `limit` だけなので、この差分では触らない

## Issue の「決めること」への答え

### #22

| 決めること                                                           | 答え                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NaN`（と `Infinity`）を既定値として扱うか、例外にするか             | 例外にする。`NaN` / `±Infinity` は `RangeError`、数でない値は `TypeError`（SEARCH-BY-NAME-019、FIND-SIMILAR-019、SUGGEST-CORRECTION-007）。T1 の「丸めない」に揃え、1 未満（017 / 013 / 004 の MODIFIED）と小数（018 / 018 / 006）も例外にする |
| `findSimilar` / `suggestCorrection` にも上限を設けるか。設けるなら値 | 設ける。`searchByName` と同じ 500。500 超は丸めずに `RangeError`（SEARCH-BY-NAME-020、FIND-SIMILAR-020、SUGGEST-CORRECTION-008）                                                                                                               |

### #18

| 決めること                                                                        | 答え                                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 解釈できない取得時刻を `0` と区別できる値で返すか、呼び出し側の責任のままにするか | 値を返さず `RangeError` を投げる（COMPUTE-DAYS-SINCE-003 の MODIFIED）。戻り値の型を `number                                                                                                       | null`に変えると`judgeStaleness(computeDaysSince(...))` の型が通らなくなるので、値ではなく例外にする |
| ISO 8601 以外の書き方、時差の無い時刻、存在しない日付を受け付けるか               | 受け付けない。どれも `RangeError`（006・007・008）。受け付けるのは日付だけ・UTC・時差付きの 3 つの形（005）                                                                                        |
| `judgeStaleness` が `NaN` と負の値をどう扱うか（例外、または特別な段階）          | 例外。負の値は `RangeError`（JUDGE-STALENESS-005）、`NaN` / `±Infinity` は `RangeError`、数でない値は `TypeError`（006）。`StalenessLevel` の 3 つの値は family の応答に使われているので増やさない |

### #23

| 決めること                                                   | 答え                                                                                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 元号の桁（1〜5）を確かめるか                                 | 確かめる（IS-VALID-LAW-ID-013）                                                                                                                                                   |
| 憲法の形を `321CONSTITUTION` だけにするか                    | する（004 の MODIFIED）                                                                                                                                                           |
| `M` の次の 1 文字を注記どおり 1〜6 に狭めるか、注記を直すか  | 狭める（002 の MODIFIED、014）。`R` の機関番号も公式仕様どおり 10 進 8 桁にする（015）。`DH`（太政官布達）を足す（001 の MODIFIED）                                               |
| 狭める場合、e-Gov 全件を受け付けることを CI で確かめ続けるか | 確かめ続ける。`scripts/verify-law-ids.mjs` を、辞書の 9 件の突き合わせに加えて `GET /api/2/laws` の全件に `isValidLawId` を通す形にし、月次の workflow で回す。CI の変更は実装 PR |

## 仕様 ID の一覧

| 種類     | 仕様 ID                                                                                                                                                                                                                                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADDED    | SPEC-ABBR-SEARCH-BY-NAME-019・020、SPEC-ABBR-FIND-SIMILAR-018・019・020、SPEC-ABBR-SUGGEST-CORRECTION-006・007・008、SPEC-ABBR-COMPUTE-DAYS-SINCE-005・006・007・008・009・010、SPEC-ABBR-JUDGE-STALENESS-005・006、SPEC-ABBR-IS-VALID-LAW-ID-013・014・015                                                                                   |
| MODIFIED | SPEC-ABBR-SEARCH-BY-NAME-017・018、SPEC-ABBR-FIND-SIMILAR-013、SPEC-ABBR-SUGGEST-CORRECTION-004、SPEC-ABBR-COMPUTE-DAYS-SINCE-003、SPEC-ABBR-IS-VALID-LAW-ID-001・002・004。ID の無い節: `search_by_name` / `suggest_correction` / `compute_days_since` / `judge_staleness` の「入力」、`compute_days_since` / `is_valid_law_id` の「戻り値」 |
| REMOVED  | なし                                                                                                                                                                                                                                                                                                                                          |

ADDED 19 件、MODIFIED 8 件（ID の無い節 6 つを除く）。

## 取り込みのとき（Publisher）

- 「取り込みのときに消す未決」: search_by_name 5、find_similar 8、suggest_correction 5（→ それぞれ 017〜020 / 013・018〜020 / 004・006〜008）、compute_days_since 1〜5（1 → 006、2 → 007、3 → 008、4 → 003、5 → 009）、judge_staleness 1・2（→ 005、006）、is_valid_law_id 1・2（→ 013、014・015）
- `find_similar` の「入力」の `options.limit` の行を `searchByName` と同じ文（1 以上 500 以下の整数。省くと 5）にする
- `compute_days_since` の「できないこと」の「解釈できない文字列や今より後の時刻を、呼び出し側に別の値やエラーで知らせること」を、今より後の時刻だけの文にする。`judge_staleness` の「負の値や数でない値を検査して、エラーにすること（未決 1・2）」を消す
- `is_valid_law_id` の「処理の流れ」の図を 6 つの形に直す。`validate_all_entries` の SPEC-ABBR-VALIDATE-ALL-ENTRIES-004 にある「SPEC-ABBR-IS-VALID-LAW-ID-001〜010」を「001〜015」にする（文言だけ）
- `public_constants` の `SOURCE_MCP_HINTS` の表と `abbreviation_entries` の `law_id` の説明は変えない（`321CONSTITUTION` と `363AC0000000108` はどちらも `true` のまま）

## 対象外

- MCP サーバー側で例外をどの `code` で返すか（段階 4 の egov / nta の仕様 PR）
- `search_fulltext` の `limit` の 1〜30 への丸め（houki-egov-mcp。houki-hub `docs/DECISIONS.md` の未決）
- `verify-law-ids.mjs` と workflow の変更（実装 PR）

## 人が判断すること

1. **承認日。** proposal.md に承認日と PR 番号を書く。
2. **1 未満・小数・500 超も例外にすること。** #22 の本文は「1 未満は 1 件」を今の動きのまま受入テストにする前提で、T1 の「丸めない」と食い違っていた（houki-hub `docs/notes/2026-09-29-plan-spec-issues.md` 「段階 1 の転記で見つかった、計画書との食い違い」）。この差分は T1 に揃え、v0.6.1 で足したばかりの SPEC-ABBR-SEARCH-BY-NAME-017・018、SPEC-ABBR-FIND-SIMILAR-013、SPEC-ABBR-SUGGEST-CORRECTION-004 を MODIFIED にする。`search_fulltext` の 1〜30 への丸めを残す（houki-hub の未決）なら、この 4 件を v0.6.1 のままにし、`NaN` / `Infinity` / 数でない値と 500 超だけを例外にする案もある。その場合は 017・018・013・004 の MODIFIED を外し、ADDED の本文から「1 未満」「小数」の言及を消す。
3. **上限 500 を `findSimilar` / `suggestCorrection` にも使うこと。** 辞書は 174 件で候補が 500 件を超えることは無いので、上限は `searchByName` と同じ規則にするためだけの値。
4. **`computeDaysSince` を例外にすること。** 別の案は `null` を返すこと。戻り値の型が `number | null` になり、egov・nta の `judgeStaleness(computeDaysSince(...))` が型検査で止まる（呼び出し側で `null` を扱う変更が要る）。例外なら型は変わらず、壊れた DB の値は MCP 側で捕まえて `code` にする。
5. **今より後の取得時刻を `0` のままにすること。** 時計のずれで起きるので壊れた値とは扱わない。`fresh` になることを避けたいなら、`RangeError` にする案もある。
6. **`fetchedAt` の日付だけの形を UTC の 0 時にすること。** houki-egov-mcp の `last_sync_date` が `YYYY-MM-DD` なので受け付ける必要がある。JST の 0 時にする案もあるが、`Date.parse` の扱い（UTC）と v0.6.1 の結果を変えない側にした。
7. **`isValidLawId` で確かめないこと。** 年の 2 桁の値（`00` を通す）、`R` の機関番号の値の範囲（`00000020` 以上を通す）、`AC` などの 6〜12 桁目（閣法 `0000000` / 衆議院 `1000000` / 参議院 `0100000` 以外を通す）は確かめない。理由: 新しい機関や区分が足されたときに、パッケージを上げるまで `false` になるのを避ける。決定（2026-09-30）にある「10 進 8 桁（`00000001`〜`00000019`）」のうち、括弧の範囲は約束にしない。
8. **公式仕様の例 `501M60000f00006`（小文字の `f`）。** 公式仕様のページはこの例を載せているが、e-Gov API の全 9,570 件に小文字は無く、v0.6.1 の SPEC-ABBR-IS-VALID-LAW-ID-010（小文字は `false`）はそのまま。公式仕様の表記ゆれとみなす。
