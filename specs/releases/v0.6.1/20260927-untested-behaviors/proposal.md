# 変更: テストが無いだけの振る舞いに仕様 ID を振る

- 対象: `specs/current/` の下の 20 本の `spec.md`（「できること」への追加）
- 実装の変更: 不要（テストを足すだけ。`src/` は JSDoc の 1 か所だけ直す）
<<<<<<< HEAD:specs/changes/20260927-untested-behaviors/proposal.md
- 承認日: 2026-09-27（PR #27）
- 状態: 承認待ち。実装 PR で受入テストを書き、その最終コミットで `specs/current/` に取り込む
=======
- 承認日:
- 状態: 取り込み済み。実装は v0.6.1、`specs/current/` への取り込みは 2026-09-27（JST、実装 PR の最終コミット）
>>>>>>> 010c266 (spec: 20260927-untested-behaviors を specs/current/ に取り込み、releases/v0.6.1/ へ移す):specs/releases/v0.6.1/20260927-untested-behaviors/proposal.md
- 起こした日: 2026-09-27（JST）
- 起こした役: Spec Steward
- 関連: PR #10（初版起こし）、PR #26（未決のうち判断が要るものを Issue #13〜#25 に移した仕様 PR）

## なぜ変えるか

PR #10 の初版起こしで、「未決」のうち 63 件は「今の振る舞いのままでよく、テストが無いだけ」の項目だった。これらは利用者（houki-egov-mcp・houki-nta-mcp などの MCP サーバーと、このパッケージを使うコード）がすでに頼っている振る舞いで、テストが無いために、変わっても CI が気付かない。今の振る舞いを仕様 ID 付きの「できること」にし、受入テストで固定する。

## 変わる振る舞い

無い。今の v0.6.0 の振る舞いを、仕様 ID を付けて書き起こすだけ。差分の本文の例は、どれも v0.6.0 のビルドで実際に動かして確かめた入力と出力である。

## 足す仕様 ID（ADDED、81 件）

| 関数                    | 未決の番号 → 仕様 ID                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| abbreviation_entries    | 3 → 012、4 → 013、5 → 014、6 → 015・016                                   |
| public_constants        | 2 → 004・005、4 → 006・007・008                                           |
| judge_staleness         | 3 → 004                                                                   |
| resolve_abbreviation    | 4 → 010、6 → 011、7 → 012、8 → 013                                        |
| list_by_category        | 2 → 004、3 → 005、4 → 006、5 → 007                                        |
| list_by_domain          | 3 → 003、4 → 004、5 → 005                                                 |
| list_by_source_mcp_hint | 2 → 003、3 → 004、4 → 005                                                 |
| get_abbreviation_stats  | 3 → 004                                                                   |
| normalize_jp_text       | 1 → 009、2 → 010、4 → 011                                                 |
| normalize_law_num       | 2 → 010、3 → 011、4 → 012・013、6 → 014                                   |
| normalize_search_query  | 2 → 007                                                                   |
| kanji_to_number         | 1 → 005、3 → 006、4 → 007、5 → 008                                        |
| lookup_by_law_num       | 3 → 007、4 → 008・009                                                     |
| get_all_names           | 1 → 006、2 → 007、5 → 008                                                 |
| search_by_name          | 1 → 009・010、2 → 011・012、3 → 013・014・015、4 → 016・017・018          |
| find_similar            | 3 → 007・008・009、4 → 010・011、5 → 012・013、6 → 014・015・016、7 → 017 |
| suggest_correction      | 3 → 003・004、4 → 005                                                     |
| extract_law_names       | 4 → 010、5 → 011、6 → 012、7 → 013、8 → 014                               |
| is_valid_law_id         | 3 → 011、4 → 012                                                          |
| validate_all_entries    | 1 → 010、5 → 011・012、6 → 013・014                                       |

仕様 ID の接頭辞は `SPEC-ABBR-<機能>-`（例: list_by_domain 3 → `SPEC-ABBR-LIST-BY-DOMAIN-003`）。1 つの未決の項目を、1 つのテストで確かめられる単位に分けたものがある。

## ID を振らなかった項目

| 未決                                                           | 理由                                                                                                                                         | 扱い                                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| resolve_abbreviation 3（全角数字・ハイフン・チルダの吸収）     | 辞書に数字・ハイフン・チルダを含む名前が無く、`resolveAbbreviation` を呼んで確かめられる入力が無い                                           | 「テスト用に辞書を差し替える」か「半角にする規則は `normalizeJpText` と同じ、を約束にする」かを人が決める。未決に残す |
| get_abbreviation_stats 4（キーの並び）                         | 件数 0 のキーを入れるかどうか（#16）で並びも変わる                                                                                           | その Issue に含める。未決に残す                                                                                       |
| list_by_source_mcp_hint 5（`houki-jaish` と `houki-saiketsu`） | current の SPEC-ABBR-LIST-BY-SOURCE-MCP-HINT-002 の本文に、すでに空配列を返すと書いてある                                                    | 新しい ID は振らない。実装 PR で 002 のテストにこの 2 つを足す                                                        |
| abbreviation_entries 6 の一部                                  | `law_num` を持つのが `law_id` を持つ 9 件だけであること、houki-nta 管轄がすべて `domain: "tax"` であることは、辞書の今の中身で、約束ではない | 約束にしない。未決の本文から外す                                                                                      |

## 約束にしなかったこと

- `resolveAbbreviation(123)` が `TypeError` を投げること（013 は `null` / `undefined` だけ）
- `validateAllEntries` の `message` の文言そのもの（014 は `abbr` が入ることだけ）
- `normalizeLawNum` の `元年` を場所を問わず変換すること（011 は空白で分かれた `元 年` だけ。場所の扱いは #24 で決める）
- `findSimilar` と `suggestCorrection` の小数の `limit`（`searchByName` は切り上げ、`findSimilar` は切り捨てで、扱いが違う。#22 に足す）

## 変わらない振る舞い

- 既存の仕様 ID 130 件の本文
- `src/` の実行されるコード

## 対象外

- 「テストを直す」4 件（levenshtein 2、lookup_by_law_id 2、lookup_by_law_num 1・2）。仕様 ID を増やさないので、実装 PR の中でテストだけを直す
- Issue に移した未決（#13〜#25、PR #26）

## 取り込みのとき（Publisher）

- ADDED の見出しを、各 `specs/current/<dir>/spec.md` の「できること」の末尾に足す
- 「未決」の該当項目は消さずに、題と仕様 ID だけの 1 行（例: `3. **返す順序。** → SPEC-ABBR-LIST-BY-DOMAIN-003`）にする。項目の番号は変えない
- `specs/current/<dir>/spec.md` の承認日の行に「差分 `20260927-untested-behaviors` は YYYY-MM-DD（PR #N）」を足す

## 人が判断すること

1. **承認日。** proposal.md に承認日と PR 番号を書く。
2. **約束の範囲。** 辞書の今の中身を例に書いた ID（list_by_category 007 の種別ごとの件数、search_by_name 009 の並び など）は、例を約束にしすぎていないか。本文で約束にしているのは見出しの文で、例は v0.6.0 の結果である。
3. **lookup_by_law_num 009。** `元年` の法令番号は辞書に無いので、受入テストは `src/lookup.ts` の `lookupByLawNum(entries, law_num)` に 1 件の辞書を渡して確かめる。公開 API で確かめられないものを約束にしてよいか。extract_law_names 012 も同じ。
