# AIR-DML仕様書
## AI-Ready Data Modeling Language Specification

**バージョン**: 1.0
**最終更新**: 2025-01-02
**対象**: AI、開発者、データアーキテクト
**提供**: データミネーションパートナーズ

---

## 1. 概要

AIR-DML（AI-Ready Data Modeling Language / エアー・ディーエムエル）は、標準的なDBML（Database Markup Language）を拡張した、**AI時代のデータモデリング言語**です。

### 1.1 AIR-DMLとは

AIR-DMLは、データベーススキーマに**ビジネスコンテキスト**と**AI解釈可能な構造**を埋め込むことで、以下を実現します：

- **AIと人間の双方が理解しやすい**: 論理名、領域、説明文による文脈の明示化
- **視覚的な設計**: 座標・色・レイアウト情報の統合
- **ドメイン駆動設計のサポート**: Area（境界付きコンテキスト）による論理的分割
- **多言語対応**: aliasによる多言語論理名のサポート
- **AI推論の最適化**: 大規模言語モデルによる解釈・生成・変換を最大化

### 1.2 主要な拡張機能

| 機能 | 説明 | 用途 |
|------|------|------|
| **alias（論理名）** | テーブル・カラムの論理名（日本語など） | ビジネス用語の明示 |
| **Area（領域）** | テーブルのグルーピングと境界付きコンテキスト | ドメイン分割 |
| **CommonColumns** | Area内の共通カラム定義 | 設計パターンの共有 |
| **視覚情報** | 座標、色、サイズ | UIレンダリング |
| **database_type** | 領域ごとのDB種別 | ポリグロット永続化 |

本仕様書は、AI言語モデルがAIR-DMLを正確に理解・生成できるように記述されています。

---

## 2. 基本構文

### 2.1 プロジェクト宣言

```dbml
// プロジェクト名
Project "プロジェクト名" {
  database_type: 'PostgreSQL'
  Note: "プロジェクトの説明"
}
```

**パラメータ**:
- `database_type`: `PostgreSQL` | `MySQL` | `SQLite` | `SQL Server` | `Oracle` | `BigQuery` | `Redshift`
- `Note`: プロジェクトの説明（オプション）

---

### 2.2 テーブル定義

#### 基本形式

```dbml
Table table_name [alias: "テーブル論理名", pos_x: 100, pos_y: 200, color: "#1976D2"] {
  column_name data_type [constraints]

  Note: "テーブルの説明"
}
```

#### テーブル属性

| 属性 | 型 | 必須 | 説明 | 例 |
|------|-----|------|------|-----|
| `alias` | string | ❌ | テーブルの論理名（日本語など） | `"ユーザー"` |
| `pos_x` | number | ❌ | キャンバス上のX座標 | `100` |
| `pos_y` | number | ❌ | キャンバス上のY座標 | `200` |
| `color` | string | ❌ | テーブルヘッダーの色（HEX） | `"#1976D2"` |

#### 例

```dbml
Table users [alias: "ユーザー", pos_x: 100, pos_y: 100, color: "#1A365D"] {
  id serial [pk, alias: "ユーザーID"]
  username varchar(100) [not null, unique, alias: "ユーザー名"]
  email varchar(255) [not null, unique, alias: "メールアドレス"]
  created_at timestamp [not null, alias: "作成日時"]

  Note: "ユーザーアカウント情報を管理するテーブル"
}
```

---

### 2.3 カラム定義

#### 基本形式

```dbml
column_name data_type [constraint1, constraint2, ...]
```

#### カラム制約

| 制約 | 説明 | 例 |
|------|------|-----|
| `pk` | Primary Key（主キー） | `id serial [pk]` |
| `fk` | Foreign Key（外部キー、自動検出） | `user_id integer [fk]` |
| `unique` | 一意制約 | `email varchar(255) [unique]` |
| `not null` | NULL不可 | `username varchar(100) [not null]` |
| `alias: "論理名"` | **Mode-ai拡張**: カラムの論理名 | `[alias: "ユーザーID"]` |
| `note: "説明"` | カラムの説明 | `[note: "メールアドレス（重複不可）"]` |

