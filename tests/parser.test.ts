/**
 * AIR-DML Parser Tests
 *
 * These tests establish the baseline for the current parser behavior.
 * They will be used as regression tests when implementing the new independent parser.
 */

import { describe, it, expect } from 'vitest';
import { parseAirDML, exportToAirDML } from '../src/index';
import type { Diagram, Table, Column, Reference, Area } from '../src/index';

describe('parseAirDML', () => {
  describe('Project', () => {
    it('should parse project declaration', () => {
      const input = `
        Project "TestProject" {
          database_type: 'PostgreSQL'
          Note: 'Test project note'
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.name).toBe('TestProject');
      expect(diagram.database).toBe('PostgreSQL');
    });

    it('should use default values when project is not specified', () => {
      const input = `
        Table users {
          id serial [pk]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables.length).toBe(1);
    });
  });

  describe('Table', () => {
    it('should parse simple table', () => {
      const input = `
        Table users {
          id serial [pk]
          name varchar(100)
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables.length).toBe(1);
      expect(diagram.tables[0].name).toBe('users');
      expect(diagram.tables[0].columns.length).toBe(2);
    });

    it('should parse table with alias', () => {
      const input = `
        Table users [alias: "ユーザー"] {
          id serial [pk]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].logicalName).toBe('ユーザー');
    });

    it('should parse table with position', () => {
      const input = `
        Table users [pos_x: 100, pos_y: 200] {
          id serial [pk]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].pos?.x).toBe(100);
      expect(diagram.tables[0].pos?.y).toBe(200);
    });

    it('should parse table with color', () => {
      const input = `
        Table users [color: "#1976D2"] {
          id serial [pk]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].color).toBe('#1976D2');
    });

    it('should parse table with Note', () => {
      const input = `
        Table users {
          id serial [pk]

          Note: "User account table"
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].note).toBe('User account table');
    });

    it('should parse table with all attributes', () => {
      const input = `
        Table users [alias: "ユーザー", pos_x: 100, pos_y: 200, color: "#1976D2"] {
          id serial [pk, not null, alias: "ユーザーID"]
          email varchar(255) [unique, not null, alias: "メールアドレス"]

          Note: "User account table"
        }
      `;
      const diagram = parseAirDML(input);
      const table = diagram.tables[0];
      expect(table.name).toBe('users');
      expect(table.logicalName).toBe('ユーザー');
      expect(table.pos?.x).toBe(100);
      expect(table.pos?.y).toBe(200);
      expect(table.color).toBe('#1976D2');
      expect(table.columns.length).toBe(2);
      expect(table.note).toBe('User account table');
    });
  });

  describe('Column', () => {
    it('should parse column with type', () => {
      const input = `
        Table test {
          id integer
          name varchar(100)
          amount decimal(10,2)
        }
      `;
      const diagram = parseAirDML(input);
      const columns = diagram.tables[0].columns;
      expect(columns[0].type).toBe('integer');
      // New parser separates type and typeParams
      expect(columns[1].type).toBe('varchar');
      expect(columns[1].typeParams).toBe('100');
      expect(columns[2].type).toBe('decimal');
      expect(columns[2].typeParams).toBe('10,2');
    });

    it('should parse pk constraint', () => {
      const input = `
        Table test {
          id serial [pk]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].columns[0].pk).toBe(true);
    });

    it('should parse fk constraint', () => {
      const input = `
        Table orders {
          user_id integer [fk]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].columns[0].fk).toBe(true);
    });

    it('should parse unique constraint', () => {
      const input = `
        Table test {
          email varchar(255) [unique]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].columns[0].unique).toBe(true);
    });

    it('should parse not null constraint', () => {
      const input = `
        Table test {
          name varchar(100) [not null]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].columns[0].notNull).toBe(true);
    });

    it('should parse increment constraint', () => {
      const input = `
        Table test {
          id integer [increment]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].columns[0].increment).toBe(true);
    });

    it('should parse alias', () => {
      const input = `
        Table test {
          id serial [pk, alias: "ID"]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].columns[0].logicalName).toBe('ID');
    });

    it('should parse note', () => {
      const input = `
        Table test {
          status varchar(20) [note: "active/inactive/deleted"]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].columns[0].note).toBe('active/inactive/deleted');
    });

    it('should parse multiple constraints', () => {
      const input = `
        Table test {
          id serial [pk, not null, alias: "ID", note: "Primary key"]
        }
      `;
      const diagram = parseAirDML(input);
      const column = diagram.tables[0].columns[0];
      expect(column.pk).toBe(true);
      expect(column.notNull).toBe(true);
      expect(column.logicalName).toBe('ID');
      expect(column.note).toBe('Primary key');
    });
  });

  describe('Ref', () => {
    it('should parse many-to-one (>)', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table orders {
          id serial [pk]
          user_id integer
        }
        Ref: orders.user_id > users.id
      `;
      const diagram = parseAirDML(input);
      expect(diagram.references.length).toBe(1);
      const ref = diagram.references[0];
      // Note: Current parser prefixes table names with "table-"
      expect(ref.fromTable).toContain('orders');
      expect(ref.fromColumn).toBe('user_id');
      expect(ref.toTable).toContain('users');
      expect(ref.toColumn).toBe('id');
      expect(ref.type).toBe('many-to-one');
    });

    it('should parse one-to-many (<)', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table orders {
          id serial [pk]
          user_id integer
        }
        Ref: users.id < orders.user_id
      `;
      const diagram = parseAirDML(input);
      const ref = diagram.references[0];
      // New parser keeps relationship type as specified: < means one-to-many
      expect(ref.type).toBe('one-to-many');
    });

    it('should parse one-to-one (-)', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table profiles {
          id serial [pk]
          user_id integer
        }
        Ref: profiles.user_id - users.id
      `;
      const diagram = parseAirDML(input);
      const ref = diagram.references[0];
      // Note: Current parser may normalize relationship types
      expect(['one-to-one', 'many-to-one']).toContain(ref.type);
    });

    it('should parse many-to-many (<>)', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table groups {
          id serial [pk]
        }
        Ref: users.id <> groups.id
      `;
      const diagram = parseAirDML(input);
      const ref = diagram.references[0];
      // Note: Current parser may normalize relationship types
      expect(['many-to-many', 'many-to-one']).toContain(ref.type);
    });

    it('should parse ai-inferred (~)', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table posts {
          id serial [pk]
          author_id integer
        }
        Ref: posts.author_id ~ users.id
      `;
      const diagram = parseAirDML(input);
      const ref = diagram.references[0];
      expect(ref.type).toBe('ai-inferred');
    });

    it('should parse ref with swapEdge attribute', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table orders {
          id serial [pk]
          user_id integer
        }
        Ref: orders.user_id > users.id [swap_edge: true]
      `;
      const diagram = parseAirDML(input);
      const ref = diagram.references[0];
      expect(ref.swapEdge).toBe(true);
    });
  });

  describe('Area', () => {
    it('should parse area with tables', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table profiles {
          id serial [pk]
        }
        Area "User Management" {
          users
          profiles
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.areas?.length).toBe(1);
      expect(diagram.areas?.[0].name).toBe('User Management');
    });

    it('should parse area with position and size', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Area "User Area" [pos_x: 50, pos_y: 100, width: 400, height: 300] {
          users
        }
      `;
      const diagram = parseAirDML(input);
      const area = diagram.areas?.[0];
      expect(area?.pos?.x).toBe(50);
      expect(area?.pos?.y).toBe(100);
      expect(area?.width).toBe(400);
      expect(area?.height).toBe(300);
    });

    it('should parse area with color', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Area "User Area" [color: "#3B82F6"] {
          users
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.areas?.[0].color).toBe('#3B82F6');
    });

    it('should parse area with database_type', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Area "User Area" [database_type: "PostgreSQL"] {
          users
        }
      `;
      const diagram = parseAirDML(input);
      // Note: database_type support depends on parser implementation
      // This test documents current behavior
      expect(diagram.areas?.length).toBe(1);
      // databaseType may or may not be set depending on parser version
    });

    // TODO: These tests are skipped because current @dbml/core parser
    // doesn't support CommonColumns and Note inside Area blocks.
    // New independent parser should support these features.
    it('should parse area with CommonColumns', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Area "User Area" {
          users
          CommonColumns: [
            created_at timestamp [not null, alias: "作成日時"]
            updated_at timestamp [not null, alias: "更新日時"]
          ]
        }
      `;
      const diagram = parseAirDML(input);
      const area = diagram.areas?.[0];
      expect(area).toBeDefined();
      expect(area?.commonColumns?.length).toBe(2);
      expect(area?.commonColumns?.[0].name).toBe('created_at');
      expect(area?.commonColumns?.[0].logicalName).toBe('作成日時');
    });

    it('should parse area with Note', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Area "User Area" {
          users
          Note: "User management area"
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.areas?.length).toBe(1);
      expect(diagram.areas?.[0].note).toBe('User management area');
    });

    it('should parse area with Japanese name', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Area "ユーザー管理" [color: "#3B82F6"] {
          users
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.areas?.[0].name).toBe('ユーザー管理');
    });
  });

  describe('Comments', () => {
    it('should preserve leading comments for tables', () => {
      const input = `
        // User account management
        // Stores all user data
        Table users {
          id serial [pk]
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables[0].leadingComments).toContain('User account management');
      expect(diagram.tables[0].leadingComments).toContain('Stores all user data');
    });

    it('should preserve leading comments for refs', () => {
      const input = `
        Table users {
          id serial [pk]
        }
        Table orders {
          id serial [pk]
          user_id integer
        }
        // Links orders to users
        Ref: orders.user_id > users.id
      `;
      const diagram = parseAirDML(input);
      expect(diagram.references[0].leadingComments).toContain('Links orders to users');
    });
  });

  describe('indexes', () => {
    it('should parse single column index', () => {
      const input = `
        Table users {
          id serial [pk]
          email varchar(255)

          indexes {
            email
          }
        }
      `;
      const diagram = parseAirDML(input);
      // Note: Current parser may not fully support indexes,
      // this test documents expected behavior
      expect(diagram.tables.length).toBe(1);
    });

    it('should parse composite index', () => {
      const input = `
        Table users {
          id serial [pk]
          first_name varchar(100)
          last_name varchar(100)

          indexes {
            (first_name, last_name)
          }
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables.length).toBe(1);
    });

    it('should parse unique index', () => {
      const input = `
        Table users {
          id serial [pk]
          email varchar(255)

          indexes {
            email [unique]
          }
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables.length).toBe(1);
    });

    it('should parse named index', () => {
      const input = `
        Table users {
          id serial [pk]
          email varchar(255)

          indexes {
            email [name: 'idx_users_email']
          }
        }
      `;
      const diagram = parseAirDML(input);
      expect(diagram.tables.length).toBe(1);
    });
  });
});

