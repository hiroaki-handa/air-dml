/**
 * AIR-DML Token Definitions
 *
 * Defines all token types used by the AIR-DML lexer.
 */

/**
 * Token types for AIR-DML lexer
 */
export enum TokenType {
  // Keywords
  PROJECT = 'PROJECT',
  TABLE = 'TABLE',
  AREA = 'AREA',
  REF = 'REF',
  NOTE = 'NOTE',
  INDEXES = 'INDEXES',
  COMMON_COLUMNS = 'COMMON_COLUMNS',

  // Constraint keywords
  PK = 'PK',
  FK = 'FK',
  UNIQUE = 'UNIQUE',
  NOT = 'NOT',
  NULL = 'NULL',
  INCREMENT = 'INCREMENT',
  DEFAULT = 'DEFAULT',

  // Attribute keywords
  ALIAS = 'ALIAS',
  POS_X = 'POS_X',
  POS_Y = 'POS_Y',
  WIDTH = 'WIDTH',
  HEIGHT = 'HEIGHT',
  COLOR = 'COLOR',
  SWAP_EDGE = 'SWAP_EDGE',
  DATABASE_TYPE = 'DATABASE_TYPE',
  LABEL_HORIZONTAL = 'LABEL_HORIZONTAL',
  LABEL_VERTICAL = 'LABEL_VERTICAL',
  NAME = 'NAME',

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',           // "..." (double-quoted)
  SINGLE_STRING = 'SINGLE_STRING', // '...' (single-quoted)
  BACKTICK_STRING = 'BACKTICK_STRING', // `...` (backtick)
  NUMBER = 'NUMBER',

  // Symbols
  LBRACE = 'LBRACE',           // {
  RBRACE = 'RBRACE',           // }
  LBRACKET = 'LBRACKET',       // [
  RBRACKET = 'RBRACKET',       // ]
  LPAREN = 'LPAREN',           // (
  RPAREN = 'RPAREN',           // )
  COLON = 'COLON',             // :
  COMMA = 'COMMA',             // ,
  DOT = 'DOT',                 // .

  // Relationship operators
  REF_GT = 'REF_GT',           // > (many-to-one)
  REF_LT = 'REF_LT',           // < (one-to-many)
  REF_DASH = 'REF_DASH',       // - (one-to-one)
  REF_LTGT = 'REF_LTGT',       // <> (many-to-many)
  REF_TILDE = 'REF_TILDE',     // ~ (ai-inferred)

  // Comments
  LINE_COMMENT = 'LINE_COMMENT',

  // Control
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

/**
 * Source position information
 */
export interface SourcePosition {
  /** 1-indexed line number */
  line: number;
  /** 1-indexed column number */
  column: number;
  /** 0-indexed byte offset from start of source */
  offset: number;
}

/**
 * Token produced by the lexer
 */
export interface Token {
  /** Token type */
  type: TokenType;
  /** Raw token value */
  value: string;
  /** Start position in source */
  start: SourcePosition;
  /** End position in source */
  end: SourcePosition;
}

/**
 * Keyword mapping (case-insensitive)
 */
export const KEYWORDS: Record<string, TokenType> = {
  // Main keywords
  'project': TokenType.PROJECT,
  'table': TokenType.TABLE,
  'area': TokenType.AREA,
  'ref': TokenType.REF,
  'note': TokenType.NOTE,
  'indexes': TokenType.INDEXES,
  'commoncolumns': TokenType.COMMON_COLUMNS,

  // Constraints
  'pk': TokenType.PK,
  'fk': TokenType.FK,
  'unique': TokenType.UNIQUE,
  'not': TokenType.NOT,
  'null': TokenType.NULL,
  'increment': TokenType.INCREMENT,
  'default': TokenType.DEFAULT,

  // Attributes
  'alias': TokenType.ALIAS,
  'pos_x': TokenType.POS_X,
  'pos_y': TokenType.POS_Y,
  'width': TokenType.WIDTH,
  'height': TokenType.HEIGHT,
  'color': TokenType.COLOR,
  'swap_edge': TokenType.SWAP_EDGE,
  'swapedge': TokenType.SWAP_EDGE,
  'database_type': TokenType.DATABASE_TYPE,
  'labelhorizontal': TokenType.LABEL_HORIZONTAL,
  'label_horizontal': TokenType.LABEL_HORIZONTAL,
  'labelvertical': TokenType.LABEL_VERTICAL,
  'label_vertical': TokenType.LABEL_VERTICAL,
  'name': TokenType.NAME,
};

/**
 * Check if a string is a keyword and return its token type
 */
export function matchKeyword(value: string): TokenType {
  const lower = value.toLowerCase();
  return KEYWORDS[lower] ?? TokenType.IDENTIFIER;
}
