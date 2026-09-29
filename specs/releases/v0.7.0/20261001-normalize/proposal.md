# 変更: 関数ごとの全角・ダッシュ類・大文字の扱いを揃える（T3 正規化）

- 対象: `specs/current/` の `normalize_jp_text` / `normalize_law_num` / `normalize_search_query` / `get_all_names` / `lookup_by_law_id` / `extract_law_names` / `kanji_to_number` / `levenshtein`
- 実装の変更: 要
- 承認日: 2026-10-01（PR #30）
- 状態: 取り込み済み。実装は v0.7.0、`specs/current/` への取り込みは 2026-10-01（JST、実装 PR の最終コミット）
- 起こした日: 2026-10-01（JST）
- 起こした役: Spec Steward
- 対象 Issue: houki-abbreviations #21（関数ごとの全角・ダッシュ類・大文字の扱い）、#19（`extractLawNames` のまたがる一致と全角）、#24（漢数字・大きな数・BMP 外の文字）
- 決定の出典: houki-hub `docs/DECISIONS.md` 2026-09-29「T3 正規化」、`docs/notes/2026-09-29-plan-spec-issues.md` 4 章「段階 3」の 1

## なぜ変えるか

名前や番号を受け取る公開関数の間で、全角・半角、ダッシュ類、大文字・小文字の扱いが揃っていない（#21）。houki-egov-mcp と houki-nta-mcp は同じ入力を別の関数に渡すので、片方で見つかりもう片方で見つからないことが起きる。T3 の決定に従い、揃える場所を `normalizeJpText` の 1 か所にし、名前を受け取る関数（`getAllNames` / `extractLawNames` / `lookupByLawId`）にも `normalize` の指定を足す。MCP サーバーは入口で `normalize: true` を渡す。

あわせて、`extractLawNames` が 2 つの法令名にまたがる短い一致（`消費税法法人税法` の `法法`）を返すこと（#19）と、漢数字・桁数の大きい数・BMP 外の文字で値が変わること（#24）を、この差分で決める。どれも「入力の扱い」の節に書くことで、同じ仕様 PR にまとめる。

## 変わる振る舞い

| 関数                                      | v0.6.1                                                  | この差分                                                                                       |
| ----------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `normalizeJpText`                         | ダッシュ類は `－` だけ `-` にする                       | `‐` `‑` `–` `—` `―` `−` も `-` にする（`normalizeLawNum` と同じ範囲）                          |
| `normalizeSearchQuery`                    | 英字以外の大文字（`Ⅰ` `Α` `À`）も小文字にする           | 小文字にするのは `A`〜`Z`（全角なら `Ａ`〜`Ｚ`）だけ                                           |
| `normalizeLawNum`                         | 語の中の漢数字も算用数字にする（`千葉県` → `1000葉県`） | 直後が `年` か `号`、直前が `第`、ダッシュに隣り合う漢数字だけを算用数字にする                 |
| `normalizeLawNum`                         | 17 桁以上の算用数字は先頭の 0 を取るときに丸める        | 桁数によらず丸めない                                                                           |
| `kanjiToNumber`                           | 位ごとの並びが 16 文字以上でも読んで丸める              | 16 文字以上は `null`                                                                           |
| `levenshtein`                             | UTF-16 の単位で数える（`𠮷` と `吉` は 2）              | コードポイント単位で数える（1）                                                                |
| `getAllNames` / `lookupByLawId`           | `normalize` の指定が無い                                | `options.normalize`（既定 `false`）を足す。`true` なら全角英数字・ダッシュ類を半角にして比べる |
| `extractLawNames`                         | `normalize` の指定が無い                                | `options.normalize`（既定 `false`）を足す。`position` / `length` は元の `text` の位置          |
| `extractLawNames`（`preferLonger: true`） | ほかの一致にすっぽり入る短い一致だけを除く              | ほかの、より長い一致と 1 文字でも重なる短い一致を除く。長さが同じ一致どうしは両方返す          |

`normalizeJpText` を使う `resolveAbbreviation({ normalize: true })` / `searchByName` / `findSimilar` / `normalizeSearchQuery` / `normalizeLawNum` も、ダッシュ類を `-` にして比べるようになる。v0.6.1 の辞書の名前にはダッシュ類・チルダ・数字・空白・BMP 外の文字が無い（英字を含むのは `IT書面一括法` / `AML` / `PL法` / `JPKI法` の 4 つ）ので、辞書を引く結果は変わらない。

## 変わらない振る舞い

