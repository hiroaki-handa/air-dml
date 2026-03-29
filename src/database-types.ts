/**
 * Database Type Definitions
 * Provides data type lists for various database systems
 */

import type { DataType } from './types';

/**
 * Supported database types
 */
export const DATABASE_TYPES = [
  'PostgreSQL',
  'MySQL',
  'Oracle',
  'SQL Server',
  'SQLite',
  'BigQuery',
  'Redshift',
  'Snowflake',
] as const;

export type DatabaseType = typeof DATABASE_TYPES[number] | string;

/**
 * Get data types for a specific database
 * @param databaseType - Database type (e.g., 'PostgreSQL', 'MySQL', 'Oracle')
 * @returns Array of supported data types for the database
 */
export function getDataTypesForDatabase(databaseType?: string): DataType[] {
  const dbType = databaseType?.toLowerCase() || 'postgresql';

  // PostgreSQL
  if (dbType.includes('postgres')) {
    return [
      'bigint',
      'bigserial',
      'bit',
      'bit varying',
      'boolean',
      'bytea',
      'char',
      'character',
      'character varying',
      'cidr',
      'date',
      'decimal',
      'double precision',
      'inet',
      'integer',
      'interval',
      'json',
      'jsonb',
      'jsonpath',
      'macaddr',
      'macaddr8',
      'money',
      'numeric',
      'point',
      'real',
      'serial',
      'smallint',
      'smallserial',
      'text',
      'time',
      'time with time zone',
      'time without time zone',
      'timestamp',
      'timestamp with time zone',
      'timestamp without time zone',
      'timestamptz',
      'tsquery',
      'tsvector',
      'uuid',
      'varchar',
      'xml',
    ];
  }

  // MySQL / MariaDB
  if (dbType.includes('mysql') || dbType.includes('mariadb')) {
    return [
      'bigint',
      'binary',
      'bit',
      'blob',
      'boolean',
      'char',
      'date',
      'datetime',
      'decimal',
      'double',
      'enum',
      'float',
      'int',
      'integer',
      'json',
      'longblob',
      'longtext',
      'mediumblob',
      'mediumint',
      'mediumtext',
      'numeric',
      'set',
      'smallint',
      'text',
      'time',
      'timestamp',
      'tinyblob',
      'tinyint',
      'tinytext',
      'varbinary',
      'varchar',
      'year',
    ];
  }

  // Oracle
  if (dbType.includes('oracle')) {
    return [
      'bfile',
      'binary_double',
      'binary_float',
      'blob',
      'char',
      'clob',
      'date',
      'float',
      'integer',
      'interval day to second',
      'interval year to month',
      'long',
      'long raw',
      'nchar',
      'nclob',
      'number',
      'nvarchar2',
      'raw',
      'timestamp',
      'timestamp with local time zone',
      'timestamp with time zone',
      'varchar',
      'varchar2',
    ];
  }

  // SQL Server / MSSQL
  if (dbType.includes('sql server') || dbType.includes('mssql') || dbType.includes('sqlserver')) {
    return [
      'bigint',
      'binary',
      'bit',
      'char',
      'date',
      'datetime',
      'datetime2',
      'datetimeoffset',
      'decimal',
      'float',
      'geography',
      'geometry',
      'hierarchyid',
      'image',
      'int',
      'json',
      'money',
      'nchar',
      'ntext',
      'numeric',
      'nvarchar',
      'real',
      'rowversion',
      'smalldatetime',
      'smallint',
      'smallmoney',
      'sql_variant',
      'text',
      'time',
      'tinyint',
      'uniqueidentifier',
      'varbinary',
      'varchar',
      'vector',
      'xml',
    ];
  }

  // SQLite
  if (dbType.includes('sqlite')) {
    return [
      'blob',
      'boolean',
      'date',
      'datetime',
      'decimal',
      'double',
      'float',
      'integer',
      'numeric',
      'real',
      'text',
      'varchar',
    ];
  }

  // BigQuery
  if (dbType.includes('bigquery')) {
    return [
      'array',
      'bignumeric',
      'bool',
      'bytes',
      'date',
      'datetime',
      'float64',
      'geography',
      'int64',
      'interval',
      'json',
      'numeric',
      'range',
      'string',
      'struct',
      'time',
      'timestamp',
    ];
  }

  // Redshift
  if (dbType.includes('redshift')) {
    return [
      'bigint',
      'boolean',
      'char',
      'date',
      'decimal',
      'double precision',
      'geography',
      'geometry',
      'hllsketch',
      'integer',
      'numeric',
      'real',
      'smallint',
      'super',
      'text',
      'time',
      'timetz',
      'timestamp',
      'timestamptz',
      'varbyte',
      'varchar',
    ];
  }

  // Snowflake
  if (dbType.includes('snowflake')) {
    return [
      'array',
      'bigint',
      'binary',
      'boolean',
      'byteint',
      'char',
      'date',
      'decimal',
      'double',
      'float',
      'geography',
      'geometry',
      'int',
      'integer',
      'map',
      'number',
      'numeric',
      'object',
      'real',
      'smallint',
      'string',
      'text',
      'time',
      'timestamp',
      'timestamp_ltz',
      'timestamp_ntz',
      'timestamp_tz',
      'tinyint',
      'varbinary',
      'varchar',
      'variant',
      'vector',
    ];
  }

  // Default: PostgreSQL
  return [
    'bigint',
    'bigserial',
    'bit',
    'bit varying',
    'boolean',
    'bytea',
    'char',
    'cidr',
    'date',
    'decimal',
    'double precision',
    'inet',
    'integer',
    'interval',
    'json',
    'jsonb',
    'jsonpath',
    'macaddr',
    'money',
    'numeric',
    'point',
    'real',
    'serial',
    'smallint',
    'smallserial',
    'text',
    'time',
    'timestamp',
    'timestamp with time zone',
    'timestamptz',
    'tsquery',
    'tsvector',
    'uuid',
    'varchar',
    'xml',
  ];
}

/**
 * Merge data types from multiple databases
 * @param databaseTypes - Array of database types
 * @returns Merged and sorted array of unique data types
 */
export function getMergedDataTypes(databaseTypes: string[]): DataType[] {
  if (databaseTypes.length === 0) return [];

  const allTypes = new Set<DataType>();
  databaseTypes.forEach(dbType => {
    const types = getDataTypesForDatabase(dbType);
    types.forEach(type => allTypes.add(type));
  });

  return Array.from(allTypes).sort();
}
