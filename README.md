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

Table users [alias: "ユーザー", pos_x: 100, pos_y: 100, color: "#1976D2"] {
  id serial [pk, alias: "ユーザーID"]
  username varchar(100) [not null, unique, alias: "ユーザー名"]
  email varchar(255) [not null, unique, alias: "メールアドレス"]
  created_at timestamp [not null, alias: "作成日時"]
}

Area "User Management" [
  pos_x: 50,
  pos_y: 50,
  width: 600,
  height: 300,
  color: "#1976D2",
  database_type: "PostgreSQL"
] {
  users

  CommonColumns: [
    created_at timestamp [not null, alias: "作成日時"]
    updated_at timestamp [not null, alias: "更新日時"]
  ]
}
`;

const diagram = parseAirDML(airDmlText);
console.log(diagram);

// Export back to AIR-DML
const output = exportToAirDML(diagram);
console.log(output);
```

## AIR-DML Extensions

AIR-DML extends standard DBML with the following features:

### 1. **Logical Names (Alias)**

Add human-readable names in any language:

```dbml
Table users [alias: "ユーザー"] {
  id serial [pk, alias: "ユーザーID"]
  name varchar(100) [alias: "名前"]
}
```

### 2. **Visual Coordinates**

Position tables on a canvas:

```dbml
Table users [pos_x: 100, pos_y: 200, color: "#1976D2"] {
  // ...
}
```

### 3. **Area (Bounded Context)**

Group related tables into logical domains:

```dbml
Area "User Management" [
  pos_x: 50,
  pos_y: 50,
  width: 600,
  height: 300,
  color: "#1976D2",
  database_type: "PostgreSQL",
  note: "User authentication and profile management"
] {
  users
  profiles

  CommonColumns: [
    created_at timestamp [not null]
    updated_at timestamp [not null]
  ]
}
```

### 4. **CommonColumns**

Define shared columns for all tables in an area:

```dbml
Area "Content" {
  posts
  comments

  CommonColumns: [
    id serial [pk]
    created_at timestamp [not null]
    updated_at timestamp [not null]
  ]
}
```

### 5. **Polyglot Persistence**

Different database types per area:

```dbml
Area "User Data" [database_type: "PostgreSQL"] {
  users
}

Area "Analytics" [database_type: "BigQuery"] {
  events
}
```

### 6. **AI Relationship Type**

Use `~` for undetermined relationships (AI inference):

```dbml
Ref: users.id ~ profiles.user_id
```

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
  logicalName?: string;  // AIR-DML extension
  columns: Column[];
  color?: string;        // AIR-DML extension
  pos?: Position;        // AIR-DML extension
  areaIds?: string[];    // AIR-DML extension
  note?: string;
}

interface Area {
  id: string;
  name: string;
  color?: string;
  pos?: Position;
  width?: number;
  height?: number;
  databaseType?: string;      // AIR-DML extension
  commonColumns?: Column[];   // AIR-DML extension
  note?: string;
}
```

See full type definitions in [src/types/index.ts](./src/types/index.ts).

## Comparison: DBML vs AIR-DML

| Feature | DBML | AIR-DML |
|---------|------|---------|
| **Focus** | Database schema | AI-ready + Business context |
| **Logical names** | ❌ | ✅ `alias` attribute |
| **Area management** | TableGroup (basic) | Area (extended: CommonColumns, database_type) |
| **Visual info** | ❌ | ✅ Coordinates, colors, sizes |
| **Multi-DB** | Project-level | Area-level (polyglot persistence) |
| **AI optimization** | ❌ | ✅ LLM-friendly design |

## Backward Compatibility

AIR-DML is fully compatible with standard DBML:
- All standard DBML syntax works in AIR-DML
- AIR-DML extensions are ignored by standard DBML parsers
- Powered by `@dbml/core` for core DBML parsing

## Use Cases

- **AI-Driven Development**: Generate database schemas from natural language
- **Domain-Driven Design**: Model bounded contexts with Areas
- **ER Diagram Tools**: Build visual database designers
- **Documentation**: Human-readable schema with multilingual support
- **Polyglot Persistence**: Manage multiple database types in one schema

## Specification

For the complete AIR-DML specification, see [AIR-DML Specification](https://github.com/hiroaki-handa/air-dml/blob/main/SPECIFICATION.md).

## License

Apache-2.0 License - see [LICENSE](./LICENSE) file for details.

AIR-DML extends [DBML](https://github.com/holistics/dbml) (also Apache-2.0).

## Credits

- **Created by**: Data-mination Partners
- **Technical collaboration**: Claude Sonnet 4.5 (Anthropic)
- **Based on**: [@dbml/core](https://www.npmjs.com/package/@dbml/core) by Holistics

## Links

- [GitHub Repository](https://github.com/hiroaki-handa/air-dml)
- [npm Package](https://www.npmjs.com/package/air-dml)
- [Issue Tracker](https://github.com/hiroaki-handa/air-dml/issues)
- [Mode-ai](https://github.com/data-mination/mode-ai) - Reference implementation

---

**AIR-DML™** (AI-Ready Data Modeling Language) is a trademark of Data-mination Partners.