**注**: `increment`と`default: value`はDBMLパーサーでは解釈されますが、Mode-aiのフロントエンドUIでは未実装です。

#### データ型

データ型は、**プロジェクトの`database_type`**または**Areaの`database_type`**の指定に依存して、対象データベースに実在する型に自動切り替わります。

**PostgreSQL**:
- 整数: `integer`, `bigint`, `smallint`, `serial`, `bigserial`
- 文字列: `varchar`, `text`, `char`
- 真偽値: `boolean`
- 日付: `date`, `timestamp`, `timestamptz`, `time`
- JSON: `json`, `jsonb`
- その他: `uuid`, `decimal`, `numeric`, `real`, `double precision`, `bytea`

**MySQL**:
- 整数: `int`, `bigint`, `smallint`, `tinyint`, `mediumint`
- 文字列: `varchar`, `text`, `char`
- 真偽値: `boolean`
- 日付: `date`, `datetime`, `timestamp`, `time`
- JSON: `json`
- その他: `decimal`, `numeric`, `float`, `double`, `blob`

**Oracle**:
- 整数: `number`
- 文字列: `varchar2`, `char`, `nvarchar2`, `nchar`, `clob`, `nclob`
- 日付: `date`, `timestamp`
- その他: `blob`, `raw`

**SQL Server**:
- 整数: `int`, `bigint`, `smallint`, `tinyint`
- 文字列: `varchar`, `nvarchar`, `text`, `ntext`, `char`, `nchar`
- 真偽値: `bit`
- 日付: `date`, `datetime`, `datetime2`, `smalldatetime`, `time`
- その他: `decimal`, `numeric`, `float`, `real`, `binary`, `varbinary`

**SQLite**:
- 整数: `integer`
- 文字列: `text`
- 真偽値: `integer`（0/1）
- 日付: `text`, `integer`, `real`
- その他: `blob`, `real`

**BigQuery**:
- 整数: `int64`
- 文字列: `string`
- 真偽値: `bool`
- 日付: `date`, `datetime`, `timestamp`, `time`
- JSON: `json`
- その他: `numeric`, `bignumeric`, `float64`, `bytes`, `array`, `struct`

#### 例

```dbml
Table posts {
  id serial [pk, alias: "投稿ID"]
  user_id integer [fk, not null, alias: "ユーザーID"]
  title varchar(255) [not null, alias: "タイトル"]
  content text [not null, alias: "本文"]
  published boolean [not null, default: false, alias: "公開フラグ"]
  created_at timestamp [not null, alias: "作成日時"]
  updated_at timestamp [not null, alias: "更新日時"]
}
```

---

### 2.4 リレーション（参照）

#### 基本形式

```dbml
Ref: from_table.from_column relationship_type to_table.to_column [attributes]
```

#### リレーションシップ種別

| 記号 | 意味 | 型名 |
|------|------|------|
| `-` | 1対1（One-to-One） | `one-to-one` |
| `>` | 多対1（Many-to-One） | `many-to-one` |
| `<` | 1対多（One-to-Many） | `one-to-many` |
| `<>` または `><` | 多対多（Many-to-Many） | `many-to-many` |
| `~` | 不確定（AI推論用） | `any` |

#### リレーション属性

| 属性 | 型 | 説明 | 例 |
|------|-----|------|-----|
| `swap_edge` | boolean | **Mode-ai拡張**: エッジの描画方向を反転 | `[swap_edge: true]` |

#### 例

```dbml
Ref: profiles.user_id - users.id
Ref: posts.user_id > users.id
Ref: comments.post_id > posts.id
Ref: comments.user_id > users.id
```

---

### 2.5 Area（領域）定義

**Mode-ai独自機能**: テーブルをグルーピングし、論理的な領域を定義します。

#### 基本形式

```dbml
Area "領域名" [attributes] {
  table1
  table2
  ...

  CommonColumns: [
    column_name data_type [constraints]
    ...
  ]
}
```

#### Area属性

