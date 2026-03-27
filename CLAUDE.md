# CLAUDE.md — air-dml

## 概要

AIR-DML パーサー/エクスポーターの TypeScript パッケージ。Mode-ai/web-v3 が npm 経由で依存している。

- **npm**: https://www.npmjs.com/package/air-dml
- **GitHub**: https://github.com/hiroaki-handa/air-dml

## ディレクトリ構成

```
air-dml/
├── src/
│   ├── parser/new/   # パーサー実装（lexer, parser, transformer）
│   ├── types/        # 型定義
│   └── index.ts      # エントリポイント（parseAirDML, exportToAirDML をエクスポート）
├── dist/             # tsc ビルド成果物（git 管理外）
└── .github/workflows/publish.yml  # GitHub Actions による npm 自動公開
```

## npm publish 手順（必読）

### ⚠️ 直接 `npm publish` は使わない

npm アカウントに 2FA が設定されており、直接 publish すると **EOTP エラー**で詰まる。
必ず **GitHub Actions 経由** で publish する。

### 正しい手順

1. ソースを修正
2. `package.json` の `version` をインクリメント（例: `2.1.1` → `2.1.2`）
3. ビルドして型チェック

   ```bash
   npm run build
   ```

4. git commit & push

   ```bash
   git add -A
   git commit -m "feat: ..."
   git push origin main
   ```

5. **バージョンタグを打つ** → GitHub Actions が自動で npm publish する

   ```bash
   git tag v2.1.2
   git push origin v2.1.2
   ```

6. Actions の成功を確認: https://github.com/hiroaki-handa/air-dml/actions

7. Mode-ai/web-v3 で依存を更新

   ```bash
   cd ~/claude/Mode-ai/web-v3 && npm update air-dml
   ```

### GitHub Actions の仕組み

- `.github/workflows/publish.yml` がタグ `v*` の push をトリガーに起動
- GitHub Repository Secret `NPM_TOKEN`（Granular Access Token, bypass 2FA ☑）を使って publish
- **Repository secrets** に登録すること（Environment secrets では参照できない）

### トラブルシューティング

| エラー | 原因 | 対処 |
|---|---|---|
| `EOTP` | 直接 `npm publish` した | GitHub Actions 経由で publish する |
| `ENEEDAUTH / NODE_AUTH_TOKEN is empty` | `NPM_TOKEN` が Environment secrets に登録されている | Repository secrets に登録し直す |
| `E404 Not found` | OIDC Trusted Publisher の設定ミス | NPM_TOKEN シークレット方式を使う（`--provenance` 不要） |

## publish 後の依存プロジェクト更新

npm update で最新版を取り込む:
```bash
npm update air-dml
```
