# 機能: findSimilar（編集距離が近い名前を持つエントリを探す）

- 機能 ID: ABBR
- 版: current
- 承認日: 2026-09-27 （PR #10）
- 起こした元: v0.6.0 の `src/search.ts`（`findSimilar`・`FuzzyOptions`・`FuzzyMatch`）、`src/index.ts`（`findSimilar`）、`src/search.test.ts`
- 関連する Issue: なし（v0.4.0 の Track 1 で追加）

この文書は「この関数は何をするか」を書きます。どう実装しているか（内部の変数名・インデックスの作り方）は書きません。

## アクター

- houki-abbreviations を import する利用者（houki-nta-mcp・houki-egov-mcp などの MCP サーバー、または独自のコード）。`労働基準法施行例` のように 1〜2 文字誤った名前を渡して、近い名前を持つ辞書のエントリと、その近さ（編集距離）を受け取る

## 入力

| 引数                  | 必須 | 内容                                                                                                                                      |
| --------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `query`               | 必須 | 探す名前。例: `労働基準法` / `消費税法施行令例`。前後の空白は無視する                                                                     |
| `options.maxDistance` | 任意 | 返すエントリの編集距離の上限。既定 2                                                                                                      |
| `options.limit`       | 任意 | 返す件数の上限。既定 5。1 未満は 1 として扱う                                                                                             |
| `options.sortByScore` | 任意 | 編集距離の小さい順に並べるか。既定 `true`                                                                                                 |
| `options.filter`      | 任意 | 絞り込み。型は `SearchFilter`（`searchByName` と同じ）。キーは `domain` / `category` / `source_mcp_hint` で、それぞれ単一の値か配列を取る |
| `options.normalize`   | 任意 | 全角英数字・全角ハイフン・全角チルダ・全角スペースを半角にしてから比べるか。既定 `true`                                                   |

型は `FuzzyOptions`。辞書は関数が持っている（v0.6.0 で 174 件）。エントリの配列を渡す引数は無い。

## 戻り値

`FuzzyMatch` の配列。1 件も無ければ空配列。1 つのエントリは 1 回だけ入る。

| フィールド   | 内容                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| `entry`      | 辞書のエントリ（`AbbreviationEntry`）                                                                |
| `matchedKey` | そのエントリの略称・正式名称・別名のうち、`query` との編集距離が最も小さかった名前。辞書の表記のまま |
| `distance`   | `query` と `matchedKey` の編集距離（`levenshtein` の値）。0 は一致                                   |

## 処理の流れ

呼び出しを受けてから配列を返すまでに、何をどの順で確かめるかを示します。図の中の番号は「できること」の仕様 ID の末尾 3 桁です。

```mermaid
flowchart TD
  A["呼び出し（query・options）"] --> B{"前後の空白を除いた query が空か"}
  B -- はい --> E1["空配列を返す（006）"]
  B -- いいえ --> C["filter で辞書のエントリを絞る（005）"]
  C --> D["エントリごとに、略称・正式名称・別名のうち query に最も近い名前と編集距離を求める"]
  D --> F{"編集距離が maxDistance 以下か"}
  F -- いいえ --> G["そのエントリは返さない（002）"]
  F -- はい --> H["候補に入れる。一致なら distance 0（001）"]
  H --> I["編集距離の小さい順に並べる（003）"]
  I --> J["limit 件で打ち切って返す（004）"]
```

## できること

### SPEC-ABBR-FIND-SIMILAR-001 名前が一致するエントリは distance 0 で先頭に返す

`query` がエントリの略称・正式名称・別名のどれかと一致するとき、そのエントリを `distance: 0` で返す。既定の並び順では先頭に来る。

例: `findSimilar('労働基準法')` の先頭は `entry.abbr: "労基法"`、`entry.formal: "労働基準法"`、`matchedKey: "労働基準法"`、`distance: 0`。続いて `労契法`（`労働契約法`、2）・`労組法`（`労働組合法`、2）・`建基法`（`建築基準法`、2）。

### SPEC-ABBR-FIND-SIMILAR-002 編集距離が maxDistance 以下のエントリだけを返す

エントリの略称・正式名称・別名のうち最も近いものとの編集距離が `maxDistance` 以下のエントリだけを返す。どのエントリも `maxDistance` を超えるときは空配列を返す。

例: `findSimilar('労働基準法施行例', { maxDistance: 2 })` は `労基則`（`matchedKey: "労働基準法施行規則"`、`distance: 2`）の 1 件を返す。`findSimilar('消費税法施行令例')` は `消令`（`消費税法施行令`、1）と `消規`（`消費税法施行規則`、2）を返す。`findSimilar('全く関係ない長い文字列ですよ', { maxDistance: 1 })` は `[]`。

