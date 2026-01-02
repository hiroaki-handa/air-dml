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
  const parser = new Parser();
  const database = parser.parse(airDmlText, 'dbml');

  // Extract project name and database type
  const project = database.name || 'Untitled Project';
  const databaseType = database.databaseType || 'PostgreSQL';

  // Parse AIR-DML custom attributes from raw text
  const tableAttributes = parseTableAttributes(airDmlText);
  const columnAttributes = parseColumnAttributes(airDmlText);
  const referenceAttributes = parseReferenceAttributes(airDmlText);

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
          typeParams: field.type.args?.join(', '),
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

      return {
        id: refId,
        fromTable: fromTableId,
        fromColumn: ref.endpoints[0].fieldNames[0],
        toTable: `table-${ref.endpoints[1].tableName}`,
        toColumn: ref.endpoints[1].fieldNames[0],
        type: mapDbmlRelationType(ref.name),
        swapEdge: refAttrs.swap_edge,
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

      return {
        id: areaId,
        name: group.name,
        color: areaAttrs.color,
        pos: areaAttrs.pos_x !== undefined && areaAttrs.pos_y !== undefined
          ? { x: areaAttrs.pos_x, y: areaAttrs.pos_y }
          : undefined,
        width: areaAttrs.width,
        height: areaAttrs.height,
        databaseType: areaAttrs.database_type,
        note: areaAttrs.note,
        commonColumns,
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

  // Project header
  airDml += `// ${diagram.name}\n`;
  const projectName = diagram.project || diagram.name || 'Untitled';
  airDml += `Project ${escapeIdentifier(projectName)} {\n`;
  airDml += `  database_type: '${diagram.database || 'PostgreSQL'}'\n`;
  airDml += `  Note: "Generated with AIR-DML"\n`;
  airDml += `}\n\n`;

  // Tables
  diagram.tables.forEach((table) => {
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
    const fromTable = diagram.tables.find((t) => t.id === ref.fromTable);
    const toTable = diagram.tables.find((t) => t.id === ref.toTable);

    if (fromTable && toTable) {
      const relSymbol = getRelationshipSymbol(ref.type);

      const refAttrs: string[] = [];
      if (ref.swapEdge) {
        refAttrs.push('swap_edge: true');
      }
      const attrStr = refAttrs.length > 0 ? ` [${refAttrs.join(', ')}]` : '';

      airDml += `Ref: ${escapeIdentifier(fromTable.name)}.${escapeIdentifier(ref.fromColumn)} ${relSymbol} ${escapeIdentifier(toTable.name)}.${escapeIdentifier(ref.toColumn)}${attrStr}\n`;
    }
  });

  airDml += '\n';

  // Areas (AIR-DML extension)
  if (diagram.areas && diagram.areas.length > 0) {
    diagram.areas.forEach((area) => {
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
        if (area.databaseType) {
          areaAttrs.push(`database_type: "${area.databaseType}"`);
        }
        if (area.note) {
          areaAttrs.push(`note: "${area.note.replace(/"/g, '\\"')}"`);
        }

        const attrStr = areaAttrs.length > 0 ? ` [${areaAttrs.join(', ')}]` : '';
        airDml += `Area ${escapeIdentifier(area.name)}${attrStr} {\n`;

        tableNames.forEach((name) => {
          airDml += `  ${name}\n`;
        });

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

        airDml += `}\n\n`;
      }
    });
  }

  return airDml.trim();
}

// ===== Helper Functions =====

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
  const areaRegex = /Area\s+(["`]?)(\w+)\1\s*\[([^\]]+)\]/g;

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

  const noteMatch = attrsStr.match(/note\s*:\s*"([^"]*)"/);
  if (noteMatch) attrs.note = noteMatch[1];

  const swapEdgeMatch = attrsStr.match(/swap_edge\s*:\s*(true|false)/);
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
  if (relType === '~') return 'any';
  return 'many-to-one';
}

function getRelationshipSymbol(relType?: RelationshipType): string {
  if (relType === 'many-to-one') return '<';
  if (relType === 'one-to-many') return '>';
  if (relType === 'one-to-one') return '-';
  if (relType === 'many-to-many') return '><';
  if (relType === 'any') return '~';
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
