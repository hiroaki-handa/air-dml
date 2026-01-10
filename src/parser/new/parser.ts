/**
 * AIR-DML Parser
 *
 * Recursive descent parser for AIR-DML syntax.
 * Produces an AST from a token stream.
 */

import type { Token, SourcePosition } from './tokens';
import { TokenType } from './tokens';
import type {
  ProgramNode,
  ProjectNode,
  ProjectSettings,
  TableNode,
  TableSettings,
  ColumnNode,
  ColumnConstraints,
  RefNode,
  RefEndpoint,
  RefSettings,
  AreaNode,
  AreaSettings,
  IndexNode,
  IndexSettings,
} from './ast';

/**
 * Parse error with position information
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly position: SourcePosition,
    public readonly code: string
  ) {
    super(`[${position.line}:${position.column}] ${message}`);
    this.name = 'ParseError';
  }
}

/**
 * AIR-DML Parser
 */
export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];
  private pendingComments: string[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse tokens and return AST with any errors
   */
  parse(): { ast: ProgramNode; errors: ParseError[] } {
    this.pos = 0;
    this.errors = [];
    this.pendingComments = [];

    const ast = this.parseProgram();
    return { ast, errors: this.errors };
  }

  // ============================================
  // Program (top-level)
  // ============================================

  private parseProgram(): ProgramNode {
    const start = this.currentPosition();
    let project: ProjectNode | undefined;
    const tables: TableNode[] = [];
    const refs: RefNode[] = [];
    const areas: AreaNode[] = [];

    while (!this.isAtEnd()) {
      // Collect comments
      this.collectComments();

      if (this.isAtEnd()) break;

      try {
        // Consume pending comments before parsing each top-level element
        const leadingComments = this.consumePendingComments();

        if (this.check(TokenType.PROJECT)) {
          project = this.parseProject();
          if (leadingComments.length > 0) {
            project.leadingComments = leadingComments;
          }
        } else if (this.check(TokenType.TABLE)) {
          const table = this.parseTable();
          if (leadingComments.length > 0) {
            table.leadingComments = leadingComments;
          }
          tables.push(table);
        } else if (this.check(TokenType.REF)) {
          const ref = this.parseRef();
          if (leadingComments.length > 0) {
            ref.leadingComments = leadingComments;
          }
          refs.push(ref);
        } else if (this.check(TokenType.AREA)) {
          const area = this.parseArea();
          if (leadingComments.length > 0) {
            area.leadingComments = leadingComments;
          }
          areas.push(area);
        } else if (this.check(TokenType.EOF)) {
          break;
        } else {
          // Unknown token - skip and report error
          const token = this.peek();
          this.error(
            `予期しないトークンです: '${token.value}'`,
            'UNEXPECTED_TOKEN'
          );
          this.advance();
        }
      } catch (e) {
        // Recover from errors by skipping to next sync point
        if (e instanceof ParseError) {
          this.errors.push(e);
          this.synchronize();
        } else {
          throw e;
        }
      }
    }

    return {
      kind: 'Program',
      range: { start, end: this.currentPosition() },
      project,
      tables,
      refs,
      areas,
    };
  }

  // ============================================
  // Project
  // ============================================

  private parseProject(): ProjectNode {
    const start = this.currentPosition();
    this.expect(TokenType.PROJECT);

    const name = this.parseNameOrString();
    const settings = this.parseProjectBody();

    return {
      kind: 'Project',
      range: { start, end: this.currentPosition() },
      name,
      settings,
    };
  }

  private parseProjectBody(): ProjectSettings {
    const settings: ProjectSettings = {};

    if (!this.check(TokenType.LBRACE)) {
      return settings;
    }

    this.advance(); // {

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.collectComments();
      if (this.check(TokenType.RBRACE)) break;

      if (this.check(TokenType.DATABASE_TYPE)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.databaseType = this.parseStringValue();
      } else if (this.check(TokenType.NOTE)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.note = this.parseStringValue();
      } else {
        // Skip unknown settings
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);
    return settings;
  }

  // ============================================
  // Table
  // ============================================

  private parseTable(): TableNode {
    const start = this.currentPosition();
    this.expect(TokenType.TABLE);

    const name = this.parseIdentifier();
    const settings = this.parseTableSettings();
    const { columns, indexes, note } = this.parseTableBody();

    return {
      kind: 'Table',
      range: { start, end: this.currentPosition() },
      name,
      columns,
      indexes: indexes.length > 0 ? indexes : undefined,
      settings,
      note,
    };
  }

  private parseTableSettings(): TableSettings {
    const settings: TableSettings = {};

    if (!this.check(TokenType.LBRACKET)) {
      return settings;
    }

    this.advance(); // [

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.check(TokenType.ALIAS)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.alias = this.parseStringValue();
      } else if (this.check(TokenType.POS_X)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.posX = this.parseNumberValue();
      } else if (this.check(TokenType.POS_Y)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.posY = this.parseNumberValue();
      } else if (this.check(TokenType.COLOR)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.color = this.parseStringValue();
      } else if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        // Skip unknown attributes
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return settings;
  }

  private parseTableBody(): {
    columns: ColumnNode[];
    indexes: IndexNode[];
    note?: string;
  } {
    const columns: ColumnNode[] = [];
    const indexes: IndexNode[] = [];
    let note: string | undefined;

    this.expect(TokenType.LBRACE);

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.collectComments();
      if (this.check(TokenType.RBRACE)) break;

      // Check for top-level keywords that indicate we've hit a new definition
      // This means the table body was not properly closed
      if (this.isTopLevelKeyword()) {
        this.error(
          'テーブル定義が閉じられていません。"}" が必要です',
          'UNCLOSED_TABLE'
        );
        break;
      }

      if (this.check(TokenType.INDEXES)) {
        const parsedIndexes = this.parseIndexes();
        indexes.push(...parsedIndexes);
      } else if (this.check(TokenType.NOTE)) {
        note = this.parseInlineNote();
      } else if (this.isColumnIdentifier()) {
        const leadingComments = this.consumePendingComments();
        const column = this.parseColumn();
        if (leadingComments.length > 0) {
          column.leadingComments = leadingComments;
        }
        columns.push(column);
      } else {
        // Skip unknown content
        this.advance();
      }
    }

    // Only consume RBRACE if present
    if (this.check(TokenType.RBRACE)) {
      this.advance();
    }
    return { columns, indexes, note };
  }

  private isTopLevelKeyword(): boolean {
    const type = this.peek().type;
    return (
      type === TokenType.PROJECT ||
      type === TokenType.TABLE ||
      type === TokenType.REF ||
      type === TokenType.AREA
    );
  }

  private isColumnIdentifier(): boolean {
    const token = this.peek();
    // Identifiers and strings can be column names
    // But top-level keywords cannot
    if (token.type === TokenType.IDENTIFIER || token.type === TokenType.STRING) {
      return true;
    }
    // Some keywords can be column names (like "name", "note" as column name, etc.)
    // But not top-level keywords
    if (this.isKeyword(token.type) && !this.isTopLevelKeyword()) {
      return true;
    }
    return false;
  }

  // ============================================
  // Column
  // ============================================

  private parseColumn(): ColumnNode {
    const start = this.currentPosition();

    // Column name
    const name = this.parseIdentifier();

    // Type
    const { type, typeParams } = this.parseColumnType();

    // Constraints [...]
    const constraints = this.parseColumnConstraints();

    return {
      kind: 'Column',
      range: { start, end: this.currentPosition() },
      name,
      type,
      typeParams,
      constraints,
    };
  }

  private parseColumnType(): { type: string; typeParams?: string } {
    const type = this.parseIdentifier();

    // Type parameters (n) or (m,n)
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      let params = '';
      while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
        const token = this.advance();
        params += token.value;
      }
      this.expect(TokenType.RPAREN);
      return { type, typeParams: params };
    }

    return { type };
  }

  private parseColumnConstraints(): ColumnConstraints {
    const constraints: ColumnConstraints = {};

    if (!this.check(TokenType.LBRACKET)) {
      return constraints;
    }

    this.advance(); // [

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.check(TokenType.PK)) {
        this.advance();
        constraints.pk = true;
      } else if (this.check(TokenType.FK)) {
        this.advance();
        constraints.fk = true;
      } else if (this.check(TokenType.UNIQUE)) {
        this.advance();
        constraints.unique = true;
      } else if (this.check(TokenType.NOT)) {
        this.advance();
        if (this.check(TokenType.NULL)) {
          this.advance();
        }
        constraints.notNull = true;
      } else if (this.check(TokenType.NULL)) {
        // Just "null" without "not" - skip
        this.advance();
      } else if (this.check(TokenType.INCREMENT)) {
        this.advance();
        constraints.increment = true;
      } else if (this.check(TokenType.DEFAULT)) {
        this.advance();
        this.expect(TokenType.COLON);
        const { value, type } = this.parseDefaultValue();
        constraints.default = value;
        constraints.defaultType = type;
      } else if (this.check(TokenType.ALIAS)) {
        this.advance();
        this.expect(TokenType.COLON);
        constraints.alias = this.parseStringValue();
      } else if (this.check(TokenType.NOTE)) {
        this.advance();
        this.expect(TokenType.COLON);
        constraints.note = this.parseStringValue();
      } else if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        // Skip unknown constraints
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return constraints;
  }

  private parseDefaultValue(): { value: string; type: 'string' | 'function' | 'value' } {
    const token = this.peek();

    if (token.type === TokenType.SINGLE_STRING) {
      this.advance();
      return { value: `'${token.value}'`, type: 'string' };
    } else if (token.type === TokenType.STRING) {
      this.advance();
      return { value: `"${token.value}"`, type: 'string' };
    } else if (token.type === TokenType.BACKTICK_STRING) {
      this.advance();
      return { value: `\`${token.value}\``, type: 'function' };
    } else if (token.type === TokenType.NUMBER) {
      this.advance();
      return { value: token.value, type: 'value' };
    } else if (token.type === TokenType.IDENTIFIER) {
      // Unquoted value like true, false, null
      this.advance();
      return { value: token.value, type: 'value' };
    }

    // Fallback
    this.advance();
    return { value: token.value, type: 'value' };
  }

  // ============================================
  // Reference
  // ============================================

  private parseRef(): RefNode {
    const start = this.currentPosition();
    this.expect(TokenType.REF);

    // Optional name: Ref name: ...
    let name: string | undefined;
    if (this.check(TokenType.IDENTIFIER) && this.peekNext()?.type === TokenType.COLON) {
      name = this.parseIdentifier();
    }

    this.expect(TokenType.COLON);

    const from = this.parseRefEndpoint();
    const relationType = this.parseRelationType();
    const to = this.parseRefEndpoint();
    const settings = this.parseRefSettings();

    return {
      kind: 'Ref',
      range: { start, end: this.currentPosition() },
      name,
      from,
      to,
      relationType,
      settings,
    };
  }

  private parseRefEndpoint(): RefEndpoint {
    const table = this.parseIdentifier();
    this.expect(TokenType.DOT);
    const column = this.parseIdentifier();
    return { table, column };
  }

  private parseRelationType(): '>' | '<' | '-' | '<>' | '~' {
    if (this.check(TokenType.REF_GT)) {
      this.advance();
      return '>';
    }
    if (this.check(TokenType.REF_LT)) {
      this.advance();
      return '<';
    }
    if (this.check(TokenType.REF_LTGT)) {
      this.advance();
      return '<>';
    }
    if (this.check(TokenType.REF_DASH)) {
      this.advance();
      return '-';
    }
    if (this.check(TokenType.REF_TILDE)) {
      this.advance();
      return '~';
    }

    this.error(
      'リレーション演算子が必要です（>, <, -, <>, ~）',
      'EXPECTED_REF_OPERATOR'
    );
    return '>';
  }

  private parseRefSettings(): RefSettings {
    const settings: RefSettings = {};

    if (!this.check(TokenType.LBRACKET)) {
      return settings;
    }

    this.advance(); // [

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.check(TokenType.SWAP_EDGE)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.swapEdge = this.parseBooleanValue();
      } else if (this.check(TokenType.NOTE)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.note = this.parseStringValue();
      } else if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return settings;
  }

  // ============================================
  // Area (AIR-DML specific)
  // ============================================

  private parseArea(): AreaNode {
    const start = this.currentPosition();
    this.expect(TokenType.AREA);

    const name = this.parseStringValue();
    const settings = this.parseAreaSettings();
    const { tables, commonColumns, note } = this.parseAreaBody();

    return {
      kind: 'Area',
      range: { start, end: this.currentPosition() },
      name,
      tables,
      settings,
      commonColumns: commonColumns.length > 0 ? commonColumns : undefined,
      note,
    };
  }

  private parseAreaSettings(): AreaSettings {
    const settings: AreaSettings = {};

    if (!this.check(TokenType.LBRACKET)) {
      return settings;
    }

    this.advance(); // [

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.check(TokenType.POS_X)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.posX = this.parseNumberValue();
      } else if (this.check(TokenType.POS_Y)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.posY = this.parseNumberValue();
      } else if (this.check(TokenType.WIDTH)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.width = this.parseNumberValue();
      } else if (this.check(TokenType.HEIGHT)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.height = this.parseNumberValue();
      } else if (this.check(TokenType.COLOR)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.color = this.parseStringValue();
      } else if (this.check(TokenType.DATABASE_TYPE)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.databaseType = this.parseStringValue();
      } else if (this.check(TokenType.LABEL_HORIZONTAL)) {
        this.advance();
        this.expect(TokenType.COLON);
        const val = this.parseStringValue();
        if (val === 'left' || val === 'center' || val === 'right') {
          settings.labelHorizontal = val;
        }
      } else if (this.check(TokenType.LABEL_VERTICAL)) {
        this.advance();
        this.expect(TokenType.COLON);
        const val = this.parseStringValue();
        if (val === 'top' || val === 'center' || val === 'bottom') {
          settings.labelVertical = val;
        }
      } else if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return settings;
  }

  private parseAreaBody(): {
    tables: string[];
    commonColumns: ColumnNode[];
    note?: string;
  } {
    const tables: string[] = [];
    const commonColumns: ColumnNode[] = [];
    let note: string | undefined;

    this.expect(TokenType.LBRACE);

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.collectComments();
      if (this.check(TokenType.RBRACE)) break;

      if (this.check(TokenType.COMMON_COLUMNS)) {
        const cols = this.parseCommonColumns();
        commonColumns.push(...cols);
      } else if (this.check(TokenType.NOTE)) {
        note = this.parseInlineNote();
      } else if (this.isIdentifierLike()) {
        // Table name reference
        tables.push(this.parseIdentifier());
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);
    return { tables, commonColumns, note };
  }

  private parseCommonColumns(): ColumnNode[] {
    const columns: ColumnNode[] = [];

    this.expect(TokenType.COMMON_COLUMNS);
    this.expect(TokenType.COLON);
    this.expect(TokenType.LBRACKET);

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      this.collectComments();
      if (this.check(TokenType.RBRACKET)) break;

      if (this.isIdentifierLike()) {
        const column = this.parseColumn();
        this.attachComments(column);
        columns.push(column);
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return columns;
  }

  // ============================================
  // Indexes
  // ============================================

  private parseIndexes(): IndexNode[] {
    const indexes: IndexNode[] = [];

    this.expect(TokenType.INDEXES);
    this.expect(TokenType.LBRACE);

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      this.collectComments();
      if (this.check(TokenType.RBRACE)) break;

      if (this.check(TokenType.LPAREN) || this.isIdentifierLike()) {
        const index = this.parseIndex();
        this.attachComments(index);
        indexes.push(index);
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);
    return indexes;
  }

  private parseIndex(): IndexNode {
    const start = this.currentPosition();
    const columns: string[] = [];

    // Single column or composite (col1, col2)
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
        if (this.isIdentifierLike()) {
          columns.push(this.parseIdentifier());
        }
        if (this.check(TokenType.COMMA)) {
          this.advance();
        }
      }
      this.expect(TokenType.RPAREN);
    } else {
      columns.push(this.parseIdentifier());
    }

    const settings = this.parseIndexSettings();

    return {
      kind: 'Index',
      range: { start, end: this.currentPosition() },
      columns,
      settings,
    };
  }

  private parseIndexSettings(): IndexSettings {
    const settings: IndexSettings = {};

    if (!this.check(TokenType.LBRACKET)) {
      return settings;
    }

    this.advance(); // [

    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.check(TokenType.UNIQUE)) {
        this.advance();
        settings.unique = true;
      } else if (this.check(TokenType.PK)) {
        this.advance();
        settings.pk = true;
      } else if (this.check(TokenType.NAME)) {
        this.advance();
        this.expect(TokenType.COLON);
        settings.name = this.parseStringValue();
      } else if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);
    return settings;
  }

  // ============================================
  // Inline Note
  // ============================================

  private parseInlineNote(): string {
    this.expect(TokenType.NOTE);
    this.expect(TokenType.COLON);
    return this.parseStringValue();
  }

  // ============================================
  // Helper methods
  // ============================================

  private parseIdentifier(): string {
    const token = this.peek();
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return token.value;
    }
    if (token.type === TokenType.STRING) {
      this.advance();
      return token.value;
    }
    // Keywords can also be identifiers in some contexts
    if (this.isKeyword(token.type)) {
      this.advance();
      return token.value;
    }

    this.error('識別子が必要です', 'EXPECTED_IDENTIFIER');
    return '';
  }

  private parseNameOrString(): string {
    const token = this.peek();
    if (token.type === TokenType.STRING) {
      this.advance();
      return token.value;
    }
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return token.value;
    }

    this.error('名前または文字列が必要です', 'EXPECTED_NAME');
    return '';
  }

  private parseStringValue(): string {
    const token = this.peek();
    if (
      token.type === TokenType.STRING ||
      token.type === TokenType.SINGLE_STRING ||
      token.type === TokenType.BACKTICK_STRING
    ) {
      this.advance();
      return token.value;
    }
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return token.value;
    }

    this.error('文字列が必要です', 'EXPECTED_STRING');
    return '';
  }

  private parseNumberValue(): number {
    const token = this.peek();
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return parseFloat(token.value);
    }

    this.error('数値が必要です', 'EXPECTED_NUMBER');
    return 0;
  }

  private parseBooleanValue(): boolean {
    const token = this.peek();
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return token.value.toLowerCase() === 'true';
    }
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return token.value !== '0';
    }

    this.advance();
    return false;
  }

  private isIdentifierLike(): boolean {
    const token = this.peek();
    return (
      token.type === TokenType.IDENTIFIER ||
      token.type === TokenType.STRING ||
      this.isKeyword(token.type)
    );
  }

  private isKeyword(type: TokenType): boolean {
    return [
      TokenType.PROJECT,
      TokenType.TABLE,
      TokenType.AREA,
      TokenType.REF,
      TokenType.NOTE,
      TokenType.INDEXES,
      TokenType.PK,
      TokenType.FK,
      TokenType.UNIQUE,
      TokenType.NOT,
      TokenType.NULL,
      TokenType.INCREMENT,
      TokenType.DEFAULT,
      TokenType.ALIAS,
      TokenType.NAME,
    ].includes(type);
  }

  // ============================================
  // Token navigation
  // ============================================

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private peekNext(): Token | undefined {
    return this.tokens[this.pos + 1];
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    if (!this.isAtEnd()) {
      this.pos++;
    }
    return token;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private expect(type: TokenType): Token {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.peek();
    const expected = this.tokenTypeName(type);
    this.error(
      `'${expected}' が必要ですが、'${token.value}' が見つかりました`,
      'UNEXPECTED_TOKEN'
    );

    // Return a dummy token to continue parsing
    return token;
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private currentPosition(): SourcePosition {
    return this.peek().start;
  }

  // ============================================
  // Comments
  // ============================================

  private collectComments(): void {
    while (this.check(TokenType.LINE_COMMENT)) {
      this.pendingComments.push(this.advance().value);
    }
  }

  private consumePendingComments(): string[] {
    const comments = [...this.pendingComments];
    this.pendingComments = [];
    return comments;
  }

  private attachComments(node: { leadingComments?: string[] }): void {
    if (this.pendingComments.length > 0) {
      node.leadingComments = [...this.pendingComments];
      this.pendingComments = [];
    }
  }

  // ============================================
  // Error handling
  // ============================================

  private error(message: string, code: string): never {
    throw new ParseError(message, this.currentPosition(), code);
  }

  private synchronize(): void {
    // Skip tokens until we find a sync point
    while (!this.isAtEnd()) {
      const type = this.peek().type;
      // RBRACE is consumed to avoid infinite loops
      if (type === TokenType.RBRACE) {
        this.advance();
        return;
      }
      // For other sync points, don't consume - let the parser handle them
      if (
        type === TokenType.PROJECT ||
        type === TokenType.TABLE ||
        type === TokenType.REF ||
        type === TokenType.AREA
      ) {
        return;
      }
      this.advance();
    }
  }

  private tokenTypeName(type: TokenType): string {
    const names: Partial<Record<TokenType, string>> = {
      [TokenType.LBRACE]: '{',
      [TokenType.RBRACE]: '}',
      [TokenType.LBRACKET]: '[',
      [TokenType.RBRACKET]: ']',
      [TokenType.LPAREN]: '(',
      [TokenType.RPAREN]: ')',
      [TokenType.COLON]: ':',
      [TokenType.COMMA]: ',',
      [TokenType.DOT]: '.',
    };
    return names[type] ?? type;
  }
}