| 属性 | 型 | 必須 | 説明 | 例 |
|------|-----|------|------|-----|
| `pos_x` | number | ❌ | 領域のX座標 | `50` |
| `pos_y` | number | ❌ | 領域のY座標 | `50` |
| `width` | number | ❌ | 領域の幅 | `600` |
| `height` | number | ❌ | 領域の高さ | `300` |
| `color` | string | ❌ | 領域の色（HEX） | `"#1976D2"` |
| `database_type` | string | ❌ | 領域のDB種別 | `"PostgreSQL"` |
| `note` | string | ❌ | 領域の説明 | `"ユーザー管理領域"` |

#### CommonColumns（共通カラム）

Area内のすべてのテーブルに共通するカラム（created_at, updated_atなど）を定義します。
実際のテーブル定義には含まれず、論理的な共通仕様として記述されます。

#### 例

```dbml
Area "ユーザー管理" [
  pos_x: 50,
  pos_y: 50,
  width: 600,
  height: 300,
  color: "#1976D2",
  database_type: "PostgreSQL",
  note: "ユーザーアカウントとプロフィール情報を管理する領域"
] {
  users
  profiles

  CommonColumns: [
    created_at timestamp [not null, alias: "作成日時"]
    updated_at timestamp [not null, alias: "更新日時"]
  ]
}

Area "コンテンツ管理" [
  pos_x: 50,
  pos_y: 400,
  width: 600,
  height: 350,
  color: "#9333EA",
  database_type: "PostgreSQL",
  note: "投稿やコメントなどのコンテンツを管理する領域"
] {
  posts
  comments

  CommonColumns: [
    created_at timestamp [not null, alias: "作成日時"]
    updated_at timestamp [not null, alias: "更新日時"]
  ]
}
```

---

## 3. 完全な例

```dbml
// サンプルER図
Project "Mode-ai Sample Project" {
  database_type: 'PostgreSQL'
  Note: "Generated by Mode-ai v2.0"
}

Table users [alias: "ユーザー", pos_x: 100, pos_y: 100, color: "#1A365D"] {
  id serial [pk, alias: "ユーザーID"]
  username varchar(100) [not null, unique, alias: "ユーザー名"]
  email varchar(255) [not null, unique, alias: "メールアドレス"]
  created_at timestamp [not null, alias: "作成日時"]

  Note: "ユーザーアカウント情報"
}

Table profiles [alias: "プロフィール", pos_x: 500, pos_y: 100, color: "#1A365D"] {
  id serial [pk, alias: "プロフィールID"]
  user_id integer [fk, not null, unique, alias: "ユーザーID"]
  full_name varchar(200) [alias: "氏名"]
  bio text [alias: "自己紹介"]
  avatar_url varchar(500) [alias: "アバターURL"]
}

Table posts [alias: "投稿", pos_x: 100, pos_y: 450, color: "#9333EA"] {
  id serial [pk, alias: "投稿ID"]
  user_id integer [fk, not null, alias: "ユーザーID"]
  title varchar(255) [not null, alias: "タイトル"]
  content text [not null, alias: "内容"]
  published boolean [not null, default: false, alias: "公開フラグ"]
  created_at timestamp [not null, alias: "作成日時"]
  updated_at timestamp [not null, alias: "更新日時"]
}

Table comments [alias: "コメント", pos_x: 500, pos_y: 450, color: "#9333EA"] {
  id serial [pk, alias: "コメントID"]
  post_id integer [fk, not null, alias: "投稿ID"]
  user_id integer [fk, not null, alias: "ユーザーID"]
  content text [not null, alias: "コメント内容"]
  created_at timestamp [not null, alias: "作成日時"]
}

Ref: profiles.user_id - users.id
Ref: posts.user_id > users.id
Ref: comments.post_id > posts.id
Ref: comments.user_id > users.id

Area "ユーザー管理" [
  pos_x: 50,
  pos_y: 50,
  width: 600,
  height: 300,
  color: "#1976D2",
  database_type: "PostgreSQL",
  note: "ユーザーアカウントとプロフィール情報を管理する領域"
] {
  users
  profiles

  CommonColumns: [
    created_at timestamp [not null, alias: "作成日時"]
    updated_at timestamp [not null, alias: "更新日時"]
  ]
}

Area "コンテンツ管理" [
  pos_x: 50,
  pos_y: 400,
  width: 600,
  height: 350,
  color: "#9333EA",
  database_type: "PostgreSQL",
  note: "投稿やコメントなどのコンテンツを管理する領域"
] {
  posts
  comments

  CommonColumns: [
    created_at timestamp [not null, alias: "作成日時"]
    updated_at timestamp [not null, alias: "更新日時"]
  ]
}
```

