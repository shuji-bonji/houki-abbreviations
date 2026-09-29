# 差分: extractLawNames（20261001-dictionary-rules）

`specs/current/extract_law_names/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-EXTRACT-LAW-NAMES-019 同じエントリの同じ位置・同じ長さの一致は 1 件にする

1 つのエントリの 2 つ以上のキー（`abbr` と `formal` が同じ値、など）が `text` の同じ位置に同じ長さで一致したときは、1 件だけを返す。`matchedKey` は `abbr`・`formal`・`aliases` の順で先のキー。`dedupe` の指定によらない。別のエントリどうしの同じ位置・同じ長さの一致は、SPEC-ABBR-EXTRACT-LAW-NAMES-012 のとおり両方返す。

例: `酒税法`（`abbr` と `formal` がどちらも `酒税法`）→ 1 件。`matchedKey: "酒税法"`、`position: 0`、`length: 3`（v0.6.1 では同じ一致を 2 件返していた）。`公認会計士法の規定` → `公認会計士法` の 1 件。`民法の解釈` → `民法` の 1 件。
