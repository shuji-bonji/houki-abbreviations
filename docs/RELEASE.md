# Release Guide

このドキュメントは `@shuji-bonji/houki-abbreviations` のリリース手順を記録する。

## 認証方式: Trusted Publisher (OIDC)

`.github/workflows/publish.yml` は **Trusted Publisher** 経由で npm に publish する。`NPM_TOKEN` を Secrets で持たず、GitHub Actions の OIDC token で認証する仕組み。

**重要**: Trusted Publisher は **既存パッケージにのみ設定可能**。初回 publish は手動で行う必要がある（卵と鶏問題）。

---

## 初回 publish（v0.1.0 のみ）

### 手順

```sh
cd /path/to/houki-abbreviations

# 1. ログインしているか確認
npm whoami
# → shuji-bonji であることを確認。違うなら `npm login`

# 2. 念のためビルドが最新か確認
npm test
npm run build

# 3. 手動 publish（provenance なし、access public 必須 — scoped package のため）
npm publish --access public

# 4. publish 結果を確認
npm view @shuji-bonji/houki-abbreviations
```

### 初回 publish 後にすること

1. **npm.js で Trusted Publisher を設定**
   - https://www.npmjs.com/package/@shuji-bonji/houki-abbreviations/access
   - "Trusted Publishers" セクション → "Add" ボタン
   - Publisher: **GitHub Actions**
   - Repository: `shuji-bonji/houki-abbreviations`
   - Workflow filename: `publish.yml`
   - Environment: (空欄)

2. **以降は GitHub Actions 経由で publish**（v0.1.1 〜）

---

## 通常リリース（v0.1.1 以降）

Trusted Publisher 設定済みなら、tag push で自動 publish が走る。

```sh
# 1. 作業ブランチで実装・テスト
git checkout -b feature/xxx
# ... 実装 ...
npm test
npm run lint
npm run format:check
npm run build

# 2. CHANGELOG.md を更新
#    [Unreleased] → [0.1.x] - YYYY-MM-DD に移動
#    末尾のリンク参照も追加

# 3. PR 経由で main にマージ
gh pr create
# CI 通過を確認してマージ

# 4. main を最新化
git checkout main
git pull

# 5. npm version でバンプ（package.json + git tag を同時更新）
npm version patch -m "release: v%s"   # 0.1.0 → 0.1.1
# または:
# npm version minor -m "release: v%s"  # 0.1.0 → 0.2.0
# npm version major -m "release: v%s"  # 0.1.0 → 1.0.0

# 6. tag を push（publish.yml が発火）
git push origin main --tags

# 7. GitHub Actions の進捗を確認
gh run watch
```

---

## トラブルシュート

### `npm publish` が 404 で失敗する

**症状**:
```
404 Not Found - PUT https://registry.npmjs.org/@shuji-bonji%2fhouki-abbreviations
The requested resource '@shuji-bonji/houki-abbreviations@x.y.z' could not be found
or you do not have permission to access it.
```

**原因**: パッケージが npm.js にまだ存在しない（初回 publish 未実施）か、Trusted Publisher 設定が完了していない。

**対処**: 上記「初回 publish」セクションに従って手動 publish → Trusted Publisher 設定。

### `npm install -g npm@latest` が `Cannot find module 'promise-retry'` で失敗

**原因**: Node 22 hosted toolcache 同梱 npm 10 → npm 11 セルフアップデートでの依存ツリー破損。

**対処**: publish.yml は **Node 24** を使用しており、この問題は回避済み。test/build ジョブだけ Node 20/22 matrix を維持。

### `npx publish` を使ってしまう（誤用）

**症状**:
```
exec The following package was not found and will be installed: publish@0.6.0
You have not published yet your first version of this module: publish will do nothing
```

**原因**: `npx publish` は **別物の古いパッケージ**（npm registry 上の `publish@0.6.0`、2014年頃のもの）を起動する。`npm publish` とは無関係。

**対処**: 必ず `npm publish` を使う。`npx` は付けない。

### tag と package.json version が食い違う

publish.yml の `Verify version matches tag` ステップで弾かれる。`npm version` コマンドを使えば自動的に同期するので、手で `git tag vX.Y.Z` するのは避ける。

修復:
```sh
git push --delete origin vX.Y.Z
git tag -d vX.Y.Z
# package.json を正しい version に直してから
npm version X.Y.Z -m "release: v%s"
git push origin main --tags
```

---

## 参考

- [npm: Trusted publishers](https://docs.npmjs.com/trusted-publishers)
- [GitHub Actions: OIDC for npm](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [shuji-mcp-patterns/release-workflow.md](../../shuji-mcp-patterns/release-workflow.md) — NPM_TOKEN ベースの旧運用（参考）
