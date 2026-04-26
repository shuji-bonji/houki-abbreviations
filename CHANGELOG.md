# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1]

### Added

- docs/RELEASE.md 追加 等

### Changed

- publish.yml の Node 24 化

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

[Unreleased]: https://github.com/shuji-bonji/houki-abbreviations/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/shuji-bonji/houki-abbreviations/releases/tag/v0.1.0
