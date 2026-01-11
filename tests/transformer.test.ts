/**
 * AIR-DML Transformer Tests
 *
 * Tests the AST to Diagram transformation.
 */

import { describe, it, expect } from 'vitest';
import { parseAirDML, exportToAirDML } from '../src/parser/new';

describe('Transformer', () => {
  describe('parseAirDML', () => {
    it('should parse simple table', () => {
      const result = parseAirDML(`
        Table users {
          id serial [pk]
          name varchar(100)
        }
      `);

      expect(result.success).toBe(true);
      expect(result.diagram).toBeDefined();
      expect(result.diagram?.tables).toHaveLength(1);
      expect(result.diagram?.tables[0].name).toBe('users');
      expect(result.diagram?.tables[0].columns).toHaveLength(2);
    });

    it('should parse Project with settings', () => {
      const result = parseAirDML(`
        Project "MyApp" {
          database_type: 'PostgreSQL'
          Note: "Test project"
        }
      `);

      expect(result.success).toBe(true);
      expect(result.diagram?.name).toBe('MyApp');
      expect(result.diagram?.database).toBe('PostgreSQL');
      expect(result.diagram?.note).toBe('Test project');
    });

    it('should parse table with all settings', () => {
      const result = parseAirDML(`
        Table users [alias: "ユーザー", pos_x: 100, pos_y: 200, color: "#1976D2"] {
          id serial [pk, not null]
        }
      `);

      expect(result.success).toBe(true);
      const table = result.diagram?.tables[0];
      expect(table?.logicalName).toBe('ユーザー');
      expect(table?.pos?.x).toBe(100);
      expect(table?.pos?.y).toBe(200);
      expect(table?.color).toBe('#1976D2');
    });

    it('should parse column with all constraints', () => {
      const result = parseAirDML(`
        Table users {
          id serial [pk, not null, increment, alias: "ID", note: "Primary key"]
          email varchar(255) [unique, not null]
        }
      `);

      expect(result.success).toBe(true);
      const columns = result.diagram?.tables[0].columns;

      expect(columns?.[0].pk).toBe(true);
      expect(columns?.[0].notNull).toBe(true);
      expect(columns?.[0].increment).toBe(true);
      expect(columns?.[0].logicalName).toBe('ID');
      expect(columns?.[0].note).toBe('Primary key');

      expect(columns?.[1].unique).toBe(true);
      expect(columns?.[1].notNull).toBe(true);
    });

    it('should parse references and mark FK columns', () => {
      const result = parseAirDML(`
        Table users {
          id serial [pk]
        }

        Table orders {
          id serial [pk]
          user_id int
        }

        Ref: orders.user_id > users.id
      `);

      expect(result.success).toBe(true);
      expect(result.diagram?.references).toHaveLength(1);

      const ref = result.diagram?.references[0];
      expect(ref?.fromTable).toBe('table-orders');
      expect(ref?.fromColumn).toBe('user_id');
      expect(ref?.toTable).toBe('table-users');
      expect(ref?.toColumn).toBe('id');
      expect(ref?.type).toBe('many-to-one');

      // FK should be marked on the column
      const ordersTable = result.diagram?.tables.find(t => t.name === 'orders');
      const userIdColumn = ordersTable?.columns.find(c => c.name === 'user_id');
      expect(userIdColumn?.fk).toBe(true);
    });

    it('should parse AI-inferred reference', () => {
      const result = parseAirDML(`
        Table orders {
          product_id int
        }

        Table products {
          id serial [pk]
        }

        Ref: orders.product_id ~ products.id
      `);

      expect(result.success).toBe(true);
      const ref = result.diagram?.references[0];
      expect(ref?.type).toBe('ai-inferred');
    });

    it('should parse Area with tables', () => {
      const result = parseAirDML(`
        Table users {
          id serial [pk]
        }

        Table profiles {
          id serial [pk]
        }

        Area "マスタ" [color: "#3B82F6", pos_x: 50, pos_y: 100] {
          users
          profiles
        }
      `);

      expect(result.success).toBe(true);
      expect(result.diagram?.areas).toHaveLength(1);

      const area = result.diagram?.areas?.[0];
      expect(area?.name).toBe('マスタ');
      expect(area?.color).toBe('#3B82F6');
      expect(area?.pos?.x).toBe(50);
      expect(area?.pos?.y).toBe(100);

      // Tables should be associated with area
      const usersTable = result.diagram?.tables.find(t => t.name === 'users');
      const profilesTable = result.diagram?.tables.find(t => t.name === 'profiles');
      expect(usersTable?.areaIds).toContain(area?.id);
      expect(profilesTable?.areaIds).toContain(area?.id);

      // Area.tables should contain table IDs
      expect(area?.tables).toContain(usersTable?.id);
      expect(area?.tables).toContain(profilesTable?.id);
      expect(area?.tables).toHaveLength(2);
    });

    it('should parse Area with CommonColumns', () => {
      const result = parseAirDML(`
        Area "マスタ" {
          users
          CommonColumns: [
            created_at timestamp [not null]
            updated_at timestamp
          ]
        }
      `);

      expect(result.success).toBe(true);
      const area = result.diagram?.areas?.[0];
      expect(area?.commonColumns).toHaveLength(2);
      expect(area?.commonColumns?.[0].name).toBe('created_at');
      expect(area?.commonColumns?.[0].type).toBe('timestamp');
      expect(area?.commonColumns?.[0].notNull).toBe(true);
    });

    it('should preserve comments', () => {
      const result = parseAirDML(`
        // User table
        Table users {
          // Primary key
          id serial [pk]
        }
      `);

      expect(result.success).toBe(true);
      expect(result.diagram?.tables[0].leadingComments).toEqual(['User table']);
      expect(result.diagram?.tables[0].columns[0].leadingComments).toEqual(['Primary key']);
    });

    it('should handle errors gracefully', () => {
      const result = parseAirDML(`
        Table invalid {
        // Missing closing brace and columns
      `);

      // Should still return a result (may have warnings or partial parse)
      expect(result).toBeDefined();
    });
  });

  describe('exportToAirDML', () => {
    it('should round-trip simple table', () => {
      const input = `
        Table users {
          id serial [pk]
          name varchar(100)
        }
      `;

      const parseResult = parseAirDML(input);
      expect(parseResult.success).toBe(true);

      const exported = exportToAirDML(parseResult.diagram!);

      // Parse the exported text to verify it's valid
      const reparsed = parseAirDML(exported);
      expect(reparsed.success).toBe(true);
      expect(reparsed.diagram?.tables).toHaveLength(1);
      expect(reparsed.diagram?.tables[0].name).toBe('users');
    });

    it('should export table with all attributes', () => {
      const input = `
        Table users [alias: "ユーザー", pos_x: 100, pos_y: 200, color: "#1976D2"] {
          id serial [pk, not null, alias: "ID"]
        }
      `;

      const parseResult = parseAirDML(input);
      const exported = exportToAirDML(parseResult.diagram!);

      expect(exported).toContain('alias: "ユーザー"');
      expect(exported).toContain('pos_x: 100');
      expect(exported).toContain('pos_y: 200');
      expect(exported).toContain('color: "#1976D2"');
    });

    it('should export references', () => {
      const input = `
        Table users {
          id serial [pk]
        }

        Table orders {
          user_id int [fk]
        }

        Ref: orders.user_id > users.id
      `;

      const parseResult = parseAirDML(input);
      const exported = exportToAirDML(parseResult.diagram!);

      expect(exported).toContain('Ref: orders.user_id > users.id');
    });

    it('should export AI-inferred references', () => {
      const input = `
        Table orders {
          product_id int
        }

        Table products {
          id serial [pk]
        }

        Ref: orders.product_id ~ products.id
      `;

      const parseResult = parseAirDML(input);
      const exported = exportToAirDML(parseResult.diagram!);

      expect(exported).toContain('Ref: orders.product_id ~ products.id');
    });

    it('should export Area', () => {
      const input = `
        Table users {
          id serial [pk]
        }

        Area "マスタ" [color: "#3B82F6"] {
          users
        }
      `;

      const parseResult = parseAirDML(input);
      const exported = exportToAirDML(parseResult.diagram!);

      expect(exported).toContain('Area "マスタ"');
      expect(exported).toContain('color: "#3B82F6"');
    });

    it('should export Area with CommonColumns', () => {
      const input = `
        Area "マスタ" {
          users
          CommonColumns: [
            created_at timestamp [not null]
          ]
        }
      `;

      const parseResult = parseAirDML(input);
      const exported = exportToAirDML(parseResult.diagram!);

      expect(exported).toContain('CommonColumns:');
      expect(exported).toContain('created_at timestamp');
    });
  });

  describe('Integration', () => {
    it('should handle complete document', () => {
      const input = `
        Project "E-Commerce" {
          database_type: 'PostgreSQL'
          Note: "E-Commerce application"
        }

        // Master tables
        Table users [alias: "ユーザー", color: "#1976D2"] {
          id serial [pk, not null, alias: "ID"]
          email varchar(255) [unique, not null]
          created_at timestamp
        }

        Table orders [alias: "注文"] {
          id serial [pk]
          user_id int [fk, not null]
          total decimal(10,2)
        }

        Ref: orders.user_id > users.id

        Area "マスタ" [color: "#3B82F6", pos_x: 50] {
          users
          Note: "Master data"
        }
      `;

      const result = parseAirDML(input);

      expect(result.success).toBe(true);
      expect(result.diagram?.name).toBe('E-Commerce');
      expect(result.diagram?.database).toBe('PostgreSQL');
      expect(result.diagram?.tables).toHaveLength(2);
      expect(result.diagram?.references).toHaveLength(1);
      expect(result.diagram?.areas).toHaveLength(1);

      // Round-trip
      const exported = exportToAirDML(result.diagram!);
      const reparsed = parseAirDML(exported);
      expect(reparsed.success).toBe(true);
    });
  });
});
