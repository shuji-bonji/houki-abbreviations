# 差分: lookupByLawNum（20260927-untested-behaviors）

`specs/current/lookup_by_law_num/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-LOOKUP-BY-LAW-NUM-007 空白だけの law_num には null を返す

`law_num` が空白（半角スペース・タブなど）だけのときは `null` を返す。

例: `lookupByLawNum('   ')` も `lookupByLawNum('\t')` も `null`。

### SPEC-ABBR-LOOKUP-BY-LAW-NUM-008 数字の先頭の 0 を無視する

年や番号の算用数字の先頭に 0 が付いていても、付いていないものと同じ法令番号として照合する。

例: `lookupByLawNum('昭和063年法律第0108号')?.formal` は `'消費税法'`、`lookupByLawNum('昭和63年法律第00108号')?.formal` は `'消費税法'`。

### SPEC-ABBR-LOOKUP-BY-LAW-NUM-009 元年と 1 年を同じ年として照合する

`law_num` の `元年` と `1年`（`一年`）は同じ年として照合する。入力が `元年` でも辞書の `law_num` が `元年` でもよい。v0.6.0 の辞書には `元年` の `law_num` を持つエントリが無いので、辞書を差し替えて確かめる。

例: `law_num` が `令和元年法律第一号` のエントリ 1 件だけの辞書で、`令和1年法律第1号`・`令和元年法律第一号`・`令和元年法律第01号` はどれもそのエントリを返す（`src/lookup.ts` の `lookupByLawNum(entries, law_num)` で確かめた）。
