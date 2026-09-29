# 差分: lookupByLawId（20261001-normalize）

`specs/current/lookup_by_law_id/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える
- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## MODIFIED

### 入力

| 引数                | 必須 | 内容                                                                                                                                                |
| ------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `law_id`            | 必須 | e-Gov の法令 ID。例: `363AC0000000108`（消費税法）/ `321CONSTITUTION`（日本国憲法）。前後の空白は無視する                                           |
| `options.normalize` | 任意 | `true` なら、`law_id` を `normalizeJpText` に通してから比べる（全角英数字を半角にする）。既定 `false`                                                |

型は `LookupByLawIdOptions`（`{ normalize?: boolean }`）。`resolveAbbreviation` の `options.normalize` と同じ意味で、既定も同じ `false`。houki-egov-mcp・houki-nta-mcp は入口で `normalize: true` を渡す。辞書の `law_id` は半角の大文字なので、辞書の側は変換しない。

## ADDED

### SPEC-ABBR-LOOKUP-BY-LAW-ID-005 normalize: true では全角英数字を半角にしてから引く

`options.normalize` が `true` のとき、`law_id` の全角英数字を半角にしてから辞書の `law_id` と比べる。

例: `lookupByLawId('３６３AC0000000108', { normalize: true })?.formal` は `'消費税法'`。`lookupByLawId('３６３ＡＣ００００００１０８', { normalize: true })?.formal` も `'消費税法'`。

### SPEC-ABBR-LOOKUP-BY-LAW-ID-006 normalize: true でも英字の小文字は大文字にしない

`options.normalize` が `true` でも、英字の小文字を大文字にはしない。`isValidLawId`（SPEC-ABBR-IS-VALID-LAW-ID-010）と同じく、小文字の `law_id` は辞書の `law_id` と一致しない。

例: `lookupByLawId('363ac0000000108', { normalize: true })` は `null`。`lookupByLawId('３６３ac0000000108', { normalize: true })` も `null`。

### SPEC-ABBR-LOOKUP-BY-LAW-ID-007 normalize を省くか false にすると全角と半角を別の文字として引く

`options` を渡さないとき、`{}`、`{ normalize: false }` のどれでも、全角と半角の違いは吸収しない。v0.6.1 までの `lookupByLawId(law_id)` と同じ結果を返す。

例: `lookupByLawId('３６３AC0000000108')`、`lookupByLawId('３６３AC0000000108', {})`、`lookupByLawId('３６３AC0000000108', { normalize: false })` はどれも `null`。
