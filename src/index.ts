/**
 * AIR-DML (AI-Ready Data Modeling Language)
 * Extended DBML parser for AI-driven development
 *
 * @packageDocumentation
 */

export { parseAirDML, exportToAirDML } from './parser';
export {
  getDataTypesForDatabase,
  getMergedDataTypes,
  DATABASE_TYPES,
  type DatabaseType,
} from './database-types';
export type {
  Diagram,
  Table,
  Column,
  Reference,
  Area,
  DataType,
  RelationshipType,
  Cardinality,
  Position,
  ParseResult,
} from './types';