- `normalizeJpText` の全角英数字・チルダ・全角スペース・前後の空白の扱い（SPEC-ABBR-NORMALIZE-JP-TEXT-001〜011）
- `normalizeLawNum` の `元年`、位取り・位ごとの漢数字、人事院規則の番号の結果（001〜014 の例はどれも同じ文字列を返す）
- `getAllNames` / `lookupByLawId` / `extractLawNames` を `options` なしで呼んだときの結果（`preferLonger` の重なりの扱いを除く）
- `resolveAbbreviation` の `normalize` の既定（`false`）と、大文字・小文字を区別すること

## Issue の「決めること」への答え

### #21

| 決めること                                                                                          | 答え                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 名前を受け取る関数（`getAllNames`・`extractLawNames`）に `normalize` の指定を足すか、既定を揃えるか | `options.normalize` を足す。既定は `resolveAbbreviation` と同じ `false`（既存の呼び出しの結果を変えない）。MCP サーバーは入口で `true` を渡す（GET-ALL-NAMES-009・010、EXTRACT-LAW-NAMES-016〜018） |
| `lookupByLawId` で全角を半角にしてから比べるか                                                      | `options.normalize: true` のときだけ半角にする。小文字は大文字にしない（LOOKUP-BY-LAW-ID-005〜007）                                                                                                 |
| `normalizeJpText` でもダッシュ類を `-` に揃えるか                                                   | 揃える。範囲は `normalizeLawNum` と同じ 7 文字。罫線 `─` と長音 `ー` は変えない（NORMALIZE-JP-TEXT-012・013）                                                                                       |
| `normalizeSearchQuery` の小文字化を ASCII だけにするか、ドキュメントを直すか                        | ASCII（`A`〜`Z`）だけにする。「表に無い文字は変えない」を `normalizeJpText` と揃える（NORMALIZE-SEARCH-QUERY-002 の MODIFIED、008）                                                                 |

### #19

| 決めること                                                                                        | 答え                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ほかの一致にまたがる一致を除くか                                                                  | `preferLonger: true`（既定）で除く。より長い一致と 1 文字でも重なる短い一致を返さない。長さが同じ一致どうしは両方返す（EXTRACT-LAW-NAMES-005・010 の MODIFIED、015） |
| 探す前に `normalizeJpText` を通すか（通すなら `position` と `length` を元の文字列の位置で返すか） | `options.normalize: true` のときだけ通す。`position` と `length` は元の `text` の位置と長さで返す（EXTRACT-LAW-NAMES-016・017）                                      |

### #24

