/**
 * AIR-DML Lexer
 *
 * Tokenizes AIR-DML source text into a stream of tokens.
 * Supports:
 * - Japanese identifiers (Hiragana, Katakana, Kanji)
 * - Multi-character relationship operators (<>, ~)
 * - String literals with escapes (", ', `)
 * - Line comments (//)
 * - Position tracking for error messages
 */

import {
  Token,
  TokenType,
  SourcePosition,
  matchKeyword,
} from './tokens';

/**
 * Lexer error with position information
 */
export class LexerError extends Error {
  constructor(
    message: string,
    public readonly position: SourcePosition,
    public readonly source?: string
  ) {
    super(`[${position.line}:${position.column}] ${message}`);
    this.name = 'LexerError';
  }
}

/**
 * AIR-DML Lexer
 */
export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokenize the source and return all tokens
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  /**
   * Scan and add the next token
   */
  private scanToken(): void {
    this.skipWhitespace();
    if (this.isAtEnd()) return;

    const ch = this.peek();

    // Line comment
    if (ch === '/' && this.peekNext() === '/') {
      this.scanLineComment();
      return;
    }

    // String literals
    if (ch === '"') {
      this.scanString('"', TokenType.STRING);
      return;
    }
    if (ch === "'") {
      this.scanString("'", TokenType.SINGLE_STRING);
      return;
    }
    if (ch === '`') {
      this.scanString('`', TokenType.BACKTICK_STRING);
      return;
    }

    // Numbers
    if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peekNext()))) {
      this.scanNumber();
      return;
    }

    // Identifiers and keywords
    if (this.isIdentifierStart(ch)) {
      this.scanIdentifier();
      return;
    }

    // Symbols and operators
    this.scanSymbol();
  }

  /**
   * Skip whitespace (except newlines which are tokens)
   */
  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
      } else if (ch === '\n') {
        // Newlines: advance position and update line tracking
        this.advance();
        this.line++;
        this.column = 1;
        // We don't emit NEWLINE tokens to simplify parsing
        // The parser can use line info from other tokens if needed
      } else {
        break;
      }
    }
  }

  /**
   * Scan a line comment (// ...)
   */
  private scanLineComment(): void {
    const start = this.currentPosition();
    this.advance(); // /
    this.advance(); // /

    let value = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }

    this.addToken(TokenType.LINE_COMMENT, value.trim(), start);
  }

  /**
   * Scan a string literal
   */
  private scanString(quote: string, tokenType: TokenType): void {
    const start = this.currentPosition();
    this.advance(); // opening quote

    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        // Allow multi-line strings but track line numbers
        this.line++;
        this.column = 1;
        value += this.advance();
      } else if (this.peek() === '\\') {
        // Handle escape sequences
        this.advance(); // backslash
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '"': value += '"'; break;
            case "'": value += "'"; break;
            case '`': value += '`'; break;
            default: value += escaped; break;
          }
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError(
        '文字列が閉じられていません',
        start,
        this.source.slice(start.offset, Math.min(start.offset + 20, this.source.length))
      );
    }

    this.advance(); // closing quote
    this.addToken(tokenType, value, start);
  }

  /**
   * Scan a number (integer or decimal)
   */
  private scanNumber(): void {
    const start = this.currentPosition();
    let value = '';

    // Optional negative sign
    if (this.peek() === '-') {
      value += this.advance();
    }

    // Integer part
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.addToken(TokenType.NUMBER, value, start);
  }

  /**
   * Scan an identifier or keyword
   */
  private scanIdentifier(): void {
    const start = this.currentPosition();
    let value = '';

    while (!this.isAtEnd() && this.isIdentifierPart(this.peek())) {
      value += this.advance();
    }

    const tokenType = matchKeyword(value);
    this.addToken(tokenType, value, start);
  }

  /**
   * Scan a symbol or operator
   */
  private scanSymbol(): void {
    const start = this.currentPosition();
    const ch = this.advance();

    switch (ch) {
      case '{':
        this.addToken(TokenType.LBRACE, ch, start);
        break;
      case '}':
        this.addToken(TokenType.RBRACE, ch, start);
        break;
      case '[':
        this.addToken(TokenType.LBRACKET, ch, start);
        break;
      case ']':
        this.addToken(TokenType.RBRACKET, ch, start);
        break;
      case '(':
        this.addToken(TokenType.LPAREN, ch, start);
        break;
      case ')':
        this.addToken(TokenType.RPAREN, ch, start);
        break;
      case ':':
        this.addToken(TokenType.COLON, ch, start);
        break;
      case ',':
        this.addToken(TokenType.COMMA, ch, start);
        break;
      case '.':
        this.addToken(TokenType.DOT, ch, start);
        break;
      case '>':
        this.addToken(TokenType.REF_GT, ch, start);
        break;
      case '<':
        // Check for <>
        if (this.peek() === '>') {
          this.advance();
          this.addToken(TokenType.REF_LTGT, '<>', start);
        } else {
          this.addToken(TokenType.REF_LT, ch, start);
        }
        break;
      case '-':
        // Check if this is a negative number
        if (this.isDigit(this.peek())) {
          // Put back and let scanNumber handle it
          this.pos--;
          this.column--;
          this.scanNumber();
        } else {
          this.addToken(TokenType.REF_DASH, ch, start);
        }
        break;
      case '~':
        this.addToken(TokenType.REF_TILDE, ch, start);
        break;
      case '#':
        // Color literal: #RRGGBB or #RGB
        this.scanColorLiteral(start);
        break;
      default:
        throw new LexerError(
          `予期しない文字です: '${ch}'`,
          start
        );
    }
  }

  /**
   * Scan a color literal (#RRGGBB or #RGB)
   */
  private scanColorLiteral(start: SourcePosition): void {
    let value = '#';
    while (!this.isAtEnd() && this.isHexDigit(this.peek())) {
      value += this.advance();
    }

    // Validate length (# + 3 or 6 hex digits)
    if (value.length !== 4 && value.length !== 7) {
      throw new LexerError(
        `無効な色形式です: '${value}'。#RGB または #RRGGBB の形式で指定してください`,
        start
      );
    }

    // Treat color as a string token
    this.addToken(TokenType.STRING, value, start);
  }

  /**
   * Check if character is a valid identifier start
   * Supports: a-z, A-Z, _, and Japanese characters
   */
  private isIdentifierStart(ch: string): boolean {
    if (!ch) return false;
    const code = ch.charCodeAt(0);
    return (
      (code >= 65 && code <= 90) ||   // A-Z
      (code >= 97 && code <= 122) ||  // a-z
      code === 95 ||                   // _
      (code >= 0x3040 && code <= 0x309F) || // Hiragana
      (code >= 0x30A0 && code <= 0x30FF) || // Katakana
      (code >= 0x4E00 && code <= 0x9FFF) || // CJK Unified Ideographs
      (code >= 0x3400 && code <= 0x4DBF)    // CJK Extension A
    );
  }

  /**
   * Check if character is a valid identifier part
   */
  private isIdentifierPart(ch: string): boolean {
    if (!ch) return false;
    if (this.isIdentifierStart(ch)) return true;
    const code = ch.charCodeAt(0);
    return (code >= 48 && code <= 57); // 0-9
  }

  /**
   * Check if character is a digit
   */
  private isDigit(ch: string | undefined): boolean {
    if (!ch) return false;
    const code = ch.charCodeAt(0);
    return code >= 48 && code <= 57;
  }

  /**
   * Check if character is a hex digit
   */
  private isHexDigit(ch: string): boolean {
    if (!ch) return false;
    const code = ch.charCodeAt(0);
    return (
      (code >= 48 && code <= 57) ||  // 0-9
      (code >= 65 && code <= 70) ||  // A-F
      (code >= 97 && code <= 102)    // a-f
    );
  }

  /**
   * Check if at end of source
   */
  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  /**
   * Peek at current character without consuming
   */
  private peek(): string {
    if (this.isAtEnd()) return '';
    return this.source[this.pos];
  }

  /**
   * Peek at next character without consuming
   */
  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '';
    return this.source[this.pos + 1];
  }

  /**
   * Consume and return current character
   */
  private advance(): string {
    const ch = this.source[this.pos];
    this.pos++;
    this.column++;
    return ch;
  }

  /**
   * Get current source position
   */
  private currentPosition(): SourcePosition {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos,
    };
  }

  /**
   * Add a token to the token list
   */
  private addToken(type: TokenType, value: string, start?: SourcePosition): void {
    const tokenStart = start ?? this.currentPosition();
    const tokenEnd = this.currentPosition();

    this.tokens.push({
      type,
      value,
      start: tokenStart,
      end: tokenEnd,
    });
  }
}
