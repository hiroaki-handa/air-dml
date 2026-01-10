/**
 * AIR-DML Lexer Tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer, LexerError } from '../src/parser/new/lexer';
import { TokenType } from '../src/parser/new/tokens';

describe('Lexer', () => {
  describe('Keywords', () => {
    it('should tokenize main keywords', () => {
      const lexer = new Lexer('Project Table Area Ref Note indexes');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.PROJECT);
      expect(tokens[1].type).toBe(TokenType.TABLE);
      expect(tokens[2].type).toBe(TokenType.AREA);
      expect(tokens[3].type).toBe(TokenType.REF);
      expect(tokens[4].type).toBe(TokenType.NOTE);
      expect(tokens[5].type).toBe(TokenType.INDEXES);
    });

    it('should tokenize constraint keywords', () => {
      const lexer = new Lexer('pk fk unique not null increment default');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.PK);
      expect(tokens[1].type).toBe(TokenType.FK);
      expect(tokens[2].type).toBe(TokenType.UNIQUE);
      expect(tokens[3].type).toBe(TokenType.NOT);
      expect(tokens[4].type).toBe(TokenType.NULL);
      expect(tokens[5].type).toBe(TokenType.INCREMENT);
      expect(tokens[6].type).toBe(TokenType.DEFAULT);
    });

    it('should tokenize attribute keywords', () => {
      const lexer = new Lexer('alias pos_x pos_y width height color swap_edge database_type name');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.ALIAS);
      expect(tokens[1].type).toBe(TokenType.POS_X);
      expect(tokens[2].type).toBe(TokenType.POS_Y);
      expect(tokens[3].type).toBe(TokenType.WIDTH);
      expect(tokens[4].type).toBe(TokenType.HEIGHT);
      expect(tokens[5].type).toBe(TokenType.COLOR);
      expect(tokens[6].type).toBe(TokenType.SWAP_EDGE);
      expect(tokens[7].type).toBe(TokenType.DATABASE_TYPE);
      expect(tokens[8].type).toBe(TokenType.NAME);
    });

    it('should be case-insensitive for keywords', () => {
      const lexer = new Lexer('TABLE Table table PROJECT Project project');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.TABLE);
      expect(tokens[1].type).toBe(TokenType.TABLE);
      expect(tokens[2].type).toBe(TokenType.TABLE);
      expect(tokens[3].type).toBe(TokenType.PROJECT);
      expect(tokens[4].type).toBe(TokenType.PROJECT);
      expect(tokens[5].type).toBe(TokenType.PROJECT);
    });
  });

  describe('Identifiers', () => {
    it('should tokenize simple identifiers', () => {
      const lexer = new Lexer('users orders user_id');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('users');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('orders');
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('user_id');
    });

    it('should tokenize Japanese identifiers', () => {
      const lexer = new Lexer('ユーザー 注文 顧客ID');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('ユーザー');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('注文');
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('顧客ID');
    });

    it('should tokenize mixed identifiers', () => {
      const lexer = new Lexer('user_テーブル order123 _private');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('user_テーブル');
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('order123');
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('_private');
    });
  });

  describe('String literals', () => {
    it('should tokenize double-quoted strings', () => {
      const lexer = new Lexer('"hello" "ユーザー"');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('hello');
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('ユーザー');
    });

    it('should tokenize single-quoted strings', () => {
      const lexer = new Lexer("'active' 'pending'");
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.SINGLE_STRING);
      expect(tokens[0].value).toBe('active');
      expect(tokens[1].type).toBe(TokenType.SINGLE_STRING);
      expect(tokens[1].value).toBe('pending');
    });

    it('should tokenize backtick strings', () => {
      const lexer = new Lexer('`now()` `uuid_generate_v4()`');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.BACKTICK_STRING);
      expect(tokens[0].value).toBe('now()');
      expect(tokens[1].type).toBe(TokenType.BACKTICK_STRING);
      expect(tokens[1].value).toBe('uuid_generate_v4()');
    });

    it('should handle escape sequences', () => {
      const lexer = new Lexer('"hello\\nworld" "tab\\there"');
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('hello\nworld');
      expect(tokens[1].value).toBe('tab\there');
    });

    it('should handle escaped quotes', () => {
      const lexer = new Lexer('"say \\"hello\\""');
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('say "hello"');
    });

    it('should throw error for unterminated string', () => {
      const lexer = new Lexer('"unterminated');
      expect(() => lexer.tokenize()).toThrow(LexerError);
    });
  });

  describe('Numbers', () => {
    it('should tokenize integers', () => {
      const lexer = new Lexer('0 123 456789');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('0');
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[1].value).toBe('123');
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe('456789');
    });

    it('should tokenize decimals', () => {
      const lexer = new Lexer('3.14 0.5 123.456');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('3.14');
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[1].value).toBe('0.5');
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe('123.456');
    });

    it('should tokenize negative numbers', () => {
      const lexer = new Lexer('-1 -3.14');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('-1');
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[1].value).toBe('-3.14');
    });
  });

  describe('Symbols', () => {
    it('should tokenize braces and brackets', () => {
      const lexer = new Lexer('{ } [ ] ( )');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LBRACE);
      expect(tokens[1].type).toBe(TokenType.RBRACE);
      expect(tokens[2].type).toBe(TokenType.LBRACKET);
      expect(tokens[3].type).toBe(TokenType.RBRACKET);
      expect(tokens[4].type).toBe(TokenType.LPAREN);
      expect(tokens[5].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize punctuation', () => {
      const lexer = new Lexer(': , .');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.COLON);
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[2].type).toBe(TokenType.DOT);
    });
  });

  describe('Relationship operators', () => {
    it('should tokenize > (many-to-one)', () => {
      const lexer = new Lexer('>');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.REF_GT);
    });

    it('should tokenize < (one-to-many)', () => {
      const lexer = new Lexer('<');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.REF_LT);
    });

    it('should tokenize - (one-to-one)', () => {
      const lexer = new Lexer('a - b');
      const tokens = lexer.tokenize();

      expect(tokens[1].type).toBe(TokenType.REF_DASH);
    });

    it('should tokenize <> (many-to-many)', () => {
      const lexer = new Lexer('<>');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.REF_LTGT);
      expect(tokens[0].value).toBe('<>');
    });

    it('should tokenize ~ (ai-inferred)', () => {
      const lexer = new Lexer('~');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.REF_TILDE);
    });
  });

  describe('Comments', () => {
    it('should tokenize line comments', () => {
      const lexer = new Lexer('// This is a comment');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LINE_COMMENT);
      expect(tokens[0].value).toBe('This is a comment');
    });

    it('should tokenize Japanese comments', () => {
      const lexer = new Lexer('// ユーザーテーブルの説明');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.LINE_COMMENT);
      expect(tokens[0].value).toBe('ユーザーテーブルの説明');
    });

    it('should handle multiple comments', () => {
      const lexer = new Lexer(`
        // First comment
        Table users {
          // Column comment
          id serial
        }
      `);
      const tokens = lexer.tokenize();

      const comments = tokens.filter(t => t.type === TokenType.LINE_COMMENT);
      expect(comments.length).toBe(2);
      expect(comments[0].value).toBe('First comment');
      expect(comments[1].value).toBe('Column comment');
    });
  });

  describe('Color literals', () => {
    it('should tokenize 6-digit hex colors', () => {
      const lexer = new Lexer('#1976D2 #F59E0B');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('#1976D2');
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('#F59E0B');
    });

    it('should tokenize 3-digit hex colors', () => {
      const lexer = new Lexer('#FFF #000');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('#FFF');
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe('#000');
    });

    it('should throw error for invalid color format', () => {
      const lexer = new Lexer('#12');
      expect(() => lexer.tokenize()).toThrow(LexerError);
    });
  });

  describe('Position tracking', () => {
    it('should track line and column correctly', () => {
      const lexer = new Lexer(`Table users {
  id serial
}`);
      const tokens = lexer.tokenize();

      // Table is at line 1, column 1
      expect(tokens[0].start.line).toBe(1);
      expect(tokens[0].start.column).toBe(1);

      // id is at line 2, column 3
      const idToken = tokens.find(t => t.value === 'id');
      expect(idToken?.start.line).toBe(2);
      expect(idToken?.start.column).toBe(3);
    });

    it('should track offset correctly', () => {
      const lexer = new Lexer('abc def');
      const tokens = lexer.tokenize();

      expect(tokens[0].start.offset).toBe(0);
      expect(tokens[1].start.offset).toBe(4);
    });
  });

  describe('Complex input', () => {
    it('should tokenize a complete table definition', () => {
      const input = `
        Table users [alias: "ユーザー", pos_x: 100, color: "#1976D2"] {
          id serial [pk, not null, alias: "ID"]
          email varchar(255) [unique, not null]
        }
      `;
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      // Should not throw and produce expected tokens
      expect(tokens.length).toBeGreaterThan(20);

      // Check some key tokens
      expect(tokens.find(t => t.type === TokenType.TABLE)).toBeDefined();
      expect(tokens.find(t => t.value === 'users')).toBeDefined();
      expect(tokens.find(t => t.type === TokenType.ALIAS)).toBeDefined();
      expect(tokens.find(t => t.value === 'ユーザー')).toBeDefined();
    });

    it('should tokenize a reference', () => {
      const lexer = new Lexer('Ref: orders.user_id > users.id');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.REF);
      expect(tokens[1].type).toBe(TokenType.COLON);
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('orders');
      expect(tokens[3].type).toBe(TokenType.DOT);
      expect(tokens[4].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[4].value).toBe('user_id');
      expect(tokens[5].type).toBe(TokenType.REF_GT);
      expect(tokens[6].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[6].value).toBe('users');
      expect(tokens[7].type).toBe(TokenType.DOT);
      expect(tokens[8].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[8].value).toBe('id');
    });

    it('should tokenize an area definition', () => {
      const lexer = new Lexer(`
        Area "マスタ" [color: "#3B82F6", pos_x: 50, pos_y: 100] {
          users
          profiles
        }
      `);
      const tokens = lexer.tokenize();

      expect(tokens.find(t => t.type === TokenType.AREA)).toBeDefined();
      expect(tokens.find(t => t.value === 'マスタ')).toBeDefined();
      expect(tokens.find(t => t.type === TokenType.COLOR)).toBeDefined();
    });
  });
});
