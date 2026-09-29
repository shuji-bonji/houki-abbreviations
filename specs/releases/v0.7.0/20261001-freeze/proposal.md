# 変更: 辞書のエントリと公開定数を凍結する

- 対象: `specs/current/` の `abbreviation_entries` / `public_constants`
- 実装の変更: 要
- 承認日: 2026-10-01（PR #33）
- 状態: 取り込み済み。実装は v0.7.0、`specs/current/` への取り込みは 2026-10-01（JST、実装 PR の最終コミット）
- 起こした日: 2026-10-01（JST）
- 起こした役: Spec Steward
- 対象 Issue: houki-abbreviations #13（辞書のエントリと公開定数を実行時に書き換えられ、他の関数の結果が変わる）
- 決定の出典: houki-hub `docs/DECISIONS.md` 2026-09-30「houki-abbreviations #13（凍結）」（案 A）、`docs/notes/2026-09-29-plan-spec-issues.md` 4 章「段階 3」の 4
- 前提: `spec/20261001-normalize` / `spec/20261001-input-guards` / `spec/20261001-dictionary-rules` の上に積む（`abbreviation_entries` / `public_constants` の ID はその差分の後から採番している）

## なぜ変えるか

`abbreviationEntries` の配列は凍結されているが、要素のエントリ・`aliases`・公開定数は凍結されていない。利用側が返り値や定数に代入すると、同じプロセスの中でこのパッケージの他の関数の結果まで変わる（`resolveAbbreviation('消法').formal = 'X'` の後、`lookupByLawNum('昭和63年法律第108号')?.formal` も `'X'`。`STALENESS_THRESHOLDS.fresh_days = 100` の後、`judgeStaleness(50)` が `'fresh'`）。書き換えを止めているのは TypeScript の型だけで、JavaScript からは通る。2026-09-30 の決定（案 A）に従い、深く凍結し、代入は `TypeError` にして黙って通さない。

## 変わる振る舞い

| 対象                                                                                         | v0.6.1                                           | この差分                                  |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| 各エントリのオブジェクトと `aliases` の配列                                                  | 凍結されていない。代入が通る                     | 凍結。代入・追加・削除は `TypeError`      |
| 名前・ID・一覧で返すエントリ（`resolveAbbreviation` / `listByDomain` / `searchByName` など） | 辞書のエントリそのもので、書き換えると辞書に残る | 辞書のエントリそのもので、凍結されている  |
| `DOMAINS` / `CATEGORIES` / `SOURCE_MCP_HINTS` / `LAW_TYPE_CODES` / `STALENESS_THRESHOLDS`    | 凍結されていない                                 | 凍結。`push` やキーへの代入は `TypeError` |

`TypeError` になるのは strict mode（ES モジュール、TypeScript の出力）のとき。非 strict のスクリプトでは代入が無視されて値が変わらない。どちらでも値は変わらない。

houki-egov-mcp と houki-nta-mcp の `src/` を 2026-10-01 に確かめた範囲では、`abbreviationEntries` / 公開定数 / 返り値への代入は無い（`DOMAINS` は `[...DOMAINS]` で読むだけ、`STALENESS_THRESHOLDS` は読むだけ）。0.7.0 に上げても動作は変わらない。

## 変わらない振る舞い

- `abbreviationEntries` の配列そのものが凍結されていること（SPEC-ABBR-ABBREVIATION-ENTRIES-010）
- `listByDomain` などが返す配列と `getAbbreviationStats` が返すオブジェクトが呼ぶたびに新しく、凍結されていないこと（SPEC-ABBR-LIST-BY-DOMAIN-004、SPEC-ABBR-GET-ABBREVIATION-STATS-004）
- 定数の値と順序（SPEC-ABBR-PUBLIC-CONSTANTS-001・004・006・007・008）

## Issue の「決めること」への答え

