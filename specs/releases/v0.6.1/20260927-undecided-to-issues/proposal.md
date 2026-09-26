# 変更: 「未決」のうち判断が要る 52 件を Issue に移す

- 対象: `specs/current/` の下の 23 本の `spec.md`（`## 未決` の節）
- 実装の変更: 不要
- 承認日: 2026-09-27 （PR #26）
- 状態: 取り込み済み。この仕様 PR（#26）の中で `specs/current/` に反映し、v0.6.1 の実装 PR の最終コミットで `specs/releases/v0.6.1/` へ移した
- 起こした日: 2026-09-27（JST）
- 起こした役: Spec Steward
- 関連する Issue: PR #10（初版起こし）、#13〜#25（移した先）

## なぜ変えるか

PR #10 の初版起こしで、「未決」に 116 件が残った。このうち、意図か不具合かを人が決める必要がある項目は、利用者にとって問題になる箇所でもある。初版起こしは現状を把握するためのもので、ここで見つかった問題は Issue で扱う。同じ判断が複数の関数に出ているため、判断ごとに 13 件の Issue にまとめて起票した（振り分けは houki-hub `docs/notes/issues-2026-09-27-abbr-undecided/`）。

## 変わる振る舞い

無い。`spec.md` の「未決」の書き方だけを変える。

## 何を変えるか

- 判断が要る 49 件は、項目の題（太字の部分）と Issue の番号（`→ houki-abbreviations #N`）だけを残し、本文を消す。本文は Issue に移してある
- `limit` の項目 3 件（search_by_name 4、find_similar 5、suggest_correction 3）は、テストを足せばよい部分（既定値と 1 未満の値）と、判断が要る部分（`NaN` と上限）が 1 項目に混ざっていた。前者を元の番号に残し、後者を末尾の新しい項目（search_by_name 5、find_similar 8、suggest_correction 5）にして Issue へ移す
- テストの名前と中身が合っていない 4 件（levenshtein 2、lookup_by_law_id 2、lookup_by_law_num 1・2）は、振る舞いの判断ではなくテストの誤りなので、「テストを直す」書き方にする。この 3 本の「未決」の冒頭に、その扱いを 1 文書き足す
- resolve_abbreviation 5（名前が重なったときは先のエントリを返す）は「テストを足す」書き方だったが、#14 で重なりを禁じると決めればテストは要らなくなる。先にテストを書くと未決定の振る舞いを固定するので、Issue へ移す
- 既存の項目の番号は変えない（houki-hub の振り分けの表が番号で参照しているため）

| Issue | 判断                                                        | 移した未決                                                                                                                                                                                      |
| ----- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #13   | エントリと公開定数の凍結                                    | abbreviation_entries 1、judge_staleness 4、list_by_category 1、list_by_domain 2、list_by_source_mcp_hint 1、lookup_by_law_id 3、lookup_by_law_num 5、public_constants 1、resolve_abbreviation 2 |
| #14   | エントリをまたぐ名前の重複と、validateAllEntries が見逃す値 | abbreviation_entries 2、get_all_names 4、resolve_abbreviation 5、validate_all_entries 2・3                                                                                                      |
| #15   | aliases に自分の abbr・formal と同じ値                      | abbreviation_entries 8、extract_law_names 1、validate_all_entries 4                                                                                                                             |
| #16   | 件数と 0 件のキー                                           | abbreviation_entries 7、get_abbreviation_stats 1・2                                                                                                                                             |
| #17   | 文書と実際の結果の食い違い                                  | abbreviation_entries 9、find_similar 1、list_by_domain 1、public_constants 3、resolve_abbreviation 1、suggest_correction 1、validate_all_entries 7                                              |
| #18   | 壊れた取得時刻と鮮度判定                                    | compute_days_since 1〜5、judge_staleness 1・2                                                                                                                                                   |
| #19   | extractLawNames のまたがる一致と全角                        | extract_law_names 2・3                                                                                                                                                                          |
| #20   | 短い query と、一致した名前を候補に返すこと                 | find_similar 2、suggest_correction 2                                                                                                                                                            |
| #21   | 関数ごとの全角・ダッシュ類・大文字の扱い                    | get_all_names 3、lookup_by_law_id 1、normalize_jp_text 3、normalize_search_query 1                                                                                                              |
| #22   | limit の NaN と上限                                         | search_by_name 5、find_similar 8、suggest_correction 5（新しい項目）                                                                                                                            |
| #23   | isValidLawId の厳しさ                                       | is_valid_law_id 1・2                                                                                                                                                                            |
| #24   | 漢数字・大きな数・BMP 外の文字                              | kanji_to_number 2、levenshtein 1、normalize_law_num 1・5                                                                                                                                        |
| #25   | 告示の category                                             | public_constants 5                                                                                                                                                                              |

件数: 移す前の未決 116 件に、分けた 3 件を足して 119 件。Issue に移すのは 52 件（既存 49 件と新しい 3 件）で、残るのは 67 件（テストを足す 63 件、テストを直す 4 件）。

## 変わらない振る舞い

- 仕様 ID と「できること」「できないこと」「処理の流れ」
- テストを足すだけの項目の本文（受入テストを書いてから ID を振る）。ただし上の `limit` の 3 件は、判断が要る部分を除いて書き直した
- `spec-ids check` の結果

## 対象外

- Issue の中身の判断と、それに伴う仕様の変更（Issue ごとに仕様 PR と実装 PR を出す）
- テストを足す・直す作業（Test Designer の実装 PR）

## 人が判断すること

1. **承認日。** proposal.md に承認日と PR 番号を書く。`specs/current/` の 23 本の承認日の行にも、この差分（`20260927-undecided-to-issues`）の承認日を書き足す。
2. **Issue の番号。** 移した先の Issue の番号は、起票した後に houki-hub の `scripts/apply-issue-numbers-2026-09-27-abbr.sh` で仮の番号から置き換えた。置き換えの前後で `spec-ids check` の結果は変わらない。
3. **levenshtein 2 の扱い。** 「公開の関数として扱うかを決める」と書いていた項目を、「公開の関数として describe 名を直す」とした。`src/index.ts` から export され README の API 節にも載っているため、判断は不要とみなした。
