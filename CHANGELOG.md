# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-11

### Removed
- **`default` カラム属性を削除**
  - `default: '値'` 構文をパーサーから完全に削除
  - 理由: シングルクォートとダブルクォートの混在による一貫性の問題
  - `alias` と `note` はダブルクォート使用、`default` はシングルクォート使用という不整合があった
  - デフォルト値の指定は実用上の必要性が低いと判断

### Changed
- トークナイザー: `default` キーワードを削除
- パーサー: `default` パース処理を削除
- AST: `ColumnNode.default` プロパティを削除
- 型定義: `Column.default` プロパティを削除
- トランスフォーマー: `default` 出力処理を削除

---

## [2.0.0] - 2025-01-10

### Added
- **Area（エリア）構文**
  ```
  Area "エリア名" {
    color: "#FF5733"
    note: "エリアの説明"
    database: "PostgreSQL"

    CommonColumns {
      created_at timestamp [not null]
      updated_at timestamp
    }

    Table table1
    Table table2
  }
  ```

- **CommonColumns（共通カラム）構文**
  - Area 内でテーブル間の共通カラムを定義可能
  - エリア内の全テーブルに自動適用

- **リレーション推論機能**
  - `_id` サフィックスを持つカラムから自動的にリレーションを推論
  - 例: `customer_id` → `customers.id` へのリレーション

### Changed
- DBML との互換性を維持しながら AIR-DML 独自拡張を追加
- パーサーアーキテクチャを拡張構文対応に刷新

---

## [1.0.0] - 2025-01-05

### Added
- 初回リリース
- DBML 互換パーサー
- 基本構文サポート:
  - `Project` 定義
  - `Table` 定義
  - カラム属性: `pk`, `fk`, `unique`, `not null`, `increment`
  - `alias` と `note` 属性
  - `Ref` リレーション定義
- TypeScript 型定義
- ゼロ依存（Zero Dependencies）
- ESM / CommonJS 両対応
