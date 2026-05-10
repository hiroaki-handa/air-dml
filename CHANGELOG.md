# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.9] - 2026-04-25

### Added
- **SAP R/3 名前空間サポート**: レキサーが `/NAMESPACE/FIELDNAME` 形式の識別子を許容
- **`values:` カラム属性**: 区分値（列挙型の選択肢）を定義する正式構文
  ```
  status varchar(1) [values: "1=有効/2=無効/3=削除済"]
  kfrst varchar(1) [alias: "承認ステータス", values: "1=承認済/2=ブロック"]
  ```
  - `key=ラベル` 形式、`/` 区切り
  - `exportToAirDML` でラウンドトリップ保証
- **`default:` カラム属性（再設計）**: デフォルト値をダブルクォートで統一して復活
  ```
  status varchar [default: "active"]
  ```
  - v2.1.0 で削除したシングルクォート版に代わり、ダブルクォート統一で再実装

### Changed
- `Column` インターフェースに `values?: string` と `defaultValue?: string` を追加

---

## [2.1.8] - 2026-04-02

### Added
- **`hidden` カラム属性**: カラムをキャンバス非表示にするフラグ
  ```
  MANDT varchar(3) [pk, hidden, alias: "クライアント"]
  ```
  - `exportToAirDML` で `[hidden]` として出力
  - `Column` インターフェースに `hidden?: boolean` を追加

---

## [2.1.7] - 2026-04-02

### Fixed
- 属性キーワード（`alias`, `note`, `pos_x` 等）をカラム名として使用可能に修正
  - 既存スキーマでの属性名と同名カラムとの互換性向上

---

## [2.1.6] - 2026-03-30

### Fixed
- トップレベル予約語（`project`, `table`, `ref`, `area`）をテーブル内のカラム名として使用可能に修正

---

## [2.1.5] - 2026-03-30

### Fixed
- スペースを含む型名（`timestamp with time zone`, `character varying` 等）を
  `exportToAirDML` 出力時にクォートして正しく再パース可能に修正

---

## [2.1.4] - 2026-03-29

### Added
- PostgreSQL に SQL 標準型名を追加:
  `character varying`, `character`, `time with time zone`,
  `time without time zone`, `timestamp without time zone`, `macaddr8`
  - `information_schema` が返す型名をそのまま利用可能に

---

## [2.1.3] - 2026-03-28

### Added
- 全 8 データベースの型リストを大幅拡充:
  - PostgreSQL: +14 型（interval, money, inet, cidr, tsvector, xml 等）
  - MySQL: +5 型（binary, varbinary, bit, integer, year）
  - Oracle: +4 型（binary_float, binary_double, integer, varchar）
  - SQL Server: +3 型（json, rowversion, vector）
  - SQLite: +7 型（boolean, date, datetime, decimal, double, float, varchar）
  - BigQuery: +1 型（range）
  - Redshift: +5 型（geography, hllsketch, super, timetz, varbyte）
  - Snowflake: +2 型（map, vector）

---

## [2.1.2] - 2026-03-27

### Added
- **Snowflake** データベース型のサポートを追加
  - `getDataTypesForDatabase('Snowflake')` が利用可能に

---

## [2.1.1] - 2026-01-28

### Fixed
- `exportToAirDML` 出力先頭の冗長なコメント行を削除

---

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
