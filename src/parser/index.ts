/**
 * AIR-DML Parser
 *
 * Converts between AIR-DML text and Diagram object.
 * Uses a hand-written recursive descent parser (no external dependencies).
 *
 * @packageDocumentation
 */

// Re-export the new parser implementation
export {
  parseAirDML as parseAirDMLResult,
  exportToAirDML,
  Lexer,
  LexerError,
  Parser,
  ParseError,
  transformAstToDiagram,
} from './new';

import { parseAirDML as parseAirDMLNew } from './new';
import type { Diagram, ParseResult } from '../types';

/**
 * Parse AIR-DML text to Diagram object
 *
 * @param airDmlText - AIR-DML formatted text
 * @param diagramId - Optional diagram ID
 * @returns Diagram object
 * @throws Error if parsing fails
 *
 * @example
 * ```typescript
 * const diagram = parseAirDML(`
 *   Table users {
 *     id serial [pk]
 *     name varchar(100)
 *   }
 * `);
 * console.log(diagram.tables[0].name); // "users"
 * ```
 */
export function parseAirDML(airDmlText: string, diagramId?: string): Diagram {
  const result = parseAirDMLNew(airDmlText, { diagramId });

  if (!result.success || !result.diagram) {
    throw new Error(result.error || 'パースに失敗しました');
  }

  return result.diagram;
}

/**
 * Parse AIR-DML text and return ParseResult
 *
 * This is the recommended API for new code as it provides
 * error details and warnings.
 *
 * @param airDmlText - AIR-DML formatted text
 * @param diagramId - Optional diagram ID
 * @returns ParseResult with diagram, success flag, and any errors/warnings
 *
 * @example
 * ```typescript
 * const result = parseAirDMLSafe(`
 *   Table users {
 *     id serial [pk]
 *   }
 * `);
 * if (result.success) {
 *   console.log(result.diagram.tables);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function parseAirDMLSafe(
  airDmlText: string,
  diagramId?: string
): ParseResult {
  return parseAirDMLNew(airDmlText, { diagramId });
}
