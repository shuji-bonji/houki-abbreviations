# 差分: 公開定数（20261001-freeze）

`specs/current/public_constants/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-PUBLIC-CONSTANTS-009 公開定数は凍結されていて、代入は TypeError になる

`DOMAINS`、`CATEGORIES`、`SOURCE_MCP_HINTS`、`LAW_TYPE_CODES`、`STALENESS_THRESHOLDS` は、どれも `Object.isFrozen` が `true` を返す。要素の追加・差し替え・削除とキーへの代入は、strict mode（ES モジュール、TypeScript の出力）では `TypeError` を投げ、値は変わらない。`judgeStaleness` の境界は実行時に変えられない。

例: `DOMAINS.push('x')` は `TypeError` を投げ、`DOMAINS.length` は 6 のまま（v0.6.1 では 7 になっていた）。`CATEGORIES[0] = 'x'` と `SOURCE_MCP_HINTS.pop()` も `TypeError`。`LAW_TYPE_CODES.Act = 'XX'` は `TypeError` で、`LAW_TYPE_CODES.Act` は `'AC'` のまま。`STALENESS_THRESHOLDS.fresh_days = 100` は `TypeError` で、その後の `judgeStaleness(50)` は `'outdated'` のまま（v0.6.1 では `'fresh'` になっていた）。
