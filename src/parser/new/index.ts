/**
 * AIR-DML New Parser Public API
 *
 * This module provides the new independent AIR-DML parser implementation.
 * It replaces the @dbml/core dependency with a hand-written recursive descent parser.
 */

import { Lexer, LexerError } from './lexer';
import { Parser, ParseError } from './parser';
import { transformAstToDiagram, type TransformOptions } from './transformer';
import type { Diagram, ParseResult } from '../../types';

// Re-export types and classes
export { Lexer, LexerError } from './lexer';
export { Parser, ParseError } from './parser';
export { transformAstToDiagram, type TransformOptions } from './transformer';
export type * from './ast';
export type * from './tokens';

/**
 * Parse AIR-DML text to Diagram object
 *
 * @param airDmlText - AIR-DML formatted text
 * @param options - Parse options
 * @returns ParseResult with diagram and any errors/warnings
 */
export function parseAirDML(
  airDmlText: string,
  options: TransformOptions = {}
): ParseResult {
  try {
    // Step 1: Tokenize
    const lexer = new Lexer(airDmlText);
    const tokens = lexer.tokenize();

    // Step 2: Parse
    const parser = new Parser(tokens);
    const { ast, errors: parseErrors } = parser.parse();

    // Collect warnings from parse errors that aren't fatal
    const warnings = parseErrors.map(
      (err) => `[${err.position.line}:${err.position.column}] ${err.message}`
    );

    // Step 3: Transform to Diagram
    const diagram = transformAstToDiagram(ast, options);

    // Mark FK columns based on references
    markForeignKeyColumns(diagram);

    return {
      success: true,
      diagram,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    if (error instanceof LexerError) {
      return {
        success: false,
        error: `字句解析エラー: ${error.message}`,
      };
    }
    if (error instanceof ParseError) {
      return {
        success: false,
        error: `構文解析エラー: ${error.message}`,
      };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: `パースエラー: ${error.message}`,
      };
    }
    return {
      success: false,
      error: '不明なエラーが発生しました',
    };
  }
}

/**
 * Mark columns as FK based on reference definitions
 */
function markForeignKeyColumns(diagram: Diagram): void {
  for (const ref of diagram.references) {
    const fromTable = diagram.tables.find((t) => t.id === ref.fromTable);
    if (fromTable) {
      const fromColumn = fromTable.columns.find(
        (c) => c.name === ref.fromColumn
      );
      if (fromColumn) {
        fromColumn.fk = true;
      }
    }
  }
}

/**
 * Export Diagram to AIR-DML text
 *
 * @param diagram - Diagram object
 * @returns AIR-DML formatted text
 */
