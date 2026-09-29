# 変更: 辞書の約束（名前の重なり・別名・告示）と、件数・近さの決め方

- 対象: `specs/current/` の `abbreviation_entries` / `validate_all_entries` / `public_constants` / `get_abbreviation_stats` / `find_similar` / `suggest_correction` / `extract_law_names` / `get_all_names`
- 実装の変更: 要（辞書 `src/data/*.json` の 33 件の修正を含む）
- 承認日: 2026-10-01（PR #32）
- 状態: 草案
- 起こした日: 2026-10-01（JST）
- 起こした役: Spec Steward
- 対象 Issue: houki-abbreviations #14（名前の重なりと `validateAllEntries` が見逃す値）、#15（`aliases` に自分の `abbr` / `formal`）、#25（告示の `category`）、#16（件数と 0 件のキー）、#20（短い `query` と一致した名前）
- 決定の出典: houki-hub `docs/DECISIONS.md` 2026-09-30「#16」「#20」、`docs/notes/2026-09-29-plan-spec-issues.md` 4 章「段階 3」の 3
- 前提: `spec/20261001-normalize` と `spec/20261001-input-guards` の上に積む（`find_similar` / `suggest_correction` / `extract_law_names` の ID はその差分の後から採番している。`limit` の規則は input-guards の差分に従う）

## なぜ変えるか

辞書の約束として一意にしているのは `abbr` だけで、`formal` や `aliases` が別のエントリと重なったときにどのエントリを返すかは関数ごとに違う（#14）。33 件のエントリは `aliases` に自分の `formal` と同じ値を持ち、`extractLawNames` が同じ一致を 2 件返す（#15）。告示を辞書に入れる `category` が無い（#25）。`getAbbreviationStats` は件数 0 の種別・MCP のキーを持たず、`byCategory.hanrei` が `undefined` になる（#16）。`findSimilar` は 2〜3 文字の `query` で意味の違う短い略称を返し、`suggestCorrection` は入力そのものを「もしかして」に入れる（#20）。

辞書の約束は `validateAllEntries` のエラーにして CI で固定し、件数と近さは 2026-09-30 の決定（#16 は全値をキーに、#20 は距離の比）のとおりにする。

## 変わる振る舞い

| 対象                   | v0.6.1                                                             | この差分                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 辞書の約束             | 一意なのは `abbr` だけ。`aliases` に自分の `formal` を入れてよい   | 名前（`abbr` / `formal` / `aliases`）は `normalizeJpText` 後もエントリをまたいで重ならない。`aliases` に自分の `abbr` / `formal` を入れない                             |
| `validateAllEntries`   | 重なりと一覧に無い値を見逃す。別名と他の `abbr` の重なりは警告     | `duplicate_name` / `alias_equals_own_name` / `invalid_domain` / `invalid_category` / `invalid_source_mcp_hint` をエラーにする。警告 `alias_collides_with_abbr` は無くす |
| `CATEGORIES`           | 12 値                                                              | `kokuji`（告示）を `rule` の次に足して 13 値。`houki-egov` の説明から「告示」を外す                                                                                     |
| `getAbbreviationStats` | 1 件以上ある値だけがキー。型は `Record<string, number>`            | 定数の全値を定数の順でキーに持ち、0 件は `0`。型は `Record<Domain, number>` / `Record<Category, number>` / `Record<SourceMcpHint, number>`                              |
| `findSimilar`          | `maxDistance` 以下なら返す                                         | 距離の比（距離 ÷ 長い方の文字数）が 1/3 を超える名前は返さない。距離 0 は文字数によらず返す                                                                             |
| `suggestCorrection`    | 一致した名前のエントリも「もしかして」に入る                       | 距離 0 のエントリを除いてから `limit` 件で打ち切る                                                                                                                      |
| `extractLawNames`      | 同じエントリの同じ位置・同じ長さの一致を 2 件返す（`酒税法` など） | 1 件にする                                                                                                                                                              |
| 辞書のデータ           | 33 件の `aliases` に `formal` と同じ値がある                       | その値を外す（`憲` の `aliases` は `["憲法"]` になる）                                                                                                                  |

## 変わらない振る舞い

- `abbr` の一意性（SPEC-ABBR-ABBREVIATION-ENTRIES-005）と `duplicate_abbr`
- `abbr` と `formal` が同じ値であること（`酒税法` など 33 件）は許す
- `findSimilar` の `maxDistance` / `sortByScore` / `filter` / `normalize` の意味。変わるのは例に出る候補だけ
- `getAllNames` が重なる名前を 1 つにすること（006 の例だけ差し替える）
- `getAbbreviationStats().byDomain` の 6 キーがどれも 1 以上（003）。実数（総数 174 など）は仕様に固定しない
- `category_hint_mismatch` と `duplicate_alias_within_entry` が警告のままであること

