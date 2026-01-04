/**
 * AIR-DML Type Definitions
 * AI-Ready Data Modeling Language - Extended DBML specification
 */

/**
 * Position coordinates on canvas
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Column data types
 * Supports multiple database types (PostgreSQL, MySQL, Oracle, SQL Server, SQLite, BigQuery)
 */
export type DataType =
  | 'integer'
  | 'bigint'
  | 'smallint'
  | 'serial'
  | 'bigserial'
  | 'varchar'
  | 'text'
  | 'char'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'timestamptz'
  | 'time'
  | 'json'
  | 'jsonb'
  | 'uuid'
  | 'decimal'
  | 'numeric'
  | 'real'
  | 'double precision'
  | 'bytea'
  | string; // Custom types

/**
 * Column definition
 */
export interface Column {
  /** Column name (physical name) */
  name: string;

  /** Logical name (e.g., Japanese, human-readable) - AIR-DML extension */
  logicalName?: string;

  /** Data type */
  type: DataType;

  /** Type parameters (e.g., 255 in varchar(255)) */
  typeParams?: string;

  /** Primary Key constraint */
  pk?: boolean;

  /** Foreign Key constraint */
  fk?: boolean;

  /** Unique constraint */
  unique?: boolean;

  /** Not Null constraint */
  notNull?: boolean;

  /** Default value */
  default?: string;

  /** Auto increment (AUTO_INCREMENT) */
  increment?: boolean;

  /** Note or description */
  note?: string;
}

/**
 * Table definition
 */
export interface Table {
  /** Table ID (unique identifier) */
  id: string;

  /** Table name (physical name) */
  name: string;

  /** Logical name (e.g., Japanese, human-readable) - AIR-DML extension */
  logicalName?: string;

  /** Column list */
  columns: Column[];

  /** Table header color - AIR-DML extension */
  color?: string;

  /** Position on canvas - AIR-DML extension */
  pos?: Position;

  /** Area IDs this table belongs to - AIR-DML extension */
  areaIds?: string[];

  /** Note or description */
  note?: string;
}

/**
 * Relationship cardinality
 */
export type Cardinality = '1' | 'n' | '0..1' | '1..n' | '0..n';

/**
 * Relationship type
 */
export type RelationshipType =
  | 'one-to-one' // 1:1
  | 'one-to-many' // 1:n
  | 'many-to-one' // n:1
  | 'many-to-many' // n:n
  | 'any' // AI inference (undetermined) - AIR-DML extension
  | 'ai-inferred'; // AI inference (alias for 'any')

/**
 * Reference (foreign key relationship)
 */
export interface Reference {
  /** Reference ID */
  id: string;

  /** Source table name */
  fromTable: string;

  /** Source column name */
  fromColumn: string;

  /** Target table name */
  toTable: string;

  /** Target column name */
  toColumn: string;

  /** Relationship type */
  type?: RelationshipType;

  /** Source cardinality */
  fromCardinality?: Cardinality;

  /** Target cardinality */
  toCardinality?: Cardinality;

  /** Swap edge direction - AIR-DML extension */
  swapEdge?: boolean;

  /** Note */
  note?: string;
}

/**
 * Area (table grouping) - AIR-DML extension
 * Represents bounded contexts in Domain-Driven Design
 * Can represent: subject areas, systems, ODS-DWH-MART layers, functional domains, etc.
 */
export interface Area {
  /** Area ID */
  id: string;

  /** Area name */
  name: string;

  /** Area color */
  color?: string;

  /** Position on canvas */
  pos?: Position;

  /** Area width */
  width?: number;

  /** Area height */
  height?: number;

  /** Label horizontal position */
  labelHorizontal?: 'left' | 'center' | 'right';

  /** Label vertical position */
  labelVertical?: 'top' | 'center' | 'bottom';

  /** Database type for this area (supports polyglot persistence) */
  databaseType?: 'PostgreSQL' | 'MySQL' | 'SQLite' | 'SQL Server' | 'Oracle' | 'BigQuery' | 'Redshift' | string;

  /** Common columns for all tables in this area (e.g., created_at, updated_at) */
  commonColumns?: Column[];

  /** Note or description */
  note?: string;
}

/**
 * Comment - AIR-DML extension for preserving code comments
 */
export interface Comment {
  /** Comment text (without // prefix) */
  text: string;

  /** Comment position/context */
  context?: 'tables' | 'references' | 'areas' | 'table' | 'area' | 'reference';

  /** Target element ID (if associated with specific element) */
  targetId?: string;
}

/**
 * Diagram definition
 */
export interface Diagram {
  /** Diagram ID */
  id: string;

  /** Diagram name */
  name: string;

  /** Project name */
  project?: string;

  /** Default database type */
  database?: 'PostgreSQL' | 'MySQL' | 'SQLite' | 'SQL Server' | 'Oracle' | string;

  /** Table list */
  tables: Table[];

  /** Reference list */
  references: Reference[];

  /** Area list - AIR-DML extension */
  areas?: Area[];

  /** Comments - AIR-DML extension for preserving code readability */
  comments?: Comment[];

  /** Created timestamp */
  createdAt?: string;

  /** Updated timestamp */
  updatedAt?: string;

  /** Note */
  note?: string;
}

/**
 * Parse result from AIR-DML string to Diagram object
 */
export interface ParseResult {
  /** Parse success flag */
  success: boolean;

  /** Diagram data */
  diagram?: Diagram;

  /** Error message */
  error?: string;

  /** Warning messages */
  warnings?: string[];
}