export function exportToAirDML(diagram: Diagram): string {
  let airDml = '';

  // Helper function to format leading comments
  const formatComments = (comments?: string[]): string => {
    if (!comments || comments.length === 0) return '';
    return comments.map((c) => `// ${c}\n`).join('');
  };

  // Project header
  airDml += `// ${diagram.name}\n`;
  const projectName = diagram.project || diagram.name || 'Untitled';
  airDml += `Project ${escapeIdentifier(projectName)} {\n`;
  airDml += `  database_type: '${diagram.database || 'PostgreSQL'}'\n`;
  if (diagram.note) {
    airDml += `  Note: "${escapeString(diagram.note)}"\n`;
  }
  airDml += `}\n\n`;

  // Tables
  diagram.tables.forEach((table) => {
    airDml += formatComments(table.leadingComments);
    const tableAttrs: string[] = [];

    if (table.logicalName) {
      tableAttrs.push(`alias: "${escapeString(table.logicalName)}"`);
    }

    if (table.pos) {
      tableAttrs.push(`pos_x: ${table.pos.x}`);
      tableAttrs.push(`pos_y: ${table.pos.y}`);
    }

    if (table.color) {
      tableAttrs.push(`color: "${table.color}"`);
    }

    const attrStr = tableAttrs.length > 0 ? ` [${tableAttrs.join(', ')}]` : '';
    airDml += `Table ${escapeIdentifier(table.name)}${attrStr} {\n`;

    // Columns
    table.columns.forEach((column) => {
      airDml += formatComments(column.leadingComments);
      const constraints: string[] = [];
      if (column.pk) constraints.push('pk');
      if (column.fk) constraints.push('fk');
      if (column.unique) constraints.push('unique');
      if (column.notNull) constraints.push('not null');
      if (column.increment) constraints.push('increment');
      if (column.default) constraints.push(`default: ${formatDefaultValue(column.default)}`);

      if (column.logicalName) {
        constraints.push(`alias: "${escapeString(column.logicalName)}"`);
      }

      if (column.note) {
        constraints.push(`note: "${escapeString(column.note)}"`);
      }

      const typeStr = column.typeParams
        ? `${column.type}(${column.typeParams})`
        : column.type;

      const constraintStr =
        constraints.length > 0 ? ` [${constraints.join(', ')}]` : '';

      airDml += `  ${escapeIdentifier(column.name)} ${typeStr}${constraintStr}\n`;
    });

    if (table.note) {
      airDml += `\n  Note: "${escapeString(table.note)}"\n`;
    }

    airDml += `}\n\n`;
  });

  // References
  diagram.references.forEach((ref) => {
    airDml += formatComments(ref.leadingComments);

    const fromTable = diagram.tables.find((t) => t.id === ref.fromTable);
    const toTable = diagram.tables.find((t) => t.id === ref.toTable);

    if (fromTable && toTable) {
      const relSymbol = getRelationshipSymbol(ref.type);

      const refAttrs: string[] = [];
      if (ref.swapEdge) {
        refAttrs.push('swapEdge: true');
      }
      if (ref.note) {
        refAttrs.push(`note: "${escapeString(ref.note)}"`);
      }
      const attrStr = refAttrs.length > 0 ? ` [${refAttrs.join(', ')}]` : '';

      airDml += `Ref: ${escapeIdentifier(fromTable.name)}.${escapeIdentifier(ref.fromColumn)} ${relSymbol} ${escapeIdentifier(toTable.name)}.${escapeIdentifier(ref.toColumn)}${attrStr}\n`;
    }
  });

  airDml += '\n';

  // Areas
  if (diagram.areas && diagram.areas.length > 0) {
    diagram.areas.forEach((area) => {
      airDml += formatComments(area.leadingComments);

      const tablesInArea = diagram.tables.filter((t) =>
        t.areaIds?.includes(area.id)
      );
      const tableNames = tablesInArea.map((table) =>
        escapeIdentifier(table.name)
      );

      if (tableNames.length > 0 || area.commonColumns?.length || area.note) {
        const areaAttrs: string[] = [];
        if (area.pos) {
          areaAttrs.push(`pos_x: ${area.pos.x}`);
          areaAttrs.push(`pos_y: ${area.pos.y}`);
        }
        if (area.width) {
          areaAttrs.push(`width: ${area.width}`);
        }
        if (area.height) {
          areaAttrs.push(`height: ${area.height}`);
        }
        if (area.color) {
          areaAttrs.push(`color: "${area.color}"`);
        }
        if (area.labelHorizontal) {
          areaAttrs.push(`labelHorizontal: "${area.labelHorizontal}"`);
        }
        if (area.labelVertical) {
          areaAttrs.push(`labelVertical: "${area.labelVertical}"`);
        }

        const attrStr =
          areaAttrs.length > 0 ? ` [${areaAttrs.join(', ')}]` : '';
        airDml += `Area "${escapeString(area.name)}"${attrStr} {\n`;

        tableNames.forEach((name) => {
          airDml += `  ${name}\n`;
        });

        // Export database_type
        if (area.databaseType) {
          airDml += `\n  database_type: "${area.databaseType}"\n`;
        }

        // Export CommonColumns
        if (area.commonColumns && area.commonColumns.length > 0) {
          airDml += `\n  CommonColumns: [\n`;
          area.commonColumns.forEach((column) => {
            const constraints: string[] = [];
            if (column.pk) constraints.push('pk');
            if (column.fk) constraints.push('fk');
            if (column.unique) constraints.push('unique');
            if (column.notNull) constraints.push('not null');
            if (column.increment) constraints.push('increment');
            if (column.default) constraints.push(`default: ${formatDefaultValue(column.default)}`);

            if (column.logicalName) {
              constraints.push(`alias: "${escapeString(column.logicalName)}"`);
            }

            const typeStr = column.typeParams
              ? `${column.type}(${column.typeParams})`
              : column.type;

            const constraintStr =
              constraints.length > 0 ? ` [${constraints.join(', ')}]` : '';

            airDml += `    ${escapeIdentifier(column.name)} ${typeStr}${constraintStr}\n`;
          });
          airDml += `  ]\n`;
        }

        // Export Note
        if (area.note) {
          airDml += `\n  Note: "${escapeString(area.note)}"\n`;
        }

        airDml += `}\n\n`;
      }
    });
  }

  return airDml.trim();
}

// ===== Helper Functions =====

function getRelationshipSymbol(relType?: string): string {
  switch (relType) {
    case 'many-to-one':
      return '>';
    case 'one-to-many':
      return '<';
    case 'one-to-one':
      return '-';
    case 'many-to-many':
      return '<>';
    case 'any':
    case 'ai-inferred':
      return '~';
    default:
      return '>';
  }
}

function escapeIdentifier(name: string): string {
  if (/[^a-zA-Z0-9_]/.test(name)) {
    return `"${name.replace(/"/g, '\\"')}"`;
  }
  return name;
}

function escapeString(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function formatDefaultValue(value: string): string {
  // If it looks like a function call (contains parentheses), wrap in backticks
  if (value.includes('(') && value.includes(')')) {
    return `\`${value}\``;
  }
  // If it's a number or boolean, leave as-is
  if (/^-?\d+(\.\d+)?$/.test(value) || value === 'true' || value === 'false' || value === 'null') {
    return value;
  }
  // Otherwise, it's a string - wrap in single quotes
  return `'${value}'`;
}