## Issue の「決めること」への答え

### #14

| 決めること                                                                                                               | 答え                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 辞書の約束として、エントリをまたぐ名前の重なりを禁じるか。禁じるなら `validateAllEntries` のエラーにし、テストで固定する | 禁じる。`normalizeJpText` を通した後で比べる（ABBREVIATION-ENTRIES-017）。`validateAllEntries` の `duplicate_name` エラー（VALIDATE-ALL-ENTRIES-015） |
| 禁じない場合、重なったときに返すエントリ（先か後か）を 3 つの関数で揃えて仕様に書くか                                    | 禁じるので書かない。`resolve_abbreviation` 5 と `get_all_names` 4 の未決は、017 を根拠に消す                                                          |
| `validateAllEntries` で、一覧に無い `category` / `domain` / `source_mcp_hint` をエラーにするか                           | エラーにする（`invalid_domain` / `invalid_category` / `invalid_source_mcp_hint`。VALIDATE-ALL-ENTRIES-017）                                           |

### #15

| 決めること                                                                                                                                                | 答え                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 辞書の書き方として、自分の `abbr` / `formal` と同じ値を `aliases` に入れることを許すか。許さないなら辞書の 33 件を直し、`validateAllEntries` の警告にする | 許さない（ABBREVIATION-ENTRIES-018）。警告ではなくエラー `alias_equals_own_name`（VALIDATE-ALL-ENTRIES-016）。辞書の 33 件は実装 PR で直す（009「同梱辞書は全件エラーなし」を保つため） |
| `extractLawNames` の側で、同じエントリの同じ位置・同じ長さの一致を常に 1 件にするか                                                                       | 1 件にする（EXTRACT-LAW-NAMES-019）。`abbr` と `formal` が同じ 33 件（`酒税法` など）は辞書を直しても残るので、関数の側でも要る                                                         |

### #25

| 決めること                                                                                     | 答え                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CATEGORIES` に告示の値（例: `kokuji`）を足すか。足すなら `law_type` との対応と、`law_id` の形 | 足す（PUBLIC-CONSTANTS-007 の MODIFIED）。`law_type` は持たず（`LAW_TYPE_CODES` に足さない）、`law_id` は `null`（`isValidLawId` に告示の形は無い）。`source_mcp_hint` は `houki-nta` / `houki-mhlw`（VALIDATE-ALL-ENTRIES-018） |
| 足さない場合、`houki-egov` の説明から「告示」を外すか                                          | 足すが、e-Gov 法令 API は告示を持たないので `houki-egov` の説明から「告示」を外し、`houki-nta` / `houki-mhlw` の説明に「告示」を足す（`SOURCE_MCP_HINTS` の節の MODIFIED）                                                       |

### #16

| 決めること                                                                                                        | 答え                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 版ごとの実数（総数・分野別など）を仕様に書いて固定するか、エントリを足すたびに変わる値として約束にしないか        | 固定しない。例に v0.6.1 の値を書くだけ                        |
| `getAbbreviationStats` で、件数 0 の種別・分野・MCP もキーに入れて `0` を返すか                                   | 入れる。キーの順は定数の順（GET-ABBREVIATION-STATS-005・006） |
| 入れる場合、型を `Record<Domain, number>` / `Record<Category, number>` / `Record<SourceMcpHint, number>` にするか | する（「戻り値」の MODIFIED）                                 |

### #20

| 決めること                                                                                       | 答え                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query` の最短文字数を設けるか、距離を名前の長さで割るなど長さを補うか                           | 長さで補う。距離 ÷ 長い方の文字数が 1/3 を超える名前は返さない（`距離 × 3 ≤ 長い方の文字数`。FIND-SIMILAR-021）。最短文字数は設けず、距離 0 は返す（022） |
| `suggestCorrection` で、`query` と一致したエントリを候補から外すか                               | 外す（SUGGEST-CORRECTION-009）                                                                                                                            |
| 今のままにする場合、「近い名前を返す関数で、訂正の候補とは限らない」ことを仕様と README に書くか | 変えるが、`findSimilar` の「アクター」に「編集距離で近い名前を返す関数で、一覧が欲しいときは `searchByName`」を書く。README と JSDoc の同じ文は実装 PR    |

## しきい値を決めた根拠（実データ）