| 決めること                                                                                                     | 答え                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| エントリ・`aliases`・公開定数も `Object.freeze` するか、利用側が書き換えない前提のままにするか                 | 凍結する（ABBREVIATION-ENTRIES-019、PUBLIC-CONSTANTS-009）                                                                                                                                                                               |
| 凍結する場合、利用側が書き換えていたときに `TypeError` になるので、版の上げ方（minor か）と CHANGELOG の書き方 | 0.7.0（minor。段階 3 の他の差分と同じ版）。CHANGELOG の 0.7.0 に「互換性」の節を書き、「返り値のエントリと公開定数への代入は `TypeError` になる。書き換えていたコードは自分のコピー（`structuredClone` か `{ ...entry }`）を作る」と書く |
| 凍結しない場合、「返り値は辞書のエントリそのもので、書き換えてはいけない」ことを仕様と README に書くか         | 凍結するので、仕様には「返り値は辞書のエントリそのもので、凍結されている」と書く（019）。README の同じ文は実装 PR                                                                                                                        |

## 仕様 ID の一覧

| 種類     | 仕様 ID                                                            |
| -------- | ------------------------------------------------------------------ |
| ADDED    | SPEC-ABBR-ABBREVIATION-ENTRIES-019、SPEC-ABBR-PUBLIC-CONSTANTS-009 |
| MODIFIED | SPEC-ABBR-ABBREVIATION-ENTRIES-010                                 |
| REMOVED  | なし                                                               |

ADDED 2 件、MODIFIED 1 件。

## 取り込みのとき（Publisher）

- 「取り込みのときに消す未決」: abbreviation_entries 1（→ 019）、public_constants 1（→ 009）、judge_staleness 4（→ PUBLIC-CONSTANTS-009）、list_by_category 1、list_by_domain 2、list_by_source_mcp_hint 1、lookup_by_law_id 3、lookup_by_law_num 5、resolve_abbreviation 2（→ いずれも ABBREVIATION-ENTRIES-019）
- `abbreviation_entries` の「処理の流れ」の図の「配列を凍結する（010）」を「配列・各エントリ・aliases を凍結する（010・019）」にする。「できないこと」の「実行中にエントリを足す・消す・差し替えること」に「エントリのフィールドを書き換えること」を足す
- `public_constants` の「できないこと」の「値を追加・変更する手段を持つこと」に「（凍結されている。009）」を足す。`STALENESS_THRESHOLDS` の節の「違う境界が要る MCP サーバーは、この定数を書き換えずに自分の判定関数を書く」はそのまま
- `resolve_abbreviation` / `list_by_domain` / `list_by_category` / `list_by_source_mcp_hint` / `lookup_by_law_id` / `lookup_by_law_num` の「戻り値」に「辞書のエントリそのもので、凍結されている（SPEC-ABBR-ABBREVIATION-ENTRIES-019）」の 1 文を足す（文言だけ。ID は足さない）

## 対象外

- README の「上書きしない」の文の書き換え（#17。実装 PR で「凍結されている」に直す）
- `getAbbreviationStats` の戻り値や `listByDomain` の配列を凍結すること（呼ぶたびに新しいので、利用側が書き換えても辞書に残らない）

## 人が判断すること

1. **承認日。** proposal.md に承認日と PR 番号を書く。
2. **凍結の深さ。** エントリの `aliases` まで凍結する（`note` などの文字列は値なので対象外）。`listByDomain` などが返す配列は凍結しない（SPEC-ABBR-LIST-BY-DOMAIN-004 の「書き換えても次の呼び出しの結果は変わらない」を保つ）。
3. **返り値の ID を各関数に足さないこと。** `resolve_abbreviation` など 6 単位の未決は 019 を根拠に消し、各単位には文言だけを足す。理由: 返すのが同じオブジェクトであることは各単位の「戻り値」にすでに書いてあり、凍結は辞書の性質なので 1 か所（019）に置く。関数ごとにテストが要るなら、019 の受入テストで `resolveAbbreviation` / `lookupByLawId` / `listByDomain` / `searchByName` / `findSimilar` / `extractLawNames` の返り値を確かめる。
4. **CHANGELOG の「互換性」の節。** 0.x の minor で出す。決定（2026-09-30）どおり。