---

## 4. AIR-DML拡張機能まとめ

### 4.1 拡張属性一覧

#### テーブルレベル
- `alias`: テーブルの論理名（日本語など）
- `pos_x`, `pos_y`: キャンバス上の座標
- `color`: テーブルヘッダーの色

#### カラムレベル
- `alias`: カラムの論理名（日本語など）

#### リレーションレベル
- `swap_edge`: エッジの描画方向を反転

#### Areaレベル（完全独自）
- `pos_x`, `pos_y`: 領域の座標
- `width`, `height`: 領域のサイズ
- `color`: 領域の枠線色
- `database_type`: 領域のDB種別
- `note`: 領域の説明
- `CommonColumns`: 領域内共通カラム定義

### 4.2 標準DBMLとの互換性

- **標準DBML部分**（Project, Table, Column, Ref）は完全互換
- **拡張属性**は標準DBMLパーサーで無視されるため、後方互換性を維持
- **Area構文**はDBMLのTableGroup構文を拡張（`CommonColumns`、`database_type`などがAIR-DML独自）

---

## 5. AI生成時のガイドライン

AIがAIR-DMLを生成する際は、以下のルールに従ってください。

### 5.1 クイックリファレンス（AIプロンプト用）

以下はAIがAIR-DMLを生成する際の最小限の構文リファレンスです：

```dbml
// ========================================
// テーブル定義
// ========================================
Table テーブル名 [alias: "日本語名"] {
  カラム名 データ型 [制約, alias: "日本語名"]
}

// ========================================
// 制約一覧
// ========================================
[pk]                    // 主キー
[fk]                    // 外部キー（Refと併用）
[unique]                // 一意制約
[not null]              // NOT NULL
[increment]             // 自動採番（serialと併用不要）
[default: 値]           // デフォルト値
[alias: "日本語名"]     // 論理名
[note: "説明"]          // カラム説明

// ========================================
// データ型（PostgreSQL）
// ========================================
serial                  // 自動採番整数（PKに使用）
integer, bigint         // 整数
varchar(n), text        // 文字列
boolean                 // 真偽値
date, timestamp         // 日時
json, jsonb             // JSON
uuid                    // UUID

// ========================================
// リレーション定義
// ========================================
Ref: テーブルA.カラム > テーブルB.カラム   // 多対1（A→B）
Ref: テーブルA.カラム < テーブルB.カラム   // 1対多（A←B）
Ref: テーブルA.カラム - テーブルB.カラム   // 1対1

// 例: posts.user_id > users.id
//     ↑ 多くのpostsが1つのuserを参照

// ========================================
// Area定義（オプション）
// ========================================
Area "エリア名" [color: "#1976D2"] {
  テーブル1
  テーブル2
}
```

### 5.2 完全な出力例

```dbml
// 定期購入機能
Table subscriptions [alias: "定期購入"] {
  id serial [pk, alias: "定期購入ID"]
  user_id integer [fk, not null, alias: "ユーザーID"]
  product_id integer [fk, not null, alias: "商品ID"]
  delivery_frequency text [not null, alias: "配送頻度"]
  status text [not null, default: 'active', alias: "ステータス"]
  next_delivery_date date [not null, alias: "次回配送予定日"]
  start_date date [not null, alias: "開始日"]
  end_date date [alias: "終了日"]
  created_at timestamp [not null, alias: "作成日時"]
  updated_at timestamp [not null, alias: "更新日時"]
}

Table subscription_deliveries [alias: "定期購入配送履歴"] {
  id serial [pk, alias: "配送履歴ID"]
  subscription_id integer [fk, not null, alias: "定期購入ID"]
  scheduled_date date [not null, alias: "配送予定日"]
  actual_date date [alias: "実際の配送日"]
  status text [not null, default: 'pending', alias: "配送ステータス"]
  created_at timestamp [not null, alias: "作成日時"]
  updated_at timestamp [not null, alias: "更新日時"]
}

Ref: subscriptions.user_id > users.id
Ref: subscriptions.product_id > products.id
Ref: subscription_deliveries.subscription_id > subscriptions.id
```