v0.6.1 の辞書（174 件、名前 482 個）に対して、比の上限を 1/3 にしたときの結果。

| `query`                        | v0.6.1（`maxDistance: 2`）                       | 比 1/3                                 | 判断                                                           |
| ------------------------------ | ------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------- |
| `民法`                         | `民`（0）・`所法`・`法法`・`消法`・`措法`（1）   | `民`（0）・`民訴`・`民執`・`民保`（1） | 2 文字に対する距離 1（比 1/2）を除く。3 文字の `民訴法` は残る |
| `法`                           | `所法`・`法法`・`法令`・`法規`・`消法`（1）      | `[]`                                   | 1 文字に対する距離 1 は除く                                    |
| `労基側`（打ち間違い）         | `労基法`・`労基則`（1）                          | 同じ                                   | 3 文字の略称の 1 文字の打ち間違いは残す（比 1/3 が境界）       |
| `労働基準法`                   | `労基法`（0）・`労契法`・`労組法`・`建基法`（2） | `労基法`（0）                          | 5 文字に対する距離 2（比 2/5）を除く                           |
| `労働基準法施行例`             | `労基則`（2）                                    | 同じ                                   | 9 文字に対する距離 2（比 2/9）は残る                           |
| `消費税法施行令例`             | `消令`（1）・`消規`（2）                         | 同じ                                   | 8 文字に対する距離 2（比 1/4）は残る                           |
| `ＰＬ法`（`normalize: false`） | `所法`・`法法`・`消法`・`措法`・`相法`（2）      | `[]`                                   | 3 文字に対する距離 2（比 2/3）を除く                           |

比を 1/3 より小さくすると（例: 0.3）、`労基側` → `労基法` のような 3 文字の略称の打ち間違いが拾えなくなる。1/3 より大きくすると（例: 0.4）、`労働基準法` → `労働契約法` のような別の法令が残る。決定の「0.34 前後」は 1/3 を含む側の値なので、境界を含む `距離 × 3 ≤ 文字数` にした。分母をコードポイント数にするのは、`spec/20261001-normalize` で `levenshtein` をコードポイント単位にしたことに合わせる。

## 仕様 ID の一覧

| 種類     | 仕様 ID                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADDED    | SPEC-ABBR-ABBREVIATION-ENTRIES-017・018、SPEC-ABBR-VALIDATE-ALL-ENTRIES-015・016・017・018、SPEC-ABBR-GET-ABBREVIATION-STATS-005・006、SPEC-ABBR-FIND-SIMILAR-021・022、SPEC-ABBR-SUGGEST-CORRECTION-009、SPEC-ABBR-EXTRACT-LAW-NAMES-019                                                                                                                                                                                                                          |
| MODIFIED | SPEC-ABBR-ABBREVIATION-ENTRIES-007・009、SPEC-ABBR-VALIDATE-ALL-ENTRIES-014、SPEC-ABBR-PUBLIC-CONSTANTS-007、SPEC-ABBR-FIND-SIMILAR-001・003・004・005・008・010・011・012・014・017、SPEC-ABBR-SUGGEST-CORRECTION-001・002・003、SPEC-ABBR-GET-ALL-NAMES-006。ID の無い節: `validate_all_entries` / `get_abbreviation_stats` / `suggest_correction` の「戻り値」、`find_similar` の「アクター」「入力」、`public_constants` の `CATEGORIES` と `SOURCE_MCP_HINTS` |
| REMOVED  | SPEC-ABBR-VALIDATE-ALL-ENTRIES-008（`alias_collides_with_abbr` の警告。`duplicate_name` のエラーに含まれる）                                                                                                                                                                                                                                                                                                                                                       |

ADDED 12 件、MODIFIED 19 件（ID の無い節 7 つを除く）、REMOVED 1 件。`find_similar` の MODIFIED が多いのは、例に使っていた `法` と `労働基準法` の候補が比の上限で変わるため。約束の文はどれも同じ。

## 取り込みのとき（Publisher）

