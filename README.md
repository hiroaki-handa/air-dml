# AIR-DML

**AI-Ready Data Modeling Language**

AIR-DML is an extended DBML (Database Markup Language) parser designed for AI-driven development. It adds powerful features for modern data modeling while maintaining full backward compatibility with standard DBML.

[![npm version](https://badge.fury.io/js/air-dml.svg)](https://www.npmjs.com/package/air-dml)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

✨ **AI-Optimized**: Designed for AI language models to understand and generate database schemas
🏗️ **Domain-Driven Design**: Built-in support for bounded contexts via `Area`
🌍 **Multilingual**: Logical names (aliases) in any language
🎨 **Visual Design**: Coordinate and color information for diagram rendering
🔄 **Polyglot Persistence**: Different database types per area
📦 **Extends DBML**: Fully compatible with standard DBML, powered by `@dbml/core`
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
  database_type: 'PostgreSQL'
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

```dbml
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
| `default: value` | Default value | `status text [default: 'active']` |
| `alias: "name"` | Logical name | `[alias: "ユーザーID"]` |
| `note: "desc"` | Column description | `[note: "説明"]` |

### Relationships

```dbml
Ref: table_a.column > table_b.column   // Many-to-One (A → B)
Ref: table_a.column < table_b.column   // One-to-Many (A ← B)
Ref: table_a.column - table_b.column   // One-to-One
Ref: table_a.column ~ table_b.column   // AI-inferred (undetermined)
```

### Area (Bounded Context)

```dbml
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

```dbml
// 定期購入機能
Table subscriptions [alias: "定期購入"] {
  id serial [pk, alias: "定期購入ID"]
  user_id integer [fk, not null, alias: "ユーザーID"]
  product_id integer [fk, not null, alias: "商品ID"]
  status text [not null, default: 'active', alias: "ステータス"]
  created_at timestamp [not null, alias: "作成日時"]
}

Ref: subscriptions.user_id > users.id
Ref: subscriptions.product_id > products.id
```

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
  pk: boolean;
  fk: boolean;
  unique: boolean;
  notNull: boolean;
  increment: boolean;
  default?: string;
  note?: string;
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

## Comparison: DBML vs AIR-DML

| Feature | DBML | AIR-DML |
|---------|------|---------|
| **Focus** | Database schema | AI-ready + Business context |
| **Logical names** | ❌ | ✅ `alias` attribute |
| **Area management** | TableGroup (basic) | Area (extended: CommonColumns, database_type) |
| **Visual info** | ❌ | ✅ Coordinates, colors, sizes |
| **Multi-DB** | Project-level | Area-level (polyglot persistence) |
| **AI optimization** | ❌ | ✅ LLM-friendly design |
| **Comment preservation** | ❌ | ✅ Leading comments (v1.2.0+) |

## Changelog

### v1.2.3 (2025-01)
- Bug fixes for Area parsing with Japanese names
- Improved comment preservation
- Added AI generation guidelines to specification

### v1.2.0 (2025-01)
- Added leading comment preservation for Tables, References, and Areas
- Added `leadingComments` field to type definitions
- Export comments back to AIR-DML format

### v1.1.0 (2025-01)
- Added `labelHorizontal` and `labelVertical` attributes for Areas
- Added `swapEdge` attribute for References
- Improved Area attribute parsing

### v1.0.0 (2025-01)
- Initial release
- Core AIR-DML parsing and export
- Support for alias, pos_x, pos_y, color attributes
- Area with CommonColumns and database_type

## Specification

For the complete AIR-DML specification, see [SPECIFICATION.md](./SPECIFICATION.md).

## License

Apache-2.0 License - see [LICENSE](./LICENSE) file for details.

AIR-DML extends [DBML](https://github.com/holistics/dbml) (also Apache-2.0).

## Credits

- **Created by**: Data-mination Partners
- **Technical collaboration**: Claude Opus 4.5 (Anthropic)
- **Based on**: [@dbml/core](https://www.npmjs.com/package/@dbml/core) by Holistics

## Links

- [GitHub Repository](https://github.com/hiroaki-handa/air-dml)
- [npm Package](https://www.npmjs.com/package/air-dml)
- [AIR-DML Specification](./SPECIFICATION.md)
- [Mode-ai](https://mode-ai.net) - Reference implementation

---

**AIR-DML™** (AI-Ready Data Modeling Language) is a trademark of Data-mination Partners.