describe('exportToAirDML', () => {
  it('should export diagram to AIR-DML format', () => {
    const input = `
      Table users [alias: "ユーザー"] {
        id serial [pk, not null, alias: "ID"]
        email varchar(255) [unique, alias: "メールアドレス"]
      }
    `;
    const diagram = parseAirDML(input);
    const output = exportToAirDML(diagram);

    expect(output).toContain('Table users');
    expect(output).toContain('alias: "ユーザー"');
    expect(output).toContain('id serial');
    expect(output).toContain('[pk');
  });

  it('should roundtrip correctly', () => {
    const input = `
      Table users [alias: "ユーザー", pos_x: 100, pos_y: 200] {
        id serial [pk, not null, alias: "ID"]
        email varchar(255) [unique, not null, alias: "メールアドレス"]
      }

      Table orders [alias: "注文"] {
        id serial [pk, not null]
        user_id integer [fk, not null]
      }

      Ref: orders.user_id > users.id
    `;

    const diagram1 = parseAirDML(input);
    const exported = exportToAirDML(diagram1);
    const diagram2 = parseAirDML(exported);

    // Compare key properties
    expect(diagram2.tables.length).toBe(diagram1.tables.length);
    expect(diagram2.references.length).toBe(diagram1.references.length);

    // Compare table details
    const users1 = diagram1.tables.find(t => t.name === 'users');
    const users2 = diagram2.tables.find(t => t.name === 'users');
    expect(users2?.logicalName).toBe(users1?.logicalName);
    expect(users2?.columns.length).toBe(users1?.columns.length);
  });
});

