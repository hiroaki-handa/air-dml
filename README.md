# AIR-DML

**AI-Ready Data Modeling Language**

*The Open Standard for AI-Ready Data Modeling*

AIR-DML is a data modeling language designed for AI-driven development. It provides a structured, human- and machine-readable syntax for database schemas enriched with business context.

[![npm version](https://badge.fury.io/js/air-dml.svg)](https://www.npmjs.com/package/air-dml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Used In Production

<a href="https://mode-ai.io">
  <img src="https://mode-ai.io/favicon.svg" alt="Mode-ai" width="48" height="48" align="left" style="margin-right: 12px;" />
</a>

**[Mode-ai](https://mode-ai.io)** - AI-Powered Data Modeling Tool

Generate ER diagrams from natural language using AI. Mode-ai is the reference implementation of AIR-DML, showcasing the full potential of AI-ready data modeling.

- Natural language to ER diagram generation
- Interactive visual editor with drag & drop
- Export to SQL, AIR-DML, and more

<br clear="left"/>

## Features

✨ **AI-Optimized**: Designed for AI language models to understand and generate database schemas
🏗️ **Domain-Driven Design**: Built-in support for bounded contexts via `Area`
🌍 **Multilingual**: Logical names (aliases) in any language
🎨 **Visual Design**: Coordinate and color information for diagram rendering
🔄 **Polyglot Persistence**: Different database types per area
📦 **Zero Dependencies**: Independent parser with no external dependencies
💬 **Comment Preservation**: Leading comments are preserved and associated with elements

## Installation

```bash
npm install air-dml
```

## Quick Start

```typescript
import { parseAirDML, exportToAirDML } from 'air-dml';

// Parse AIR-DML text
const airDmlText = `
Project "My Project" {
  database_type: "PostgreSQL"
}

// ユーザー管理
Table users [alias: "ユーザー", pos_x: 100, pos_y: 100, color: "#1976D2"] {
  id serial [pk, alias: "ユーザーID"]
  username varchar(100) [not null, unique, alias: "ユーザー名"]
  email varchar(255) [not null, unique, alias: "メールアドレス"]
  created_at timestamp [not null, alias: "作成日時"]
}

// プロフィール情報
Table profiles [alias: "プロフィール", pos_x: 500, pos_y: 100] {
  id serial [pk, alias: "プロフィールID"]
  user_id integer [fk, not null, unique, alias: "ユーザーID"]
  full_name varchar(200) [alias: "氏名"]
  bio text [alias: "自己紹介"]
}

Ref: profiles.user_id - users.id

Area "User Management" [
  pos_x: 50,
  pos_y: 50,
  width: 600,
  height: 300,
  color: "#1976D2"
] {
  users
  profiles

  database_type: "PostgreSQL"

  CommonColumns: [
    created_at timestamp [not null, alias: "作成日時"]
    updated_at timestamp [not null, alias: "更新日時"]
  ]

  Note: "ユーザー管理領域"
}
`;

const diagram = parseAirDML(airDmlText);
console.log(diagram);

// Export back to AIR-DML
const output = exportToAirDML(diagram);
console.log(output);
```

## AIR-DML Syntax

### Table Definition

```airdml
Table table_name [alias: "論理名", pos_x: 100, pos_y: 200, color: "#1976D2"] {
  column_name data_type [constraints, alias: "カラム論理名"]

  Note: "テーブルの説明"
}
```

### Column Constraints

| Constraint | Description | Example |
|------------|-------------|---------|
| `pk` | Primary Key | `id serial [pk]` |
| `fk` | Foreign Key (use with Ref) | `user_id integer [fk]` |
| `unique` | Unique constraint | `email varchar [unique]` |
| `not null` | NOT NULL constraint | `name varchar [not null]` |
| `increment` | Auto increment | `id integer [pk, increment]` |
| `hidden` | Hide column in canvas | `MANDT varchar [hidden]` |
| `alias: "name"` | Logical name | `[alias: "ユーザーID"]` |
| `note: "desc"` | Column description | `[note: "説明"]` |
| `values: "k=v/..."` | Enum / classification values | `[values: "1=有効/2=無効"]` |
| `default: "val"` | Default value | `[default: "active"]` |

#### `values:` — Enum / Classification Values

Define allowed values for a column (status codes, flags, etc.):

```airdml
status varchar(1) [
  not null,
  alias: "ステータス",
  values: "1=有効/2=無効/3=削除済",
  default: "1"
]
```

Format: `"key=label/key2=label2/..."` — key and label separated by `=`, entries separated by `/`.

### Relationships

```airdml
Ref: table_a.column > table_b.column   // Many-to-One (A → B)
Ref: table_a.column < table_b.column   // One-to-Many (A ← B)
Ref: table_a.column - table_b.column   // One-to-One
Ref: table_a.column >< table_b.column  // Many-to-Many
Ref: table_a.column ~ table_b.column   // AI-inferred (undetermined)
```

### Area (Bounded Context)

```airdml
Area "Area Name" [
  pos_x: 50,
  pos_y: 50,
  width: 600,
  height: 300,
  color: "#1976D2"
] {
  table1
  table2

  database_type: "PostgreSQL"

  CommonColumns: [
    created_at timestamp [not null, alias: "作成日時"]
    updated_at timestamp [not null, alias: "更新日時"]
  ]

  Note: "Area description"
}
```

## AI Generation Guidelines

When using AI to generate AIR-DML, follow these rules:

**Required:**
- Use **double quotes** for alias values: `alias: "論理名"` ✅
- Do NOT use single quotes: `alias: '論理名'` ❌
- Mark foreign key columns with `[fk]`
- Define relationships separately with `Ref:`
- Do NOT add inline comments after column definitions

**Example Output:**

```airdml
// 定期購入機能
Table subscriptions [alias: "定期購入"] {
  id serial [pk, alias: "定期購入ID"]
  user_id integer [fk, not null, alias: "ユーザーID"]
  product_id integer [fk, not null, alias: "商品ID"]
  status varchar(1) [not null, alias: "ステータス", values: "1=有効/2=停止/3=解約", default: "1"]
  created_at timestamp [not null, alias: "作成日時"]
}

Ref: subscriptions.user_id > users.id
Ref: subscriptions.product_id > products.id
```

**Use `values:` for any column with a fixed set of allowed values** (status, type, flag, etc.).
Format: `"key=label/key2=label2/..."` with `/` separator.

For complete AI generation guidelines, see [SPECIFICATION.md Section 5](./SPECIFICATION.md#5-ai生成時のガイドライン).

## API Reference

### `parseAirDML(airDmlText: string, diagramId?: string): Diagram`

Parse AIR-DML text into a Diagram object.

**Parameters:**
- `airDmlText` - AIR-DML formatted text
- `diagramId` - Optional diagram ID

**Returns:** `Diagram` object

### `exportToAirDML(diagram: Diagram): string`

Export a Diagram object to AIR-DML text.

**Parameters:**
- `diagram` - Diagram object

**Returns:** AIR-DML formatted text

### `getDataTypesForDatabase(database: string): string[]`

Get the list of supported data types for a specific database.

**Parameters:**
- `database` - Database name: `"PostgreSQL"` | `"MySQL"` | `"SQLite"` | `"SQL Server"` | `"Oracle"` | `"BigQuery"` | `"Redshift"` | `"Snowflake"`

**Returns:** Array of data type strings

```typescript
import { getDataTypesForDatabase } from 'air-dml';

const types = getDataTypesForDatabase('PostgreSQL');
// ["integer", "bigint", "varchar", "text", "boolean", "timestamp", ...]
```

## Type Definitions

```typescript
interface Diagram {
  id: string;
  name: string;
  project?: string;
  database?: string;
  tables: Table[];
  references: Reference[];
  areas?: Area[];
  createdAt?: string;
  updatedAt?: string;
  note?: string;
}

interface Table {
  id: string;
  name: string;
  logicalName?: string;      // alias
  columns: Column[];
  color?: string;
  pos?: Position;
  areaIds?: string[];
  note?: string;
  leadingComments?: string[];  // v1.2.0+
}

interface Column {
  name: string;
  logicalName?: string;      // alias
  type: DataType;
  typeParams?: string;
  pk?: boolean;
  fk?: boolean;
  unique?: boolean;
  notNull?: boolean;
  increment?: boolean;
  hidden?: boolean;          // v2.1.8+
  note?: string;
  values?: string;           // v2.1.9+ — "key=label/key2=label2/..."
  defaultValue?: string;     // v2.1.9+
  leadingComments?: string[];  // v1.2.0+
}

interface Reference {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: RelationshipType;
  swapEdge?: boolean;
  leadingComments?: string[];  // v1.2.0+
}

interface Area {
  id: string;
  name: string;
  tables: string[];
  color?: string;
  pos?: Position;
  width?: number;
  height?: number;
  labelHorizontal?: 'left' | 'center' | 'right';
  labelVertical?: 'top' | 'center' | 'bottom';
  databaseType?: string;
  commonColumns?: Column[];
  note?: string;
  leadingComments?: string[];  // v1.2.0+
}
```

## Key Features At a Glance

| Feature | Description |
|---------|-------------|
| **Logical names** | `alias` attribute for human-readable names in any language |
| **Classification values** | `values` attribute for enums and status codes |
| **Area management** | Bounded context grouping with CommonColumns and per-area database type |
| **Visual layout** | Coordinates, colors, and sizes for diagram rendering |
| **Multi-DB** | Area-level database type (polyglot persistence) |
| **AI-optimized** | LLM-friendly syntax designed for generation and interpretation |
| **Zero dependencies** | Independent recursive descent parser |

## Changelog

### v2.1.9 (2026-04)
- Added `values: "key=label/..."` column attribute for enum/classification values
- Added `default: "value"` column attribute (redesigned with double-quote consistency)
- SAP R/3 namespace support: `/NAMESPACE/FIELDNAME` identifiers in lexer

### v2.1.8 (2026-04)
- Added `hidden` column attribute to hide columns from canvas display

### v2.1.7 (2026-04)
- Fixed: attribute keywords (`alias`, `note`, etc.) now usable as column names

### v2.1.6 (2026-03)
- Fixed: top-level keywords (`project`, `table`, `ref`, `area`) now usable as column names

### v2.1.5 (2026-03)
- Fixed: multi-word type names (e.g. `timestamp with time zone`) correctly quoted in export

### v2.1.4 (2026-03)
- Added SQL standard type names to PostgreSQL (character varying, time with time zone, etc.)

### v2.1.3 (2026-03)
- Expanded data type lists for all 8 databases (PostgreSQL, MySQL, Oracle, SQL Server, SQLite, BigQuery, Redshift, Snowflake)

### v2.1.2 (2026-03)
- Added Snowflake database type support

### v2.1.0 (2025-01)
- **Breaking**: Removed `default` column constraint (re-added in v2.1.9 with double-quote consistency)

### v2.0.0 (2025-01)
- **Major**: Replaced `@dbml/core` dependency with custom hand-written recursive descent parser
- Full AIR-DML syntax support without external dependencies
- Improved error messages in Japanese

### v1.2.0 (2025-01)
- Added leading comment preservation for Tables, References, and Areas
- Added `leadingComments` field to type definitions

### v1.0.0 (2025-01)
- Initial release
- Core AIR-DML parsing and export
- Support for alias, pos_x, pos_y, color attributes
- Area with CommonColumns and database_type

## Specification

For the complete AIR-DML specification, see [SPECIFICATION.md](./SPECIFICATION.md).

## License

Apache-2.0 License - see [LICENSE](./LICENSE) file for details.

## Credits

- **Created by**: Data-mination Partners
- **Technical collaboration**: Claude Sonnet 4.6 (Anthropic)

## Links

- [GitHub Repository](https://github.com/hiroaki-handa/air-dml)
- [npm Package](https://www.npmjs.com/package/air-dml)
- [AIR-DML Specification](./SPECIFICATION.md)
- [Mode-ai](https://mode-ai.io) - Reference implementation (AI-Powered Data Modeling Tool)

---

## Trademarks

**AIR-DML™** (AI-Ready Data Modeling Language) is a trademark of Datamination Partners Co., Ltd.
Trademark Application No. 2026-000274 (Japan)

*AIR-DML™ — The Open Standard for AI-Ready Data Modeling.*
