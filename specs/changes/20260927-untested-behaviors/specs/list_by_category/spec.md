# 差分: listByCategory（20260927-untested-behaviors）

`specs/current/list_by_category/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-LIST-BY-CATEGORY-004 辞書の並びのまま返す

返す配列の要素は、辞書（`abbreviationEntries`）での並びのまま並ぶ。`abbreviationEntries.filter((e) => e.category === category)` と同じエントリを同じ順で返す。

例: `listByCategory('law')` の先頭の 3 件は `所法` / `法法` / `消法`、`listByCategory('kihon-tsutatsu')` の先頭の 3 件は `消基通` / `所基通` / `法基通` で、どれも `abbreviationEntries` での順と同じ。

### SPEC-ABBR-LIST-BY-CATEGORY-005 呼ぶたびに新しい配列を返す

呼ぶたびに新しい配列を返す。返した配列に要素を足したり、配列から要素を除いたりしても、次の呼び出しの結果は変わらない。

例: `const a = listByCategory('law'); a.push({})` の後も、`listByCategory('law')` は 138 件を返す。`a.splice(0)` の後も同じ。同じ引数で 2 回呼んだ結果は別の配列（`!==`）。

### SPEC-ABBR-LIST-BY-CATEGORY-006 CATEGORIES に無い値には空配列を返す

JavaScript から `CATEGORIES` に無い値を渡したときは、例外を投げずに空配列を返す。

例: `listByCategory('xxx')` と `listByCategory(undefined)` は `[]`。

### SPEC-ABBR-LIST-BY-CATEGORY-007 ministerial-ordinance・rule・kobetsu-tsutatsu にもその種別のエントリを返す

`ministerial-ordinance`（省令）・`rule`（規則）・`kobetsu-tsutatsu`（個別通達）を渡したときも、その種別のエントリだけを返す。

例: `listByCategory('ministerial-ordinance')` は `所規`（`formal: "所得税法施行規則"`）・`労基則`・`会社規` などを含む 16 件、`listByCategory('rule')` は `民訴規`（`formal: "民事訴訟規則"`）と `刑訴規`（`formal: "刑事訴訟規則"`）の 2 件、`listByCategory('kobetsu-tsutatsu')` は `電帳法取通`（`formal: "電子計算機を使用して作成する国税関係帳簿書類の保存方法等の特例に関する法律の取扱通達"`）の 1 件を返す。どの要素もそれぞれの `category` を持つ。
