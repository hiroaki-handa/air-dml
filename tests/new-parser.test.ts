/**
 * AIR-DML New Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '../src/parser/new/lexer';
import { Parser, ParseError } from '../src/parser/new/parser';
import type { ProgramNode } from '../src/parser/new/ast';

function parse(source: string): { ast: ProgramNode; errors: ParseError[] } {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('New Parser', () => {
  describe('Project', () => {
    it('should parse Project with name', () => {
      const { ast, errors } = parse('Project "MyApp" {}');

      expect(errors).toHaveLength(0);
      expect(ast.project).toBeDefined();
      expect(ast.project?.name).toBe('MyApp');
    });

    it('should parse Project with database_type', () => {
      const { ast, errors } = parse(`
        Project "MyApp" {
          database_type: 'PostgreSQL'
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.project?.name).toBe('MyApp');
      expect(ast.project?.settings.databaseType).toBe('PostgreSQL');
    });

    it('should parse Project with Note', () => {
      const { ast, errors } = parse(`
        Project "MyApp" {
          Note: "This is a test project"
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.project?.settings.note).toBe('This is a test project');
    });
  });

  describe('Table', () => {
    it('should parse simple Table', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial
          name varchar
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables).toHaveLength(1);
      expect(ast.tables[0].name).toBe('users');
      expect(ast.tables[0].columns).toHaveLength(2);
      expect(ast.tables[0].columns[0].name).toBe('id');
      expect(ast.tables[0].columns[0].type).toBe('serial');
      expect(ast.tables[0].columns[1].name).toBe('name');
      expect(ast.tables[0].columns[1].type).toBe('varchar');
    });

    it('should parse Table with settings', () => {
      const { ast, errors } = parse(`
        Table users [alias: "ユーザー", pos_x: 100, pos_y: 200, color: "#1976D2"] {
          id serial
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].settings.alias).toBe('ユーザー');
      expect(ast.tables[0].settings.posX).toBe(100);
      expect(ast.tables[0].settings.posY).toBe(200);
      expect(ast.tables[0].settings.color).toBe('#1976D2');
    });

    it('should parse Table with Note', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial
          Note: "User table description"
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].note).toBe('User table description');
    });

    it('should parse Japanese Table name', () => {
      const { ast, errors } = parse(`
        Table ユーザー {
          ID serial
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].name).toBe('ユーザー');
    });
  });

  describe('Column', () => {
    it('should parse column with type parameters', () => {
      const { ast, errors } = parse(`
        Table users {
          name varchar(100)
          price decimal(10,2)
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].type).toBe('varchar');
      expect(ast.tables[0].columns[0].typeParams).toBe('100');
      expect(ast.tables[0].columns[1].type).toBe('decimal');
      expect(ast.tables[0].columns[1].typeParams).toBe('10,2');
    });

    it('should parse pk constraint', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial [pk]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.pk).toBe(true);
    });

    it('should parse fk constraint', () => {
      const { ast, errors } = parse(`
        Table orders {
          user_id int [fk]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.fk).toBe(true);
    });

    it('should parse unique constraint', () => {
      const { ast, errors } = parse(`
        Table users {
          email varchar [unique]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.unique).toBe(true);
    });

    it('should parse not null constraint', () => {
      const { ast, errors } = parse(`
        Table users {
          name varchar [not null]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.notNull).toBe(true);
    });

    it('should parse increment constraint', () => {
      const { ast, errors } = parse(`
        Table users {
          id int [increment]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.increment).toBe(true);
    });

    it('should parse default with string value', () => {
      const { ast, errors } = parse(`
        Table users {
          status varchar [default: 'active']
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.default).toBe("'active'");
      expect(ast.tables[0].columns[0].constraints.defaultType).toBe('string');
    });

    it('should parse default with function value', () => {
      const { ast, errors } = parse(`
        Table users {
          created_at timestamp [default: \`now()\`]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.default).toBe('`now()`');
      expect(ast.tables[0].columns[0].constraints.defaultType).toBe('function');
    });

    it('should parse default with number value', () => {
      const { ast, errors } = parse(`
        Table products {
          quantity int [default: 0]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.default).toBe('0');
      expect(ast.tables[0].columns[0].constraints.defaultType).toBe('value');
    });

    it('should parse alias constraint', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial [alias: "ID"]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.alias).toBe('ID');
    });

    it('should parse note constraint', () => {
      const { ast, errors } = parse(`
        Table users {
          email varchar [note: "User email address"]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].constraints.note).toBe('User email address');
    });

    it('should parse multiple constraints', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial [pk, not null, increment, alias: "ID"]
        }
      `);

      expect(errors).toHaveLength(0);
      const constraints = ast.tables[0].columns[0].constraints;
      expect(constraints.pk).toBe(true);
      expect(constraints.notNull).toBe(true);
      expect(constraints.increment).toBe(true);
      expect(constraints.alias).toBe('ID');
    });
  });

  describe('Ref', () => {
    it('should parse many-to-one ref (>)', () => {
      const { ast, errors } = parse('Ref: orders.user_id > users.id');

      expect(errors).toHaveLength(0);
      expect(ast.refs).toHaveLength(1);
      expect(ast.refs[0].from.table).toBe('orders');
      expect(ast.refs[0].from.column).toBe('user_id');
      expect(ast.refs[0].relationType).toBe('>');
      expect(ast.refs[0].to.table).toBe('users');
      expect(ast.refs[0].to.column).toBe('id');
    });

    it('should parse one-to-many ref (<)', () => {
      const { ast, errors } = parse('Ref: users.id < orders.user_id');

      expect(errors).toHaveLength(0);
      expect(ast.refs[0].relationType).toBe('<');
    });

    it('should parse one-to-one ref (-)', () => {
      const { ast, errors } = parse('Ref: users.id - profiles.user_id');

      expect(errors).toHaveLength(0);
      expect(ast.refs[0].relationType).toBe('-');
    });

    it('should parse many-to-many ref (<>)', () => {
      const { ast, errors } = parse('Ref: users.id <> roles.id');

      expect(errors).toHaveLength(0);
      expect(ast.refs[0].relationType).toBe('<>');
    });

    it('should parse AI-inferred ref (~)', () => {
      const { ast, errors } = parse('Ref: orders.product_id ~ products.id');

      expect(errors).toHaveLength(0);
      expect(ast.refs[0].relationType).toBe('~');
    });

    it('should parse ref with swapEdge setting', () => {
      const { ast, errors } = parse('Ref: orders.user_id > users.id [swapEdge: true]');

      expect(errors).toHaveLength(0);
      expect(ast.refs[0].settings.swapEdge).toBe(true);
    });

    it('should parse ref with swap_edge setting (underscore)', () => {
      const { ast, errors } = parse('Ref: orders.user_id > users.id [swap_edge: true]');

      expect(errors).toHaveLength(0);
      expect(ast.refs[0].settings.swapEdge).toBe(true);
    });

    it('should parse ref with note', () => {
      const { ast, errors } = parse('Ref: orders.user_id > users.id [note: "Foreign key"]');

      expect(errors).toHaveLength(0);
      expect(ast.refs[0].settings.note).toBe('Foreign key');
    });
  });

  describe('Area', () => {
    it('should parse simple Area', () => {
      const { ast, errors } = parse(`
        Area "マスタ" {
          users
          profiles
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.areas).toHaveLength(1);
      expect(ast.areas[0].name).toBe('マスタ');
      expect(ast.areas[0].tables).toEqual(['users', 'profiles']);
    });

    it('should parse Area with settings', () => {
      const { ast, errors } = parse(`
        Area "マスタ" [pos_x: 50, pos_y: 100, width: 400, height: 300, color: "#3B82F6"] {
          users
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.areas[0].settings.posX).toBe(50);
      expect(ast.areas[0].settings.posY).toBe(100);
      expect(ast.areas[0].settings.width).toBe(400);
      expect(ast.areas[0].settings.height).toBe(300);
      expect(ast.areas[0].settings.color).toBe('#3B82F6');
    });

    it('should parse Area with database_type', () => {
      const { ast, errors } = parse(`
        Area "DWH" [database_type: "BigQuery"] {
          analytics
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.areas[0].settings.databaseType).toBe('BigQuery');
    });

    it('should parse Area with label settings', () => {
      const { ast, errors } = parse(`
        Area "マスタ" [labelHorizontal: "left", labelVertical: "top"] {
          users
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.areas[0].settings.labelHorizontal).toBe('left');
      expect(ast.areas[0].settings.labelVertical).toBe('top');
    });

    it('should parse Area with CommonColumns', () => {
      const { ast, errors } = parse(`
        Area "マスタ" {
          users
          CommonColumns: [
            created_at timestamp [not null]
            updated_at timestamp
          ]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.areas[0].commonColumns).toHaveLength(2);
      expect(ast.areas[0].commonColumns?.[0].name).toBe('created_at');
      expect(ast.areas[0].commonColumns?.[0].type).toBe('timestamp');
      expect(ast.areas[0].commonColumns?.[0].constraints.notNull).toBe(true);
      expect(ast.areas[0].commonColumns?.[1].name).toBe('updated_at');
    });

    it('should parse Area with Note', () => {
      const { ast, errors } = parse(`
        Area "マスタ" {
          users
          Note: "Master data area"
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.areas[0].note).toBe('Master data area');
    });
  });

  describe('Indexes', () => {
    it('should parse single column index', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial
          email varchar
          indexes {
            email
          }
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].indexes).toHaveLength(1);
      expect(ast.tables[0].indexes?.[0].columns).toEqual(['email']);
    });

    it('should parse composite index', () => {
      const { ast, errors } = parse(`
        Table users {
          first_name varchar
          last_name varchar
          indexes {
            (first_name, last_name)
          }
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].indexes?.[0].columns).toEqual(['first_name', 'last_name']);
    });

    it('should parse index with unique setting', () => {
      const { ast, errors } = parse(`
        Table users {
          email varchar
          indexes {
            email [unique]
          }
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].indexes?.[0].settings.unique).toBe(true);
    });

    it('should parse index with pk setting', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial
          indexes {
            id [pk]
          }
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].indexes?.[0].settings.pk).toBe(true);
    });

    it('should parse index with name setting', () => {
      const { ast, errors } = parse(`
        Table users {
          email varchar
          indexes {
            email [name: 'idx_users_email']
          }
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].indexes?.[0].settings.name).toBe('idx_users_email');
    });

    it('should parse multiple indexes', () => {
      const { ast, errors } = parse(`
        Table users {
          id serial
          email varchar
          name varchar
          indexes {
            email [unique]
            (id, name)
          }
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].indexes).toHaveLength(2);
    });
  });

  describe('Comments', () => {
    it('should preserve leading comments', () => {
      const { ast, errors } = parse(`
        // User table comment
        Table users {
          id serial
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].leadingComments).toEqual(['User table comment']);
    });

    it('should preserve column comments', () => {
      const { ast, errors } = parse(`
        Table users {
          // Primary key
          id serial [pk]
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].columns[0].leadingComments).toEqual(['Primary key']);
    });

    it('should preserve multiple comments', () => {
      const { ast, errors } = parse(`
        // Comment 1
        // Comment 2
        Table users {
          id serial
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.tables[0].leadingComments).toEqual(['Comment 1', 'Comment 2']);
    });
  });

  describe('Error handling', () => {
    it('should report missing brace', () => {
      const { errors } = parse(`
        Table users
          id serial
        }
      `);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should report missing ref operator', () => {
      const { errors } = parse('Ref: orders.user_id users.id');

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should recover from errors and continue parsing', () => {
      const { ast, errors } = parse(`
        Table invalid {

        Table valid {
          id serial
        }
      `);

      // Should have parsed the valid table despite error in first one
      expect(ast.tables.find(t => t.name === 'valid')).toBeDefined();
    });
  });

  describe('Complex input', () => {
    it('should parse a complete document', () => {
      const { ast, errors } = parse(`
        Project "E-Commerce" {
          database_type: 'PostgreSQL'
          Note: "E-Commerce application"
        }

        // Master tables
        Table users [alias: "ユーザー", color: "#1976D2"] {
          id serial [pk, not null, alias: "ID"]
          email varchar(255) [unique, not null]
          created_at timestamp [default: \`now()\`]

          indexes {
            email [unique]
          }
        }

        Table orders [alias: "注文"] {
          id serial [pk]
          user_id int [fk, not null]
          total decimal(10,2) [default: 0]
        }

        Ref: orders.user_id > users.id

        Area "マスタ" [color: "#3B82F6", pos_x: 50] {
          users
          Note: "Master data"
        }
      `);

      expect(errors).toHaveLength(0);
      expect(ast.project?.name).toBe('E-Commerce');
      expect(ast.tables).toHaveLength(2);
      expect(ast.refs).toHaveLength(1);
      expect(ast.areas).toHaveLength(1);
    });
  });
});
