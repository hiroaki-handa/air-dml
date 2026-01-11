/**
 * AIR-DML AST to Diagram Transformer
 *
 * Converts the parsed AST to the Diagram type used by the application.
 */

import type {
  ProgramNode,
  TableNode,
  ColumnNode,
  RefNode,
  AreaNode,
} from './ast';
import type {
  Diagram,
  Table,
  Column,
  Reference,
  Area,
  DataType,
  RelationshipType,
} from '../../types';

/**
 * Transform options
 */
export interface TransformOptions {
  /** Diagram ID (generated if not provided) */
  diagramId?: string;
  /** Default database type */
  defaultDatabase?: string;
}

/**
 * Transform AST to Diagram
 */
export function transformAstToDiagram(
  ast: ProgramNode,
  options: TransformOptions = {}
): Diagram {
  const diagramId = options.diagramId || `diagram-${Date.now()}`;
  const defaultDatabase = options.defaultDatabase || 'PostgreSQL';

  // Transform project
  const projectName = ast.project?.name || 'Untitled Project';
  const databaseType = ast.project?.settings.databaseType || defaultDatabase;
  const projectNote = ast.project?.settings.note;

  // Transform tables
  const tables = ast.tables.map((tableNode) => transformTable(tableNode));

  // Transform references
  const references = ast.refs.map((refNode) => transformRef(refNode));

  // Transform areas and associate tables
  const areas = ast.areas.map((areaNode) =>
    transformArea(areaNode, tables)
  );

  return {
    id: diagramId,
    name: projectName,
    project: projectName,
    database: databaseType as Diagram['database'],
    tables,
    references,
    areas,
    note: projectNote,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Transform TableNode to Table
 */
function transformTable(node: TableNode): Table {
  const tableId = `table-${node.name}`;

  const columns = node.columns.map((colNode) => transformColumn(colNode));

  return {
    id: tableId,
    name: node.name,
    logicalName: node.settings.alias,
    columns,
    color: node.settings.color,
    pos:
      node.settings.posX !== undefined && node.settings.posY !== undefined
        ? { x: node.settings.posX, y: node.settings.posY }
        : undefined,
    areaIds: [],
    note: node.note,
    leadingComments: node.leadingComments,
  };
}

/**
 * Transform ColumnNode to Column
 */
function transformColumn(node: ColumnNode): Column {
  return {
    name: node.name,
    logicalName: node.constraints.alias,
    type: mapTypeToDataType(node.type),
    typeParams: node.typeParams,
    pk: node.constraints.pk,
    fk: node.constraints.fk,
    unique: node.constraints.unique,
    notNull: node.constraints.notNull,
    increment: node.constraints.increment,
    note: node.constraints.note,
    leadingComments: node.leadingComments,
  };
}

/**
 * Transform RefNode to Reference
 */
function transformRef(node: RefNode): Reference {
  const fromTableId = `table-${node.from.table}`;
  const toTableId = `table-${node.to.table}`;
  // 一意のRef IDを生成（from + to を含める）
  const refId = `ref-${node.from.table}-${node.from.column}-${node.to.table}-${node.to.column}`;

  return {
    id: refId,
    fromTable: fromTableId,
    fromColumn: node.from.column,
    toTable: toTableId,
    toColumn: node.to.column,
    type: mapRelationType(node.relationType),
    swapEdge: node.settings.swapEdge,
    note: node.settings.note,
    leadingComments: node.leadingComments,
  };
}

/**
 * Transform AreaNode to Area and associate tables
 */
function transformArea(node: AreaNode, tables: Table[]): Area {
  const areaId = `area-${node.name}`;

  // Associate tables with this area
  node.tables.forEach((tableName) => {
    const table = tables.find((t) => t.name === tableName);
    if (table) {
      if (!table.areaIds) {
        table.areaIds = [];
      }
      if (!table.areaIds.includes(areaId)) {
        table.areaIds.push(areaId);
      }
    }
  });

  // Transform common columns
  const commonColumns = node.commonColumns?.map((colNode) =>
    transformColumn(colNode)
  );

  // Map table names to table IDs
  const tableIds = node.tables
    .map((tableName) => {
      const table = tables.find((t) => t.name === tableName);
      return table?.id;
    })
    .filter((id): id is string => id !== undefined);

  return {
    id: areaId,
    name: node.name,
    tables: tableIds,
    color: node.settings.color,
    pos:
      node.settings.posX !== undefined && node.settings.posY !== undefined
        ? { x: node.settings.posX, y: node.settings.posY }
        : undefined,
    width: node.settings.width,
    height: node.settings.height,
    labelHorizontal: node.settings.labelHorizontal,
    labelVertical: node.settings.labelVertical,
    databaseType: node.settings.databaseType as Area['databaseType'],
    commonColumns,
    note: node.note,
    leadingComments: node.leadingComments,
  };
}

/**
 * Map AST type string to DataType
 */
function mapTypeToDataType(type: string): DataType {
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

  const lowerType = type.toLowerCase();
  return (typeMap[lowerType] as DataType) || type;
}

/**
 * Map AST relation type to RelationshipType
 */
function mapRelationType(relType: '>' | '<' | '-' | '<>' | '~'): RelationshipType {
  switch (relType) {
    case '>':
      return 'many-to-one';
    case '<':
      return 'one-to-many';
    case '-':
      return 'one-to-one';
    case '<>':
      return 'many-to-many';
    case '~':
      return 'ai-inferred';
    default:
      return 'many-to-one';
  }
}
