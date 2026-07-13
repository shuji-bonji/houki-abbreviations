# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

(none)

## [0.5.0] - 2026-07-14

✨ **minor リリース** — 逆引き API + 検証ヘルパを追加。当初 v0.5.0（逆引き）/ v0.6.0（検証）と分ける計画だったが、1 ブランチで同時実装したため v0.5.0 に統合してリリース（経緯は [docs/v0.5-v0.6-design.md](docs/v0.5-v0.6-design.md)）。

### Added (検証ヘルパ)

- **新規 [`src/validate.ts`](src/validate.ts)**: 検証ヘルパ群。
  - **`isValidLawId(law_id)`**: e-Gov `law_id` 形式の純粋関数チェック（外部 API 不要）。標準 15 文字 + `CONSTITUTION` 専用 + `M\d{2}` 省令系の 3 パターン対応。
  - **`validateAllEntries(entries?)`**: 辞書全体の静的整合性チェック。`abbr` / `law_id` 重複、必須フィールド欠損、`law_id` 形式不正を error、`category` × `source_mcp_hint` 不整合や `aliases` 衝突を warning として返す。
  - **`extractLawNames(text, options?)`**: テキスト中の法令名を辞書マッチで抽出。`minLength` / `preferLonger` / `dedupe` オプション対応。LLM 出力チェック用途。
- **新規 [`scripts/verify-law-ids.mjs`](scripts/verify-law-ids.mjs)**: e-Gov API 突合 CI スクリプト雛形。`npm run verify-law-ids` で実行（パッケージ本体には含めず、月次 GitHub Actions 想定）。
- **package.json scripts**: `validate` / `verify-law-ids` を追加。

### Added (逆引き API)

- **新規 [`src/lookup.ts`](src/lookup.ts)**: 逆引き API 群。
  - **`lookupByLawId(law_id)`**: e-Gov `law_id` から `AbbreviationEntry` を引く完全一致 lookup。
  - **`lookupByLawNum(law_num)`**: 法令番号（漢数字）から `AbbreviationEntry` を引く完全一致 lookup。
  - **`getAllNames(name)`**: `abbr` / `formal` / `aliases` のいずれかから「全別表記」を `[abbr, formal, ...aliases]` 順・重複除去済みで返す。LLM プロンプト生成用途。
- **新規型 export**: `ValidationIssue` / `ValidationReport` / `LawNameMatch` / `ExtractOptions`。

### Tests

- **新規 [`src/lookup.test.ts`](src/lookup.test.ts)**: 13 ケース。fixtures による単体テスト。
- **新規 [`src/validate.test.ts`](src/validate.test.ts)**: 27 ケース。`isValidLawId` の境界値、`validateAllEntries` の各 error / warning コード、`extractLawNames` のオプション挙動。実データに対する `validateAllEntries` 全件 valid 回帰防止テストを含む。

### Documentation

- **新規 [`docs/v0.5-v0.6-design.md`](docs/v0.5-v0.6-design.md)**: 逆引き API + 検証ヘルパの設計メモ。スコープ、未決事項、互換性方針を記録。
- **README.md (v0.5.0 分)**: 「逆引き API（v0.5.0〜）」「検証 API（v0.5.0〜）」セクションを新規追加。`validateAllEntries` の error/warning コード一覧、`isValidLawId` の認識パターン、`extractLawNames` のオプション表を含む。
- **README.md (v0.4.x 分)**: 検索 API（v0.4.0〜）と鮮度判定 API（v0.4.1〜）のセクションを追加。
  - `searchByName` の `mode`（`prefix` / `contains` / `suffix`）別挙動表。
  - `findSimilar` の Levenshtein 距離の入出力例（実データで動く例のみ）。
  - `STALENESS_THRESHOLDS` の意味と運用想定を表で明示。
  - `## API` シグネチャ表を全新規 API 分（`searchByName` / `findSimilar` / `suggestCorrection` / `levenshtein` / `judgeStaleness` / `computeDaysSince` / `STALENESS_THRESHOLDS` / `lookupByLawId` / `lookupByLawNum` / `getAllNames` / `isValidLawId` / `validateAllEntries` / `extractLawNames`）まで拡充。

### Internal (JSDoc only — no API change)

- `src/freshness.ts` のヘッダ JSDoc を補強:
  - 「エントリ単位の freshness は持たない」設計判断を明記。
  - 呼び出し側の典型パターン（4 ステップ）を追加。
  - MCP 固有しきい値が必要な場合のラップ例（本定数を上書きしない方針）を追加。
- `src/freshness.ts` の `StalenessLevel` / `judgeStaleness` に挙動例（境界値含む）を JSDoc に追加。
- `src/types.ts` の `AbbreviationEntry` JSDoc に「freshness は別 API」の注記を追加。

