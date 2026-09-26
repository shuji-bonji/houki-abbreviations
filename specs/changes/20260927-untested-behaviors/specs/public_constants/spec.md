# 差分: 公開定数（20260927-untested-behaviors）

`specs/current/public_constants/spec.md` に対する差分です。見出しの単位で置き換えます。

- `ADDED` の `### SPEC-…` は、current の「できること」の末尾に足す

## ADDED

### SPEC-ABBR-PUBLIC-CONSTANTS-004 LAW_TYPE_CODES は 5 つの法令種別と種別コードの対応を持つ

`LAW_TYPE_CODES` は次の 5 つのキーと値を持ち、これ以外のキーを持たない。

| キー                   | 値   |
| ---------------------- | ---- |
| `Act`                  | `AC` |
| `CabinetOrder`         | `CO` |
| `ImperialOrdinance`    | `IO` |
| `MinisterialOrdinance` | `MO` |
| `Rule`                 | `RU` |

例: `LAW_TYPE_CODES.Act` → `"AC"`、`LAW_TYPE_CODES.MinisterialOrdinance` → `"MO"`。

### SPEC-ABBR-PUBLIC-CONSTANTS-005 law_id と law_type の両方を持つエントリは、law_id の種別コードが LAW_TYPE_CODES と一致する

辞書（`abbreviationEntries`）で `law_id` が `null` でなく `law_type` も持つエントリは、どれも `law_id` の 4〜5 文字目が `LAW_TYPE_CODES[law_type]` と同じ値になっている。

例: `消法` は `law_id: "363AC0000000108"`・`law_type: "Act"` で、4〜5 文字目の `AC` が `LAW_TYPE_CODES.Act` と同じ。`law_type` を持たない `憲`（`321CONSTITUTION`）は対象外。

### SPEC-ABBR-PUBLIC-CONSTANTS-006 DOMAINS は 6 つの値をこの順で持つ

`DOMAINS` は `["tax", "labor", "accounting", "commercial", "civil", "administrative"]` で、値と順序がこのとおりになっている。

### SPEC-ABBR-PUBLIC-CONSTANTS-007 CATEGORIES は 12 の値をこの順で持つ

`CATEGORIES` は `["constitution", "law", "cabinet-order", "imperial-ordinance", "ministerial-ordinance", "rule", "kihon-tsutatsu", "kobetsu-tsutatsu", "qa-jirei", "tax-answer", "hanrei", "saiketsu"]` で、値と順序がこのとおりになっている。

### SPEC-ABBR-PUBLIC-CONSTANTS-008 SOURCE_MCP_HINTS は 6 つの値をこの順で持つ

`SOURCE_MCP_HINTS` は `["houki-egov", "houki-nta", "houki-mhlw", "houki-jaish", "houki-court", "houki-saiketsu"]` で、値と順序がこのとおりになっている。