### 5.3 重要な注意事項

**必ず守ること：**
- alias の値は**ダブルクォート**で囲む: `alias: "論理名"` ✅
- シングルクォートは使用しない: `alias: '論理名'` ❌
- 外部キーカラムには `[fk]` を付ける
- リレーションは `Ref:` で別途定義する
- カラム定義行にインラインコメント（`//`）を入れない

**座標・色（オプション）：**
- テーブル: `[alias: "名前", pos_x: 100, pos_y: 200, color: "#1976D2"]`
- Area: `[pos_x: 50, pos_y: 50, width: 600, height: 300, color: "#1976D2"]`

### 5.4 必須要素
1. 各テーブルに`alias`（論理名）を設定
2. 主キーには`[pk]`、外部キーには`[fk]`を明示
3. リレーションは`Ref`構文で明示的に定義

### 5.5 推奨要素
1. カラムに`alias`（論理名）を設定
2. テーブルに`pos_x`, `pos_y`を設定（自動レイアウトされない場合）
3. 論理的なグループがある場合は`Area`を定義
4. 共通カラム（created_at, updated_atなど）は`CommonColumns`で定義

---

## 6. AIR-DML vs DBML

### 6.1 違い

| 項目 | DBML | AIR-DML |
|------|------|-------|
| **フォーカス** | データベーススキーマ | AI対応 + ビジネスコンテキスト |
| **論理名** | ❌ なし | ✅ alias属性 |
| **領域管理** | TableGroup（基本） | Area（拡張: CommonColumns, database_type） |
| **視覚情報** | ❌ なし | ✅ 座標・色・サイズ |
| **多DB対応** | プロジェクト単位 | 領域（Area）単位 |
| **AI最適化** | ❌ なし | ✅ LLM解釈・生成を想定した設計 |

### 6.2 互換性

- **下位互換**: AIR-DMLはDBMLの完全上位互換
- **標準DBMLパーサー**: 拡張属性を無視して処理可能
- **Mode-ai専用パーサー**: AIR-DMLの全機能をサポート

---

## 7. バージョン履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| 1.0 | 2025-01-02 | AIR-DML規格として正式リリース（AI-Ready Data Modeling Language） |

---

## 8. 商標・ライセンス

### 8.1 商標について

**AIR-DML™** (AI-Ready Data Modeling Language) は、株式会社データミネーションパートナーズの商標です（商標出願中：商願2026-000274）。

*AIR-DML™ — The Open Standard for AI-Ready Data Modeling.*

本規格は、**AI（大規模言語モデル）によるデータの解釈・生成・変換を最大化する**ために設計された、次世代のデータモデリング言語です。

### 8.2 仕様の利用ライセンス

本仕様書は **MITライセンス** の下で公開されています。

- **自由な実装**: AIR-DMLに準拠したパーサー、エディタ、AIプロンプトの商用利用・公開は自由です。
- **AIモデルへの学習**: 各AIベンダーによる、モデルの微調整（Fine-tuning）やインコンテキスト学習への本仕様の利用を全面的に許可します。
- **帰属表示**: 本仕様を利用する場合、「AIR-DML™ by データミネーションパートナーズ」の表記を推奨します（任意）。

### 8.3 エコシステムの保護

「AIR-DML」の名称を冠するツールや拡張機能を作成する場合は、ユーザーの混乱を避けるため、本仕様との互換性を維持することを推奨します。

### 8.4 Mode-ai実装について

- **Mode-ai**: AIR-DML規格の公式参照実装
- **ライセンス**: Proprietary（データミネーションパートナーズ）
- **役割**: AIR-DMLの実証・普及を目的とした先進的なビジュアルERDツール

---

**策定**: データミネーションパートナーズ
**技術協力**: Claude Sonnet 4.5 (Anthropic)
**公開日**: 2025-01-02
**ライセンス**: MIT License (本仕様書)
