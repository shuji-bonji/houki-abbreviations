# 差分: getAllNames（20261001-normalize）

`specs/current/get_all_names/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### 入力

| 引数                | 必須 | 内容                                                                                                                                        |
| ------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | 必須 | 辞書の略称（`abbr`）・正式名称（`formal`）・別名（`aliases`）のどれか。例: `消法` / `消費税法` / `インボイス`。完全一致で引く               |
| `options.normalize` | 任意 | `true` なら、`name` と辞書の名前の両方を `normalizeJpText` に通してから比べる（全角英数字・ダッシュ類・全角チルダ・全角スペースを半角にする）。既定 `false` |

型は `GetAllNamesOptions`（`{ normalize?: boolean }`）。`resolveAbbreviation` の `options.normalize` と同じ意味で、既定も同じ `false`。houki-egov-mcp・houki-nta-mcp は入口で `normalize: true` を渡す。

## ADDED

### SPEC-ABBR-GET-ALL-NAMES-009 normalize: true では全角英数字・ダッシュ類を半角にしてから引く

`options.normalize` が `true` のとき、`name` と辞書の名前の両方を `normalizeJpText` に通して比べる。返す名前は辞書に書かれた表記のままで、半角にした文字列は返さない。前後の空白も除く。

例: `getAllNames('ＰＬ法', { normalize: true })` は `['製造物責任法', 'PL法']`（`getAllNames('PL法')` と同じ配列）。`getAllNames('　消法　', { normalize: true })` は `getAllNames('消法')` と同じ配列。

### SPEC-ABBR-GET-ALL-NAMES-010 normalize を省くか false にすると全角と半角を別の文字として引く

`options` を渡さないとき、`{}`、`{ normalize: false }` のどれでも、全角と半角の違いは吸収しない。v0.6.1 までの `getAllNames(name)` と同じ結果を返す。

例: `getAllNames('ＰＬ法')`、`getAllNames('ＰＬ法', {})`、`getAllNames('ＰＬ法', { normalize: false })` はどれも `[]`。`getAllNames('PL法', { normalize: false })` は `['製造物責任法', 'PL法']`。
