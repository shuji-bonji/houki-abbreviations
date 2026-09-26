# 差分: isValidLawId（20260927-untested-behaviors）

`specs/current/is_valid_law_id/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-IS-VALID-LAW-ID-011 文字列でない値は受け付けない

`law_id` に文字列でない値を渡すと `false` を返す。

例: `null`、`undefined`、`123` は、どれも `false`。

### SPEC-ABBR-IS-VALID-LAW-ID-012 全角の英数字は受け付けない

英字か数字のどれかが全角なら `false` を返す。半角に直してから判定することはしない。

例: `363ＡC0000000108`（`Ａ` が全角）と `363AC000000010８`（`８` が全角）は `false`。
