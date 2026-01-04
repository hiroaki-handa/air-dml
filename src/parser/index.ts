/**
 * AIR-DML Parser
 * Converts between AIR-DML text and Diagram object
 * Extends standard DBML with AI-ready features
 */

import { Parser } from '@dbml/core';
import type {
  Diagram,
  Table,
  Column,
  Reference,
  Area,
  DataType,
  RelationshipType,
} from '../types';

/**
 * Custom attributes parsed from AIR-DML extensions
 */
interface ParsedAttributes {
  alias?: string;
  pos_x?: number;
  pos_y?: number;
  width?: number;
  height?: number;
  color?: string;
  database_type?: string;
  label_horizontal?: string;
  label_vertical?: string;
  note?: string;
  swap_edge?: boolean;
  fk?: boolean;
}

/**
 * Parse AIR-DML text to Diagram object
 * @param airDmlText - AIR-DML formatted text
 * @param diagramId - Optional diagram ID
 * @returns Diagram object
 */
export function parseAirDML(airDmlText: string, diagramId?: string): Diagram {
  // Parse comments from raw text FIRST
  const commentMap = parseComments(airDmlText);

  // Parse AIR-DML custom attributes from raw text BEFORE cleaning
  const tableAttributes = parseTableAttributes(airDmlText);
  const columnAttributes = parseColumnAttributes(airDmlText);
  const referenceAttributes = parseReferenceAttributes(airDmlText);

  // Remove extended attributes for standard DBML parser
  const cleanedDbml = removeExtendedAttributes(airDmlText);

  // Parse with standard DBML parser
  const parser = new Parser();
  const database = parser.parse(cleanedDbml, 'dbml');

  // Extract project name and database type
  const project = database.name || 'Untitled Project';
  const databaseType = database.databaseType || 'PostgreSQL';

  // Parse tables
  const tables: Table[] = database.schemas.flatMap((schema) =>
    schema.tables.map((dbmlTable) => {
      const tableAttrs = tableAttributes.get(dbmlTable.name) || {};

      const columns: Column[] = dbmlTable.fields.map((field) => {
        const colAttrs = columnAttributes.get(`${dbmlTable.name}.${field.name}`) || {};

        return {
          name: field.name,
          logicalName: colAttrs.alias,
          type: mapDbmlTypeToDataType(field.type.type_name),
          typeParams: Array.isArray(field.type.args) ? field.type.args.join(', ') : undefined,
          pk: field.pk || false,
          fk: colAttrs.fk || false,
          unique: field.unique || false,
          notNull: field.not_null || false,
          default: field.dbdefault?.value,
          increment: field.increment || false,
          note: field.note,
        };
      });

      return {
        id: `table-${dbmlTable.name}`,
        name: dbmlTable.name,
        logicalName: tableAttrs.alias,
        columns,
        color: tableAttrs.color,
        pos: tableAttrs.pos_x !== undefined && tableAttrs.pos_y !== undefined
          ? { x: tableAttrs.pos_x, y: tableAttrs.pos_y }
          : undefined,
        areaIds: [],
        note: dbmlTable.note,
        leadingComments: commentMap.get(`table:${dbmlTable.name}`),
      };
    })
  );

  // Parse references (foreign keys)
  const references: Reference[] = database.schemas.flatMap((schema) =>
    schema.refs.map((ref) => {
      const refId = `ref-${ref.endpoints[0].tableName}-${ref.endpoints[0].fieldNames[0]}`;
      const refKey = `${ref.endpoints[0].tableName}.${ref.endpoints[0].fieldNames[0]}-${ref.endpoints[1].tableName}.${ref.endpoints[1].fieldNames[0]}`;
      const refAttrs = referenceAttributes.get(refKey) || {};

      // Mark FK columns
      const fromTableId = `table-${ref.endpoints[0].tableName}`;
      const fromTable = tables.find((t) => t.id === fromTableId);
      if (fromTable) {
        const fromColumn = fromTable.columns.find(
          (c) => c.name === ref.endpoints[0].fieldNames[0]
        );
        if (fromColumn) {
          fromColumn.fk = true;
        }
      }

      // Find matching comment by searching for ref definition
      let refComments: string[] | undefined;
      for (const [key, comments] of commentMap.entries()) {
        if (key.startsWith('ref:')) {
          const refDef = key.substring(4); // Remove 'ref:' prefix
          // Check if this ref definition matches (handle >, <, - operators and optional attributes)
          const normalizedRef = refDef.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
          const refPattern1 = `${ref.endpoints[0].tableName}.${ref.endpoints[0].fieldNames[0]}`;
          const refPattern2 = `${ref.endpoints[1].tableName}.${ref.endpoints[1].fieldNames[0]}`;
          if (normalizedRef.includes(refPattern1) && normalizedRef.includes(refPattern2)) {
            refComments = comments;
            break;
          }
        }
      }

      return {
        id: refId,
        fromTable: fromTableId,
        fromColumn: ref.endpoints[0].fieldNames[0],
        toTable: `table-${ref.endpoints[1].tableName}`,
        toColumn: ref.endpoints[1].fieldNames[0],
        type: mapDbmlRelationType(ref.name),
        swapEdge: refAttrs.swap_edge,
        leadingComments: refComments,
      };
    })
  );

  // Parse areas (AIR-DML extension)
  const areaAttributes = parseAreaAttributes(airDmlText);
  const areas: Area[] = database.schemas.flatMap((schema) =>
    (schema.tableGroups || []).map((group) => {
      const areaAttrs = areaAttributes.get(group.name) || {};
      const areaId = `area-${group.name}`;

      // Add area ID to tables
      if (group.tables) {
        (group.tables as any[]).forEach((tableRef: any) => {
          const tableName = typeof tableRef === 'string' ? tableRef : tableRef.name;
          const table = tables.find(t => t.name === tableName);
          if (table && !table.areaIds?.includes(areaId)) {
            table.areaIds = [...(table.areaIds || []), areaId];
          }
        });
      }

      // Parse CommonColumns from raw text
      const commonColumns = parseAreaCommonColumns(airDmlText, group.name);

      // Parse Note from raw text (not from parameters)
      const note = parseAreaNote(airDmlText, group.name);

      // Parse database_type from raw text (inside curly braces, like Project)
      const databaseType = parseAreaDatabaseType(airDmlText, group.name);

      // Extract table names from TableGroup
      const tableNames = (group.tables || []).map((tableRef: any) =>
        typeof tableRef === 'string' ? tableRef : tableRef.name
      );

      // Map table names to table IDs
      const tableIds = tableNames
        .map((tableName: string) => {
          const table = tables.find(t => t.name === tableName);
          return table?.id;
        })
        .filter(Boolean) as string[];

      return {
        id: areaId,
        name: group.name,
        tables: tableIds,
        color: areaAttrs.color,
        pos: areaAttrs.pos_x !== undefined && areaAttrs.pos_y !== undefined
          ? { x: areaAttrs.pos_x, y: areaAttrs.pos_y }
          : undefined,
        width: areaAttrs.width,
        height: areaAttrs.height,
        labelHorizontal: areaAttrs.label_horizontal as 'left' | 'center' | 'right' | undefined,
        labelVertical: areaAttrs.label_vertical as 'top' | 'center' | 'bottom' | undefined,
        databaseType,
        note,
        commonColumns,
        leadingComments: commentMap.get(`area:${group.name}`),
      };
    })
  );

  return {
    id: diagramId || `diagram-${Date.now()}`,
    name: project,
    project,
    database: databaseType,
    tables,
    references,
    areas,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Export Diagram to AIR-DML text
 * @param diagram - Diagram object
 * @returns AIR-DML formatted text
 */
export function exportToAirDML(diagram: Diagram): string {
  let airDml = '';

  // Helper function to format leading comments
  const formatComments = (comments?: string[]): string => {
    if (!comments || comments.length === 0) return '';
    return comments.map(c => `// ${c}\n`).join('');
  };

  // Project header
  airDml += `// ${diagram.name}\n`;
  const projectName = diagram.project || diagram.name || 'Untitled';
  airDml += `Project ${escapeIdentifier(projectName)} {\n`;
  airDml += `  database_type: '${diagram.database || 'PostgreSQL'}'\n`;
  airDml += `  Note: "Generated with AIR-DML"\n`;
  airDml += `}\n\n`;

  // Tables
  diagram.tables.forEach((table) => {
    // Output leading comments for this table
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
      const constraints: string[] = [];
      if (column.pk) constraints.push('pk');
      if (column.fk) constraints.push('fk');
      if (column.unique) constraints.push('unique');
      if (column.notNull) constraints.push('not null');
      if (column.increment) constraints.push('increment');
      if (column.default) constraints.push(`default: ${column.default}`);

      if (column.logicalName) {
        constraints.push(`alias: "${escapeString(column.logicalName)}"`);
      }

      if (column.note) {
        constraints.push(`note: "${escapeString(column.note)}"`);
      }

      const typeStr = column.typeParams
        ? `${column.type}(${column.typeParams})`
        : column.type;

      const constraintStr = constraints.length > 0 ? ` [${constraints.join(', ')}]` : '';

      airDml += `  ${escapeIdentifier(column.name)} ${typeStr}${constraintStr}\n`;
    });

    if (table.note) {
      airDml += `\n  Note: "${escapeString(table.note)}"\n`;
    }

    airDml += `}\n\n`;
  });

  // References
  diagram.references.forEach((ref) => {
    // Output leading comments for this reference
    airDml += formatComments(ref.leadingComments);

    const fromTable = diagram.tables.find((t) => t.id === ref.fromTable);
    const toTable = diagram.tables.find((t) => t.id === ref.toTable);

    if (fromTable && toTable) {
      const relSymbol = getRelationshipSymbol(ref.type);

      const refAttrs: string[] = [];
      if (ref.swapEdge) {
        refAttrs.push('swapEdge: true');
      }
      const attrStr = refAttrs.length > 0 ? ` [${refAttrs.join(', ')}]` : '';

      airDml += `Ref: ${escapeIdentifier(fromTable.name)}.${escapeIdentifier(ref.fromColumn)} ${relSymbol} ${escapeIdentifier(toTable.name)}.${escapeIdentifier(ref.toColumn)}${attrStr}\n`;
    }
  });

  airDml += '\n';

  // Areas (AIR-DML extension)
  if (diagram.areas && diagram.areas.length > 0) {
    diagram.areas.forEach((area) => {
      // Output leading comments for this area
      airDml += formatComments(area.leadingComments);

      const tablesInArea = diagram.tables.filter(t => t.areaIds?.includes(area.id));
      const tableNames = tablesInArea
        .map(table => escapeIdentifier(table.name))
        .filter(Boolean);

      if (tableNames.length > 0) {
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
          areaAttrs.push(`label_horizontal: "${area.labelHorizontal}"`);
        }
        if (area.labelVertical) {
          areaAttrs.push(`label_vertical: "${area.labelVertical}"`);
        }
        // database_type, note, commonColumnsはすべて中かっこ内に記載（Projectと同様）

        const attrStr = areaAttrs.length > 0 ? ` [${areaAttrs.join(', ')}]` : '';
        airDml += `Area ${escapeIdentifier(area.name)}${attrStr} {\n`;

        tableNames.forEach((name) => {
          airDml += `  ${name}\n`;
        });

        // Export database_type (inside curly braces, like Project)
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
            if (column.default) constraints.push(`default: ${column.default}`);

            if (column.logicalName) {
              constraints.push(`alias: "${escapeString(column.logicalName)}"`);
            }

            const typeStr = column.typeParams
              ? `${column.type}(${column.typeParams})`
              : column.type;

            const constraintStr = constraints.length > 0 ? ` [${constraints.join(', ')}]` : '';

            airDml += `    ${escapeIdentifier(column.name)} ${typeStr}${constraintStr}\n`;
          });
          airDml += `  ]\n`;
        }

        // Export Note (after CommonColumns, similar to Table/Project style)
        if (area.note) {
          airDml += `\n  Note: "${area.note.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
        }

        airDml += `}\n\n`;
      }
    });
  }

  return airDml.trim();
}

// ===== Helper Functions =====

/**
 * Remove AIR-DML extended attributes from text before parsing with standard DBML parser
 * Extended attributes will be extracted separately and merged back later
 */
function removeExtendedAttributes(airDmlText: string): string {
  let cleaned = airDmlText;

  // Remove extended attributes from Table definitions
  cleaned = cleaned.replace(
    /Table\s+(["`]?)(\w+)\1\s*\[([^\]]+)\]/g,
    (_match, quote, tableName, attrs) => {
      // Keep only standard DBML attributes (headercolor, note)
      const standardAttrs = attrs.split(',')
        .map((attr: string) => attr.trim())
        .filter((attr: string) => {
          const attrName = attr.split(':')[0].trim().toLowerCase();
          return attrName === 'headercolor' || attrName.startsWith('note');
        });

      if (standardAttrs.length > 0) {
        return `Table ${quote}${tableName}${quote} [${standardAttrs.join(', ')}]`;
      } else {
        return `Table ${quote}${tableName}${quote}`;
      }
    }
  );

  // Remove extended attributes from Column definitions
  cleaned = cleaned.replace(
    /(\s+)(["`]?)(\w+)\2\s+(\w+(?:\([^)]*\))?)\s*\[([^\]]+)\]/g,
    (_match, indent, quote, colName, colType, attrs) => {
      // Keep only standard DBML attributes
      const standardAttrs = attrs.split(',')
        .map((attr: string) => attr.trim())
        .filter((attr: string) => {
          const lower = attr.toLowerCase();
          // Standard DBML column attributes
          return (
            lower === 'pk' ||
            lower === 'unique' ||
            lower === 'not null' ||
            lower === 'increment' ||
            lower.startsWith('default') ||
            lower.startsWith('note') ||
            lower.startsWith('ref')
          );
        });

      if (standardAttrs.length > 0) {
        return `${indent}${quote}${colName}${quote} ${colType} [${standardAttrs.join(', ')}]`;
      } else {
        return `${indent}${quote}${colName}${quote} ${colType}`;
      }
    }
  );

  // Remove extended attributes from Ref definitions
  cleaned = cleaned.replace(
    /Ref\s*:\s*([^[\n]+)\[([^\]]+)\]/g,
    (_match, refDef, attrs) => {
      const standardAttrs = attrs.split(',')
        .map((attr: string) => attr.trim())
        .filter((attr: string) => {
          const lower = attr.toLowerCase();
          return lower.startsWith('delete') || lower.startsWith('update') ||
                 lower.startsWith('ondelete') || lower.startsWith('onupdate');
        });

      if (standardAttrs.length > 0) {
        return `Ref: ${refDef}[${standardAttrs.join(', ')}]`;
      } else {
        return `Ref: ${refDef}`;
      }
    }
  );

  // Convert Area to TableGroup (without attributes - TableGroup doesn't support them)
  // air-dml uses 'Area' keyword for user-facing syntax
  // but standard DBML uses 'TableGroup'
  // Use .+? to match any characters (including Japanese) inside quotes
  // Attributes are extracted separately by parseAreaAttributes() before this conversion
  cleaned = cleaned.replace(
    /Area\s+(["`]?)(.+?)\1\s*\[([^\]]+)\]/g,
    (_match, quote, areaName) => {
      // Convert Area → TableGroup WITHOUT attributes (standard DBML doesn't support them)
      return `TableGroup ${quote}${areaName}${quote}`;
    }
  );

  // Also convert Area without attributes
  cleaned = cleaned.replace(
    /Area\s+(["`]?)(.+?)\1\s*\{/g,
    (_match, quote, areaName) => {
      return `TableGroup ${quote}${areaName}${quote} {`;
    }
  );

  return cleaned;
}

function parseTableAttributes(airDmlText: string): Map<string, ParsedAttributes> {
  const result = new Map<string, ParsedAttributes>();
  const tableRegex = /Table\s+(["`]?)(\w+)\1\s*\[([^\]]+)\]/g;

  let match;
  while ((match = tableRegex.exec(airDmlText)) !== null) {
    const tableName = match[2];
    const attrsStr = match[3];
    const attrs = parseAttributesString(attrsStr);
    result.set(tableName, attrs);
  }

  return result;
}

function parseColumnAttributes(airDmlText: string): Map<string, ParsedAttributes> {
  const result = new Map<string, ParsedAttributes>();
  const tableBlocks = airDmlText.split(/Table\s+/);

  tableBlocks.forEach((block) => {
    const tableNameMatch = block.match(/^(["`]?)(\w+)\1\s*(?:\[[^\]]*\])?\s*\{/);
    if (!tableNameMatch) return;

    const tableName = tableNameMatch[2];
    const columnRegex = /^\s*(["`]?)(\w+)\1\s+\w+(?:\([^)]*\))?\s*\[([^\]]+)\]/gm;
    let colMatch;

    while ((colMatch = columnRegex.exec(block)) !== null) {
      const columnName = colMatch[2];
      const attrsStr = colMatch[3];
      const attrs = parseAttributesString(attrsStr);

      if (attrs.alias || attrs.fk !== undefined) {
        result.set(`${tableName}.${columnName}`, attrs);
      }
    }
  });

  return result;
}

function parseAreaAttributes(airDmlText: string): Map<string, ParsedAttributes> {
  const result = new Map<string, ParsedAttributes>();
  // Use .+? to match Japanese characters in Area names
  const areaRegex = /Area\s+(["`]?)(.+?)\1\s*\[([^\]]+)\]/g;

  let match;
  while ((match = areaRegex.exec(airDmlText)) !== null) {
    const areaName = match[2];
    const attrsStr = match[3];
    const attrs = parseAttributesString(attrsStr);
    result.set(areaName, attrs);
  }

  return result;
}

function parseAreaCommonColumns(airDmlText: string, areaName: string): Column[] | undefined {
  const areaBlockRegex = new RegExp(`Area\\s+(["\`]?)${areaName}\\1\\s*(?:\\[[^\\]]*\\])?\\s*\\{([^}]*)\\}`, 's');
  const areaMatch = areaBlockRegex.exec(airDmlText);

  if (!areaMatch) return undefined;

  const areaContent = areaMatch[2];
  const commonColumnsRegex = /CommonColumns:?\s*\[([^\]]*)\]/s;
  const commonColumnsMatch = commonColumnsRegex.exec(areaContent);

  if (!commonColumnsMatch) return undefined;

  const columnsContent = commonColumnsMatch[1];
  const columns: Column[] = [];
  const columnLines = columnsContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));

  for (const line of columnLines) {
    const columnMatch = line.match(/^(["`]?)(\w+)\1\s+(\w+)(?:\(([^)]+)\))?\s*(?:\[([^\]]+)\])?/);

    if (!columnMatch) continue;

    const columnName = columnMatch[2];
    const typeName = columnMatch[3];
    const typeParams = columnMatch[4];
    const constraintsStr = columnMatch[5] || '';

    const column: Column = {
      name: columnName,
      type: mapDbmlTypeToDataType(typeName),
      typeParams,
      pk: /\bpk\b/.test(constraintsStr),
      fk: /\bfk\b/.test(constraintsStr),
      unique: /\bunique\b/.test(constraintsStr),
      notNull: /\bnot\s+null\b/.test(constraintsStr),
      increment: /\bincrement\b/.test(constraintsStr),
    };

    const aliasMatch = constraintsStr.match(/alias\s*:\s*"([^"]*)"/);
    if (aliasMatch) {
      column.logicalName = aliasMatch[1];
    }

    const defaultMatch = constraintsStr.match(/default\s*:\s*([^,\]]+)/);
    if (defaultMatch) {
      column.default = defaultMatch[1].trim();
    }

    columns.push(column);
  }

  return columns.length > 0 ? columns : undefined;
}

function parseAreaNote(airDmlText: string, areaName: string): string | undefined {
  const areaBlockRegex = new RegExp(`Area\\s+(["\`]?)${areaName}\\1\\s*(?:\\[[^\\]]*\\])?\\s*\\{([^}]*)\\}`, 's');
  const areaMatch = areaBlockRegex.exec(airDmlText);

  if (!areaMatch) return undefined;

  const areaContent = areaMatch[2];
  const noteRegex = /Note:?\s*"([^"]*)"/;
  const noteMatch = noteRegex.exec(areaContent);

  return noteMatch ? noteMatch[1] : undefined;
}

function parseAreaDatabaseType(airDmlText: string, areaName: string): string | undefined {
  const areaBlockRegex = new RegExp(`Area\\s+(["\`]?)${areaName}\\1\\s*(?:\\[[^\\]]*\\])?\\s*\\{([^}]*)\\}`, 's');
  const areaMatch = areaBlockRegex.exec(airDmlText);

  if (!areaMatch) return undefined;

  const areaContent = areaMatch[2];
  const databaseTypeRegex = /database_type:?\s*["']([^"']*)["']/;
  const databaseTypeMatch = databaseTypeRegex.exec(areaContent);

  return databaseTypeMatch ? databaseTypeMatch[1] : undefined;
}

function parseReferenceAttributes(airDmlText: string): Map<string, ParsedAttributes> {
  const result = new Map<string, ParsedAttributes>();
  const refRegex = /Ref\s*:\s*(["`]?)(\w+)\1\.(["`]?)(\w+)\3\s*[<>\-~]+\s*(["`]?)(\w+)\5\.(["`]?)(\w+)\7\s*\[([^\]]+)\]/g;

  let match;
  while ((match = refRegex.exec(airDmlText)) !== null) {
    const fromTable = match[2];
    const fromColumn = match[4];
    const toTable = match[6];
    const toColumn = match[8];
    const attrsStr = match[9];
    const attrs = parseAttributesString(attrsStr);

    const refKey = `${fromTable}.${fromColumn}-${toTable}.${toColumn}`;
    result.set(refKey, attrs);
  }

  return result;
}

/**
 * Extract comments from AIR-DML text and associate with their following elements
 * Returns a map of element identifiers to their preceding comment lines
 * @param airDmlText - The AIR-DML source text
 * @returns Map of element identifier to array of comment strings
 */
function parseComments(airDmlText: string): Map<string, string[]> {
  const commentMap = new Map<string, string[]>();
  const lines = airDmlText.split('\n');
  let accumulatedComments: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this is a comment line
    const commentMatch = line.match(/^\/\/\s*(.*)$/);
    if (commentMatch) {
      accumulatedComments.push(commentMatch[1]);
      continue;
    }

    // If we have accumulated comments and this is a non-empty line, identify the element
    if (accumulatedComments.length > 0 && line.length > 0) {
      let elementKey: string | null = null;

      // Match Table definition
      const tableMatch = line.match(/^Table\s+(["`]?)(.+?)\1/);
      if (tableMatch) {
        elementKey = `table:${tableMatch[2]}`;
      }

      // Match Area definition
      const areaMatch = line.match(/^Area\s+(["`]?)(.+?)\1/);
      if (areaMatch) {
        elementKey = `area:${areaMatch[2]}`;
      }

      // Match Reference definition
      const refMatch = line.match(/^Ref\s*:\s*(.+)/);
      if (refMatch) {
        // Parse the reference definition to create a unique key
        const refDef = refMatch[1].trim();
        elementKey = `ref:${refDef}`;
      }

      if (elementKey) {
        commentMap.set(elementKey, [...accumulatedComments]);
        accumulatedComments = [];
      }
    }
  }

  return commentMap;
}

function parseAttributesString(attrsStr: string): ParsedAttributes {
  const attrs: ParsedAttributes = {};

  const aliasMatch = attrsStr.match(/alias\s*:\s*"([^"]*)"/);
  if (aliasMatch) attrs.alias = aliasMatch[1];

  const posXMatch = attrsStr.match(/pos_x\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (posXMatch) attrs.pos_x = parseFloat(posXMatch[1]);

  const posYMatch = attrsStr.match(/pos_y\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (posYMatch) attrs.pos_y = parseFloat(posYMatch[1]);

  const widthMatch = attrsStr.match(/width\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (widthMatch) attrs.width = parseFloat(widthMatch[1]);

  const heightMatch = attrsStr.match(/height\s*:\s*(-?\d+(?:\.\d+)?)/);
  if (heightMatch) attrs.height = parseFloat(heightMatch[1]);

  const colorMatch = attrsStr.match(/color\s*:\s*"([^"]*)"/);
  if (colorMatch) attrs.color = colorMatch[1];

  const databaseTypeMatch = attrsStr.match(/database_type\s*:\s*"([^"]*)"/);
  if (databaseTypeMatch) attrs.database_type = databaseTypeMatch[1];

  const labelHorizontalMatch = attrsStr.match(/label_horizontal\s*:\s*"([^"]*)"/);
  if (labelHorizontalMatch) attrs.label_horizontal = labelHorizontalMatch[1];

  const labelVerticalMatch = attrsStr.match(/label_vertical\s*:\s*"([^"]*)"/);
  if (labelVerticalMatch) attrs.label_vertical = labelVerticalMatch[1];

  // Note: noteはパラメータから読み取らない（ブロック内のNote:から読み取る）

  // Support both swapEdge (camelCase) and swap_edge (snake_case)
  const swapEdgeMatch = attrsStr.match(/(?:swapEdge|swap_edge)\s*:\s*(true|false)/);
  if (swapEdgeMatch) attrs.swap_edge = swapEdgeMatch[1] === 'true';

  if (/\bfk\b/.test(attrsStr)) attrs.fk = true;

  return attrs;
}

function mapDbmlTypeToDataType(dbmlType: string): DataType {
  const typeMap: Record<string, DataType> = {
    int: 'integer',
    integer: 'integer',
    bigint: 'bigint',
    smallint: 'smallint',
    serial: 'serial',
    bigserial: 'bigserial',
    varchar: 'varchar',
    char: 'char',
    text: 'text',
    boolean: 'boolean',
    bool: 'boolean',
    date: 'date',
    time: 'time',
    timestamp: 'timestamp',
    timestamptz: 'timestamptz',
    numeric: 'numeric',
    decimal: 'decimal',
    real: 'real',
    double: 'double precision',
    json: 'json',
    jsonb: 'jsonb',
    uuid: 'uuid',
    bytea: 'bytea',
  };

  return (typeMap[dbmlType.toLowerCase()] as DataType) || 'text';
}

function mapDbmlRelationType(relType: string): RelationshipType {
  if (relType === '<') return 'many-to-one';
  if (relType === '>') return 'one-to-many';
  if (relType === '-') return 'one-to-one';
  if (relType === '<>' || relType === '><') return 'many-to-many';
  if (relType === '~') return 'ai-inferred';
  return 'many-to-one';
}

function getRelationshipSymbol(relType?: RelationshipType): string {
  if (relType === 'many-to-one') return '<';
  if (relType === 'one-to-many') return '>';
  if (relType === 'one-to-one') return '-';
  if (relType === 'many-to-many') return '><';
  if (relType === 'any') return '~';
  if (relType === 'ai-inferred') return '~';
  return '<';
}

function escapeIdentifier(name: string): string {
  if (/[^a-zA-Z0-9_]/.test(name)) {
    return `"${name.replace(/"/g, '\\"')}"`;
  }
  return name;
}

function escapeString(str: string | undefined): string {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
