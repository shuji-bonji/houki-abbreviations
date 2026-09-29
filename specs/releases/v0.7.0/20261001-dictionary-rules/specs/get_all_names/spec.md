# 差分: getAllNames（20261001-dictionary-rules）

`specs/current/get_all_names/spec.md` に対する差分です。見出しの単位で置き換えます。

- `MODIFIED` の見出しは、current の同じ見出しの本文をこの本文で置き換える

## MODIFIED

### SPEC-ABBR-GET-ALL-NAMES-006 同じ文字列の名前は最初の 1 つだけを返す

エントリの `abbr`・`formal`・`aliases` に同じ文字列が 2 回以上あるときは、`abbr`・`formal`・`aliases` の順で最初に出たものだけを残し、後のものは返さない。残した名前の順は SPEC-ABBR-GET-ALL-NAMES-001 と同じ。

例: `abbr` と `formal` がどちらも `酒税法` のエントリでは、`getAllNames('酒税法')` は `['酒税法']`。`abbr` と `formal` がどちらも `製造物責任法` で別名 `PL法` を持つエントリでは、`getAllNames('PL法')` は `['製造物責任法', 'PL法']`。0.7.0 の辞書では `aliases` に自分の `abbr` / `formal` と同じ値を入れない（SPEC-ABBR-ABBREVIATION-ENTRIES-018）ので、重なるのは `abbr` と `formal` が同じ場合だけ。