| 決めること                                         | 答え                                                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalizeLawNum` で年と番号の位置だけを変換するか | 直後が `年` か `号`、直前が `第`、直前か直後がダッシュ（`-` に揃えた後）の漢数字だけを変換する（NORMALIZE-LAW-NUM-015、戻り値の表の MODIFIED）                   |
| 桁数に上限を設けるか                               | `normalizeLawNum` は上限を設けず、先頭の 0 を文字列の操作で取って丸めない（016）。`kanjiToNumber` は位ごとの並びが 16 文字以上なら `null`（KANJI-TO-NUMBER-009） |
| `levenshtein` をコードポイント単位で数えるか       | 数える（LEVENSHTEIN-002 の MODIFIED、005）。`findSimilar` / `suggestCorrection` の `distance` も同じ数え方になる                                                 |

## 仕様 ID の一覧

| 種類     | 仕様 ID                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADDED    | SPEC-ABBR-NORMALIZE-JP-TEXT-012・013、SPEC-ABBR-NORMALIZE-LAW-NUM-015・016、SPEC-ABBR-NORMALIZE-SEARCH-QUERY-008、SPEC-ABBR-GET-ALL-NAMES-009・010、SPEC-ABBR-LOOKUP-BY-LAW-ID-005・006・007、SPEC-ABBR-EXTRACT-LAW-NAMES-015・016・017・018、SPEC-ABBR-KANJI-TO-NUMBER-009、SPEC-ABBR-LEVENSHTEIN-005 |
| MODIFIED | SPEC-ABBR-NORMALIZE-LAW-NUM-005、SPEC-ABBR-NORMALIZE-SEARCH-QUERY-001・002、SPEC-ABBR-EXTRACT-LAW-NAMES-005・010、SPEC-ABBR-LEVENSHTEIN-002。ID の無い節: `normalize_jp_text` と `normalize_law_num` の「戻り値」、`get_all_names` / `lookup_by_law_id` / `extract_law_names` の「入力」               |
| REMOVED  | なし                                                                                                                                                                                                                                                                                                   |

ADDED 16 件、MODIFIED 6 件（ID の無い節 5 つを除く）。

## 取り込みのとき（Publisher）

- 「取り込みのときに消す未決」: normalize_jp_text 3、normalize_search_query 1、get_all_names 3、lookup_by_law_id 1、extract_law_names 2・3、kanji_to_number 2、levenshtein 1、normalize_law_num 1・5。それぞれ「→ SPEC-…」の形にする（normalize_jp_text 3 → 012、normalize_search_query 1 → 008、get_all_names 3 → 009・010、lookup_by_law_id 1 → 005〜007、extract_law_names 2 → 005・015、extract_law_names 3 → 016〜018、kanji_to_number 2 → 009、levenshtein 1 → 005、normalize_law_num 1 → 015、normalize_law_num 5 → 016）
- 「できないこと」から次の行を消す: normalize_jp_text「表に無い全角記号やダッシュ類を半角にすること（未決 2、3）」のダッシュ類の部分、get_all_names「全角・半角の表記ゆれを吸収すること」、lookup_by_law_id「大文字・小文字の違い」の全角の部分、extract_law_names「全角・半角の表記ゆれを吸収すること」
- normalize_law_num の「できないこと」の `第二万三千号` の例は `'第二万3000号'` に直す（`二` は `万` に隣り合うので変えない）
- `normalize_jp_text` / `normalize_law_num` / `normalize_search_query` の「処理の流れ」の図に、ダッシュ類と漢数字の位置の条件を足す
- `search_by_name` / `find_similar` / `resolve_abbreviation` の「入力」にある `normalize` の説明（「全角英数字・全角ハイフン・全角チルダ・全角スペース」）に「ダッシュ類」を足す（振る舞いの約束は `normalizeJpText` の表に従うので、文言だけ）

## 対象外

- README・JSDoc の食い違い（#17）。`normalizeSearchQuery` の JSDoc「ASCII 大文字」は、この差分で実装が JSDoc に合う
- `resolveAbbreviation({ normalize: true })` で名前の途中の空白を取り除くこと（#17 の表の 1 行目。この差分では空白の扱いを変えない）
- `findSimilar` / `suggestCorrection` の長さの補正（#20、`spec/20261001-dictionary-rules`）

## 人が判断すること

1. **承認日。** proposal.md に承認日と PR 番号を書く。
2. **`normalize` の既定（`getAllNames` / `lookupByLawId` / `extractLawNames`）。** `false` にした。理由: `resolveAbbreviation` の既定と同じにし、既存の呼び出しの結果を変えないため。T3 の「MCP 側は入口で `normalize: true` を使う」とも合う。`searchByName` / `findSimilar` の既定（`true`）とは違うままになる。
3. **`lookupByLawId` の小文字。** `normalize: true` でも大文字にしない（LOOKUP-BY-LAW-ID-006）。理由: `isValidLawId` が小文字を受け付けない（010）ことと揃えるため。T3 は全角・半角・ダッシュ類だけを対象にしている。
4. **`normalizeSearchQuery` の小文字化。** ASCII だけにした。理由: `normalizeJpText` の「表に無い文字は変えない」と揃え、何が変わるかを 52 字に限る。egov・nta の全文検索（FTS5 の `unicode61`）は大文字小文字を区別しないので、`Ⅰ` `Α` `À` を小文字にしなくても検索結果は変わらない。
5. **`extractLawNames` のまたがる一致。** 「より長い一致と 1 文字でも重なる短い一致を除く」にした。理由: `消費税法法人税法` の `法法` のように、2 つの名前の端をつないだ一致は文中に書かれた略称ではないため。長さが同じ一致（`所得税法人税法` の `所得税法` と `法人税法`）はどちらが正しいか決められないので両方残す。
6. **`normalizeLawNum` の漢数字の位置。** 「`年` `号` の直前、`第` の直後、ダッシュの隣」だけにした。理由: 法令番号の数字はこの位置にしか無く、地名・語の漢数字（`千葉県` `一般`）を変えずに済む。egov・nta は `normalizeLawNum` を直接呼んでいない（`lookupByLawNum` の中でだけ使う）ので、影響は辞書の照合だけ。別の案は「今のまま全部変換する（照合用の関数なので表示は考えない）」で、その場合は 015 を「語の中の漢数字も変換する」に書き換える。
7. **桁数。** `normalizeLawNum` は上限を設けず文字列のまま扱う（先頭の 0 を取る処理を数値を経由しない書き方にする）。`kanjiToNumber` は `number` を返すので、正確に表せる 15 文字までとし 16 文字以上は `null`。
8. **`normalizeJpText` のダッシュ類と egov・nta の DB。** houki-egov-mcp の ingester と houki-nta-mcp の DB 投入は `normalizeJpText` を通した文字列を検索用の列に入れている。0.7.0 に上げると、投入済みの列（`―` のまま）と検索語（`-` になる）が食い違う。段階 4 で、DB の列を作り直すか、投入済みの列を再正規化する手順（nta v0.14.2 → 0.15.0 の全角英字と同じ）が要る。この差分では決めない。