- 「取り込みのときに消す未決」: abbreviation_entries 2・7・8（→ 017、GET-ABBREVIATION-STATS-005・006、018）、get_all_names 4（→ ABBREVIATION-ENTRIES-017）、resolve_abbreviation 5（→ ABBREVIATION-ENTRIES-017）、validate_all_entries 2・3・4（→ 017、015、016）、extract_law_names 1（→ 019）、get_abbreviation_stats 1・2・4（→ 005・006、「戻り値」の型、005）、public_constants 5（→ 007）、find_similar 2（→ 021・022）、suggest_correction 2（→ 009）
- SPEC-ABBR-VALIDATE-ALL-ENTRIES-008 を current から外し、`src/validate.test.ts` の `alias_collides_with_abbr` のテストを同じコミットで消す。「処理の流れ」の図の `alias_collides_with_abbr` を `duplicate_name` / `alias_equals_own_name` に置き換える
- `abbreviation_entries` の「各エントリのフィールド」の `category` の行に `kokuji` を足し、`aliases` の行に「自分の `abbr` / `formal` と同じ値は入れない」を足す。「v0.6.0 の実数」の表は v0.7.0 の値に更新する（`aliases` が入っている件数は 94 から減る）
- `public_constants` の「できないこと」は変えない。`list_by_category` の SPEC-ABBR-LIST-BY-CATEGORY-006 は `CATEGORIES` に無い値の例（`xxx`）のままでよい
- `get_all_names` の「できないこと」は変えない
- `find_similar` の「できないこと」に「名前の一部で探すこと（`searchByName`）」があるのはそのまま。「処理の流れ」の図に比の判定を足す
- `suggest_correction` の「処理の流れ」に「距離 0 を除く」を足す
- `validateAllEntries` の `npm run validate` は、辞書の 33 件を直した後で `valid: true` になる（009）。直す前に取り込むと CI が落ちるので、辞書の修正と同じ実装 PR で取り込む

## 対象外

- README・JSDoc・CONTRIBUTING の文（#17。`findSimilar` と `searchByName` の役割分けの文は実装 PR で README と JSDoc に書く）
- 混同しやすい文字の表（例↔令、規↔則）による訂正（決定 2026-09-30: 別の Issue で検討）
- `law_type` と `category` の対応を `validateAllEntries` で確かめること（テストが確かめている。SPEC-ABBR-ABBREVIATION-ENTRIES-006）

## 人が判断すること

1. **承認日。** proposal.md に承認日と PR 番号を書く。
2. **`kokuji` を足すこと。** 段階 3 の表（houki-hub `docs/notes/2026-09-29-plan-spec-issues.md`）に「`kokuji` の追加」とあるので足した。位置は `rule` の次（法令系の値の末尾）。理由: `abbreviation_entries` の 016（houki-egov 管轄は法令系だけ）と 009（houki-nta 管轄は通達系）の境目に置き、`CATEGORIES` の順を「e-Gov にあるもの → 無いもの」に保つ。末尾に足す案もある（`CATEGORIES` の添字を変えない）。
3. **`kokuji` の `source_mcp_hint`。** `houki-nta` / `houki-mhlw` にした。理由: e-Gov 法令 API（`GET /api/2/laws`）は告示を持たない（2026-10-01 に全 9,570 件を取得して種別を数えた結果、告示に当たる法令 ID の形は無い）。`houki-egov` の説明「法律・政令・省令・規則・告示」から「告示」を外す。#17 の表には無い行なので、この差分で直す。
4. **別名の重なりをエラーにすること（警告ではなく）。** 理由: 名前から 1 件を返す関数の結果が決まらなくなるのは辞書の誤りで、CI で止めるべきため。v0.6.1 の辞書は違反 0 件なので、既存の CI は落ちない。`alias_equals_own_name` も同じ理由でエラーにしたが、辞書の 33 件を直すまで `npm run validate` が落ちるので、辞書の修正と同じ実装 PR にする。
5. **`duplicate_name` の比較を `normalizeJpText` 後にすること。** `resolveAbbreviation({ normalize: true })` の索引が半角にした名前で引くため。`PL法` と `ＰＬ法` を別のエントリに持てない。
6. **`alias_collides_with_abbr` を REMOVED にすること。** `duplicate_name` に含まれる。残して両方返す案もあるが、1 つの誤りに 2 つの報告が出る。
7. **距離の比の上限 1/3。** 上の「しきい値を決めた根拠」のとおり。`FuzzyOptions` に比を指定する項目（例: `maxRatio`）は足していない。理由: 決定が「しきい値を設ける」で、値を利用者に選ばせる用途が今は無い。`民法` → `民訴法`・`民執法`・`民保法`（3 文字に対する距離 1）は残る。これも除きたいなら上限を 0.3（`距離 × 10 ≤ 文字数 × 3`）にするが、`労基側` → `労基法` も除かれる。
8. **`suggestCorrection` で距離 0 を除くのを `limit` の前にすること。** 除いた後で `limit` 件に打ち切る。`findSimilar` の結果を `limit` 件に打ち切ってから除くと、一致があるときに `limit - 1` 件になる。
