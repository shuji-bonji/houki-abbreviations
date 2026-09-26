# 差分: getAllNames（20260927-untested-behaviors）

`specs/current/get_all_names/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-GET-ALL-NAMES-006 同じ文字列の名前は最初の 1 つだけを返す

エントリの `abbr`・`formal`・`aliases` に同じ文字列が 2 回以上あるときは、`abbr`・`formal`・`aliases` の順で最初に出たものだけを残し、後のものは返さない。残した名前の順は SPEC-ABBR-GET-ALL-NAMES-001 と同じ。

例: `abbr` と `formal` がどちらも `酒税法` のエントリでは、`getAllNames('酒税法')` は `['酒税法']`。`formal` と別名がどちらも `消費税法基本通達` のエントリでは、`getAllNames('消基通')` は `['消基通', '消費税法基本通達']`。

### SPEC-ABBR-GET-ALL-NAMES-007 name の前後の空白を除いてから引く

`name` の前後にある空白（スペース・タブ・改行）を取り除いてから辞書と照合する。

例: `getAllNames(' 消法 ')` と `getAllNames('\t消費税法\n')` は、どちらも `getAllNames('消法')` と同じ配列。

### SPEC-ABBR-GET-ALL-NAMES-008 呼ぶたびに新しい配列を返す

戻り値は呼び出しごとに作った配列で、書き換えても辞書や次の呼び出しの結果は変わらない。

例: `getAllNames('消法')` の戻り値に `push('x')` し、先頭を `'y'` に書き換えても、次の `getAllNames('消法')` は先頭が `消法` の 12 件。2 回の呼び出しの戻り値は同じ配列（`===`）ではない。