### Migration

- 完全な後方互換。既存 API はすべて挙動不変。
- `AbbreviationEntry` には新フィールドを追加していない（`freshness` 同様、運用状態は持たない方針）。
- 新規 export は `index.ts` 経由で利用可能。

### 関連

- Issue #3（コードレビュー v0.4.1）の改善提案 1（README 強化）・2（freshness 型/JSDoc 強化）に対応。本リリースで完了。
- Roadmap 更新: `routing` API は YAGNI 判断で延期（3 つ目の MCP 着手と同時に再評価）。

## [0.4.1] - 2026-05-08

🩹 **patch リリース** — houki-hub family の **freshness 判定を共通化** (Issue #15 対応)。型 + 閾値定数 + 純関数のみを追加し、DB アクセス層・レスポンス整形は各 MCP に残す軽量な共通化。

### Added

- **新規 [`src/freshness.ts`](src/freshness.ts)**: family 共通の staleness 判定ヘルパ。
  - **型 `StalenessLevel`** (`'fresh' | 'stale' | 'outdated'`)
  - **閾値定数 `STALENESS_THRESHOLDS`** (`fresh_days: 7`, `stale_days: 30` — houki-nta-mcp v0.6.0 で確立された慣行値)
  - **純関数 `judgeStaleness(daysSince)`** — 経過日数 → staleness レベル
  - **純関数 `computeDaysSince(fetchedAt, nowMs?)`** — ISO 8601 fetched_at から経過日数を計算 (パース不能 / 未来時刻は 0)
- **新規 [`src/freshness.test.ts`](src/freshness.test.ts)** (16 ケース): 閾値・境界値・典型シナリオを網羅。

### 共通化の方針 (Issue #15 設計判断より)

- **共通化するもの**: 型 + 閾値 + 純関数のみ
- **共通化しないもの**: DB アクセス層 (例: `summarizeFreshnessFromSection` / `summarizeFreshnessFromDocument`)、レスポンス整形 (`FreshnessRange` / `FreshnessSingle` interface 等)、警告メッセージ (各 MCP の bulk DL コマンド文言)

各 MCP のデータ取得方法 (bulk DL / API / 都度 fetch) ごとの違いを吸収するため、検知ロジックは各 MCP に残す。memory `houki_resilience_locality.md`「検知ロジックは各 MCP に置き、集約は結果レイヤーで」スタンスと整合。

### Migration (v0.4.0 → v0.4.1)

- 完全な後方互換。既存 API はすべて挙動不変。
- 新規 export (`StalenessLevel` / `STALENESS_THRESHOLDS` / `judgeStaleness` / `computeDaysSince`) を追加するだけ。
- 各 MCP は本パッケージの閾値・純関数を import に切替えれば、家族横断で **同じ感覚で staleness を判定** できる (例: houki-nta-mcp v0.9.3 で対応予定)。

### 関連 GitHub Issue

- [houki-nta-mcp Issue #15](https://github.com/shuji-bonji/houki-nta-mcp/issues/15): freshness ロジックを houki-hub family 共有パッケージに昇格 — **本リリースで対応 (B 案: 型 + 閾値だけ同梱)**

## [0.4.0] - 2026-05-08

🚀 **検索拡張リリース** — Track 1 (search & fuzzy API) を追加し、家族横断の検索精度を大幅に向上。houki-nta-mcp の Issue #3 (通称キーワードでヒット 0 件問題) を本パッケージで解消するための布石。

### Added

#### Track 1: 検索拡張 API

- **新規 `searchByName(query, options)`** ([`src/search.ts`](src/search.ts)): 部分一致モード対応の検索 API。`abbr` / `formal` / `aliases` を横断走査し、`prefix` / `contains` (default) / `suffix` の 3 モードを切替可能。`filter` で `domain` / `category` / `source_mcp_hint` の絞り込み、`limit` で件数制限、`normalize` で全角ゆらぎ吸収。
- **新規 `findSimilar(query, options)`**: Levenshtein 距離ベースのあいまい一致 API。`maxDistance` (default 2) 以下のエントリを返す。`sortByScore` で距離昇順ソート、`limit` / `filter` も対応。例: 「労働基準法施行例」→「労働基準法施行令」(distance=1)。
- **新規 `suggestCorrection(query, limit)`**: `findSimilar` の薄いラッパで、上位 N 件の `formal` だけを文字列配列で返す。LLM プロンプトでそのまま使える形。
- **新規 `levenshtein(a, b)`**: 内部 helper だが export してテスト・外部利用可能。外部依存なし、O(m\*n) 時間 / O(min(m,n)) 空間の自前実装 (~50 行)。
- **新規 export 型**: `SearchMode` / `SearchOptions` / `SearchFilter` / `FuzzyOptions` / `FuzzyMatch`

#### Track 4: 辞書増強 (Issue #3 対応の最小範囲)

LLM が自然に投げる通称・俗称を `aliases` で吸収できるよう、税務・行政分野の主要エントリに通称を追加:

- **消費税法 (`消法`)** に追加: `インボイス`, `インボイス制度`, `適格請求書`, `適格請求書等保存方式`, `適格請求書発行事業者`, `軽減税率`, `軽減税率制度`, `簡易課税`, `簡易課税制度`
- **所得税法 (`所法`)** に追加: `ふるさと納税`, `寄附金控除`, `寄付金控除`, `確定申告`
- **電帳法**: `電帳`, `電子帳簿保存`, `電子帳簿等保存制度` を alias に追加 (既存の「電子帳簿保存法」は維持)
- **マイナンバー法** に追加: `マイナンバー`, `マイナ`, `個人番号`, `個人番号利用法`

これにより `resolveAbbreviation('インボイス')` が消費税法エントリを返し、houki-nta-mcp 等の家族 MCP は **既存の Phase 6-1 略称展開ロジックそのままで Issue #3 を自動解消** できる。

#### テスト

- **新規 [`src/search.test.ts`](src/search.test.ts)** (24 ケース): `searchByName` の 3 モード + filter + limit + normalize / `findSimilar` の Levenshtein 動作 + filter / `suggestCorrection` / `levenshtein` 内部 helper / Issue #3 関連エントリの alias sanity check。

### Migration (v0.3.x → v0.4.0)

- **完全な後方互換**。既存 API (`resolveAbbreviation` / `listByDomain` / `listByCategory` / `listBySourceMcpHint` / `getAbbreviationStats`) はすべて挙動不変。
- 新規 API (`searchByName` / `findSimilar` / `suggestCorrection`) を追加するだけ。
- `aliases` 拡充により、houki-nta-mcp v0.8.0+ の `buildFtsQueryWithAbbreviation` が `インボイス` 等の通称で消費税法 formal を OR 展開するようになり、検索ヒット率が向上 (houki-nta-mcp 側の改修は不要)。

### v0.4.0 Roadmap の他 Track

- **Track 2** (逆引き API: `findByLawId` / `findByLawNum` 等): 次の minor (v0.5.0 想定)。Issue #3 解決には不要なため本リリースでは見送り。
- **Track 3** (検証ヘルパー: `validateAllEntries` / `getCoverageReport`): v0.6.0 想定。
- **Track 5** (ルーティング: `routeToMcp`): Track 1 + Track 2 完成後の v0.5.0 以降。

詳細は [`docs/v0.4.0-roadmap.md`](docs/v0.4.0-roadmap.md) を参照。

## [0.3.0] - 2026-05-03

**正規化 API 追加**。houki-nta-mcp で確立された Normalize-everywhere パターンを共通パッケージに昇格。houki-hub MCP family 全体で全角／半角の表記ゆらぎを統一的に扱えるようにする。

### Added

- **正規化ヘルパー関数（新規 `src/normalize.ts`）**
  - `normalizeJpText(input)` — 保守的な width 正規化。全角数字／全角 ASCII 文字／全角ハイフン（`－` → `-`）／全角チルダ（`～` `〜` → `~`）／全角スペース → 半角。漢字・かな・中黒は保持。**大文字小文字は保持**
  - `normalizeSearchQuery(input)` — `normalizeJpText` に加えて、ASCII 大文字 → 小文字、連続空白 → 単一スペースへ畳み込み

- **`resolveAbbreviation` の `options.normalize`**
  - `resolveAbbreviation(name, { normalize: true })` で全角／半角の表記ゆらぎを吸収して照合可能に
  - 正規化済みインデックスは初回呼び出し時に lazy 構築（メモリオーバーヘッドなし）
  - 正規化なしインデックスを優先照合してから正規化済みインデックスへフォールバック（既存挙動を尊重）
  - `options` を渡さない場合の挙動は v0.2.0 と完全に同じ（**後方互換性**）

- **`ResolveAbbreviationOptions` インターフェースの export**
  - 利用側 MCP で型を再利用可能

- **テスト 24 件追加（`src/normalize.test.ts`）**
  - `normalizeJpText` / `normalizeSearchQuery` の各種ケース
  - `resolveAbbreviation({ normalize: true })` の代表ケース、後方互換性、エッジケース

### Changed

- **`package.json` に `"sideEffects": false`** を追加。Tree-shaking がより効果的に効くように
- README に「正規化 API」セクションを追加

### Source

houki-nta-mcp v0.3.0-alpha.6 の `src/services/text-normalize.ts` の保守的部分（width-only normalization）を共通パッケージへ昇格。FTS5 escape などの houki-nta-mcp 固有処理は引き続き各 MCP 内に残す。

## [0.2.0] - 2026-04-27

**通達系エントリ追加**。houki-nta-mcp の Phase 1 開発に向けた前提整備として、税法系の通達略称 9 件を追加。

### Added

- **通達系エントリ 9 件**（全て `source_mcp_hint: 'houki-nta'`）
  - `消基通` — 消費税法基本通達 (`category: 'kihon-tsutatsu'`)
  - `所基通` — 所得税基本通達
  - `法基通` — 法人税基本通達
  - `相基通` — 相続税法基本通達
  - `通基通` — 国税通則法基本通達
  - `徴基通` — 国税徴収法基本通達
  - `措通` — 租税特別措置法関係通達
  - `印基通` — 印紙税法基本通達
  - `電帳法取通` — 電子帳簿保存法取扱通達 (`category: 'kobetsu-tsutatsu'`)

### Changed

- 統計の更新: total 165 → **174**, tax 26 → **35**
- カテゴリ追加: `kihon-tsutatsu: 8`, `kobetsu-tsutatsu: 1`
- MCP hint 追加: `houki-nta: 9`
- テスト更新: `listByCategory('kihon-tsutatsu')` / `listBySourceMcpHint('houki-nta')` の動作確認テストを追加

### Notes (v0.1.1 で計画していた変更)

- `docs/RELEASE.md` 追加（初回手動 publish + Trusted Publisher の卵と鶏問題の記録）
- `publish.yml` の Node 24 化（npm 11+ 同梱でセルフアップデート不要）

これらは v0.1.1 を独立 release せず v0.2.0 に統合した。

## [0.1.0] - 2026-04-27

**初版リリース**。houki-hub-mcp v0.1.x の `src/abbreviations/` を切り出して独立パッケージ化。

### Added

- **公開 API**
  - `resolveAbbreviation(name)` — 略称・通称・正式名称のいずれかからエントリを解決
  - `listByDomain(domain)` — 分野で絞り込み
  - `listByCategory(category)` — 法令カテゴリで絞り込み
  - `listBySourceMcpHint(hint)` — 管轄 MCP で絞り込み
  - `getAbbreviationStats()` — 辞書統計
  - `abbreviationEntries` — 全件配列（read-only）
- **エントリ型** `AbbreviationEntry`
  - 既存 houki-hub-mcp 互換のフィールド（abbr, formal, law_id, law_num, law_type, domain, aliases, note）
  - **新規追加** `category` — 法令カテゴリ（'constitution' / 'law' / 'cabinet-order' 等）
  - **新規追加** `source_mcp_hint` — 参照すべき MCP（houki-egov 等）
- **165 エントリ収録**
  - tax: 26 / labor: 28 / accounting: 9 / commercial: 31 / civil: 23 / administrative: 48
  - 全エントリ `source_mcp_hint='houki-egov'`（v0.1.0 時点）
  - カテゴリ内訳: law: 大半 / cabinet-order: 政令系 / ministerial-ordinance: 規則系 / constitution: 1（日本国憲法） / rule: 1
- **マイグレーションスクリプト** `scripts/migrate.mjs`
  - 同階層の `houki-hub-mcp/src/abbreviations/*.json` から自動変換
  - law_type → category マッピング、source_mcp_hint='houki-egov' を一律付与
- **テスト 21 件**（vitest）
  - 辞書整合性（必須フィールド、law_id 形式、略称重複、category 整合性）
  - 公開関数の動作（resolve / listByDomain / listByCategory / listBySourceMcpHint / stats）
- **CI**（GitHub Actions、Node 20/22 マトリクス、lint + test + build）
- **ドキュメント** README.md / CONTRIBUTING.md

### Source

houki-hub-mcp v0.1.1 の `src/abbreviations/` をベースに、Architecture E（複数独立 MCP + meta-package + Skill）への転換に伴い独立パッケージ化。

[Unreleased]: https://github.com/shuji-bonji/houki-abbreviations/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/shuji-bonji/houki-abbreviations/releases/tag/v0.5.0
[0.4.1]: https://github.com/shuji-bonji/houki-abbreviations/releases/tag/v0.4.1
[0.4.0]: https://github.com/shuji-bonji/houki-abbreviations/releases/tag/v0.4.0
[0.3.0]: https://github.com/shuji-bonji/houki-abbreviations/releases/tag/v0.3.0
[0.2.0]: https://github.com/shuji-bonji/houki-abbreviations/releases/tag/v0.2.0
[0.1.0]: https://github.com/shuji-bonji/houki-abbreviations/releases/tag/v0.1.0
