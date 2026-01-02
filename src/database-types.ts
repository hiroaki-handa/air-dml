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
      'boolean',
      'bytea',
      'char',
      'date',
      'decimal',
      'double precision',
      'integer',
      'json',
      'jsonb',
      'numeric',
      'real',
      'serial',
      'smallint',
      'text',
      'time',
      'timestamp',
      'timestamptz',
      'uuid',
      'varchar',
    ];
  }

  // MySQL / MariaDB
  if (dbType.includes('mysql') || dbType.includes('mariadb')) {
    return [
      'bigint',
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
      'varchar',
    ];
  }

  // Oracle
  if (dbType.includes('oracle')) {
    return [
      'bfile',
      'blob',
      'char',
      'clob',
      'date',
      'float',
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
      'timestamp with time zone',
      'timestamp with local time zone',
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
      'money',
      'nchar',
      'ntext',
      'numeric',
      'nvarchar',
      'real',
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
      'xml',
    ];
  }

  // SQLite
  if (dbType.includes('sqlite')) {
    return [
      'blob',
      'integer',
      'numeric',
      'real',
      'text',
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
      'geometry',
      'integer',
      'numeric',
      'real',
      'smallint',
      'text',
      'time',
      'timestamp',
      'timestamptz',
      'varchar',
    ];
  }

  // Default: PostgreSQL
  return [
    'bigint',
    'bigserial',
    'boolean',
    'bytea',
    'char',
    'date',
    'decimal',
    'double precision',
    'integer',
    'json',
    'jsonb',
    'numeric',
    'real',
    'serial',
    'smallint',
    'text',
    'time',
    'timestamp',
    'timestamptz',
    'uuid',
    'varchar',
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