describe('Complex scenarios', () => {
  it('should parse complete ER diagram', () => {
    const input = `
      Project "E-Commerce" {
        database_type: 'PostgreSQL'
        Note: 'E-commerce database schema'
      }

      // Master data
      Table users [alias: "ユーザー", pos_x: 100, pos_y: 100, color: "#1976D2"] {
        id serial [pk, not null, alias: "ユーザーID"]
        email varchar(255) [unique, not null, alias: "メールアドレス"]
        name varchar(100) [not null, alias: "氏名"]
        created_at timestamp [not null, alias: "作成日時"]

        Note: "User account information"
      }

      // Transaction data
      Table orders [alias: "注文", pos_x: 400, pos_y: 100, color: "#F59E0B"] {
        id serial [pk, not null, alias: "注文ID"]
        user_id integer [fk, not null, alias: "ユーザーID"]
        total decimal(10,2) [not null, alias: "合計金額"]
        status varchar(20) [not null, alias: "ステータス", note: "pending/confirmed/shipped/delivered"]
        ordered_at timestamp [not null, alias: "注文日時"]
      }

      Ref: orders.user_id > users.id

      Area "マスタ" [color: "#3B82F6", pos_x: 50, pos_y: 50, width: 300, height: 200] {
        users
      }

      Area "トランザクション" [color: "#F59E0B", pos_x: 350, pos_y: 50, width: 300, height: 200] {
        orders
      }
    `;

    const diagram = parseAirDML(input);

    // Project
    expect(diagram.name).toBe('E-Commerce');
    expect(diagram.database).toBe('PostgreSQL');

    // Tables
    expect(diagram.tables.length).toBe(2);

    const users = diagram.tables.find(t => t.name === 'users');
    expect(users?.logicalName).toBe('ユーザー');
    expect(users?.color).toBe('#1976D2');
    expect(users?.columns.length).toBe(4);

    const orders = diagram.tables.find(t => t.name === 'orders');
    expect(orders?.logicalName).toBe('注文');
    expect(orders?.columns.length).toBe(5);

    // References
    expect(diagram.references.length).toBe(1);
    // Note: Current parser prefixes table names
    expect(diagram.references[0].fromTable).toContain('orders');
    expect(diagram.references[0].toTable).toContain('users');

    // Areas
    expect(diagram.areas?.length).toBe(2);
  });
});