### SPEC-ABBR-FIND-SIMILAR-003 既定では編集距離の小さい順に並べる

`sortByScore` を省くか `true` にすると、`distance` の小さい順に並べてから返す。

例: `findSimilar('労働基準法施行例', { maxDistance: 5 })` は `労基則`（2）・`労基法`（3）・`所令`（5）・`法令`（5）・`消令`（5）の順。

### SPEC-ABBR-FIND-SIMILAR-004 limit の件数で打ち切る

候補が `limit` を超えるときは、並べた後で `limit` 件に打ち切って返す。

例: `findSimilar('法', { maxDistance: 5, limit: 3 })` は 3 件を返す（`limit` を付けなければ 5 件、`limit: 1000` なら 165 件）。

### SPEC-ABBR-FIND-SIMILAR-005 filter で候補のエントリを絞る

`filter` を渡すと、その条件に当たるエントリだけを候補にする。キーの意味は `searchByName` と同じ（SPEC-ABBR-SEARCH-BY-NAME-005）。

例: `findSimilar('法', { maxDistance: 5, filter: { domain: 'tax' }, limit: 100 })` は 35 件を返し、すべて `entry.domain: "tax"`。

### SPEC-ABBR-FIND-SIMILAR-006 空の query には空配列を返す

`query` が空文字か、前後の空白を除くと空になるときは、辞書を調べずに空配列を返す。エラーにはしない。

例: `findSimilar('')` と `findSimilar('   ')` はどちらも `[]`。

## できないこと

- 名前の一部で探すこと（`searchByName`。`findSimilar` は名前全体どうしの編集距離を比べる）
- 略称と正式名称のように編集距離が大きい組を結び付けること（辞書の `aliases` に登録して `resolveAbbreviation` で引く）
- 英字の大文字・小文字の違いを同じとみなすこと（`findSimilar('pl法')` は `製造物責任法` を返さない）
- 正式名称だけを文字列で返すこと（`suggestCorrection`）

## 未決

初版起こしで見つけた、意図か不具合かを人が決める項目です。決まったら「できること」に ID を振るか、`specs/changes/` の差分にします。

意図か不具合かの判断が要る項目は houki-abbreviations の Issue に移し、ここには題と Issue の番号だけを残します。今の振る舞いのままでよくテストが無いだけの項目は、受入テストを書いてから「できること」に ID を振ります。

1. **ドキュメントの例と実際の結果が違う。** → houki-abbreviations #17
2. **短い query は意味の違う短い略称に当たる。** → houki-abbreviations #20
3. **全角・半角の吸収（`normalize`）。** 既定の `normalize: true` では、全角英数字を半角にしてから比べる。`findSimilar('ＰＬ法')` の先頭は `製造物責任法`（`matchedKey: "PL法"`、0）で、`normalize: false` では `製造物責任法` は入らない。`matchedKey` は半角にした後の文字列ではなく辞書の表記のまま返る。どれもテストが無い。ID を振るのは受入テストを書いてから。
4. **`sortByScore: false` と、距離が同じときの順。** `sortByScore: false` のときは辞書の並びのまま `limit` 件で打ち切る（`findSimilar('労働基準法施行例', { maxDistance: 5, sortByScore: false })` は `所令`・`法令`・`消令`・`相令`・`通令`（どれも 5）で、距離 2 の `労基則` が入らない）。`distance` が同じエントリは辞書の並びを保つ。どちらもテストが無い。ID を振るのは受入テストを書いてから。
5. **`limit` の既定値と 1 未満の値。** 既定の 5 件と、1 未満の値の扱いにテストが無い。`limit: 0` と `limit: -1` は 1 件を返す。`NaN` の扱いは未決 8。テストが無い。ID を振るのは受入テストを書いてから。
6. **`maxDistance` の既定値と 0 以下の値。** 既定の 2 を確かめるテストが無い。`maxDistance: 0` は一致だけを返し（`findSimilar('消費税', { maxDistance: 0 })` は別名 `消費税` に一致した `消法` の 1 件）、負の値は常に `[]`。ID を振るのは受入テストを書いてから。
7. **`matchedKey` の選び方。** 1 つのエントリの中で距離が同じ名前が複数あるときは、略称・正式名称・別名の順で先に見たものが `matchedKey` になる。`matchedKey` の値を確かめるテストが無い。ID を振るのは受入テストを書いてから。
8. **`limit` に `NaN` を渡したときの扱いと上限。** → houki-abbreviations #22
