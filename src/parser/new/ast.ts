/**
 * AIR-DML AST (Abstract Syntax Tree) Node Definitions
 *
 * Defines the structure of the parsed AIR-DML document.
 */

import type { SourcePosition } from './tokens';

/**
 * Source range (start and end positions)
 */
export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

/**
 * Base AST node
 */
export interface ASTNode {
  kind: string;
  range: SourceRange;
  leadingComments?: string[];
}

// ============================================
// Project
// ============================================

export interface ProjectNode extends ASTNode {
  kind: 'Project';
  name: string;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  databaseType?: string;
  note?: string;
}

// ============================================
// Table
// ============================================

export interface TableNode extends ASTNode {
  kind: 'Table';
  name: string;
  columns: ColumnNode[];
  indexes?: IndexNode[];
  settings: TableSettings;
  note?: string;
}

export interface TableSettings {
  alias?: string;
  posX?: number;
  posY?: number;
  color?: string;
}

// ============================================
// Column
// ============================================

export interface ColumnNode extends ASTNode {
  kind: 'Column';
  name: string;
  type: string;
  typeParams?: string;
  constraints: ColumnConstraints;
}

export interface ColumnConstraints {
  pk?: boolean;
  fk?: boolean;
  unique?: boolean;
  notNull?: boolean;
  increment?: boolean;
  alias?: string;
  note?: string;
}

// ============================================
// Reference
// ============================================

export interface RefNode extends ASTNode {
  kind: 'Ref';
  name?: string;
  from: RefEndpoint;
  to: RefEndpoint;
  relationType: '>' | '<' | '-' | '<>' | '~';
  settings: RefSettings;
}

export interface RefEndpoint {
  table: string;
  column: string;
}

export interface RefSettings {
  swapEdge?: boolean;
  note?: string;
}

// ============================================
// Area (AIR-DML specific)
// ============================================

export interface AreaNode extends ASTNode {
  kind: 'Area';
  name: string;
  tables: string[];  // Table names referenced in this area
  settings: AreaSettings;
  commonColumns?: ColumnNode[];
  note?: string;
}

export interface AreaSettings {
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  color?: string;
  databaseType?: string;
  labelHorizontal?: 'left' | 'center' | 'right';
  labelVertical?: 'top' | 'center' | 'bottom';
}

// ============================================
// Index
// ============================================

export interface IndexNode extends ASTNode {
  kind: 'Index';
  columns: string[];
  settings: IndexSettings;
}

export interface IndexSettings {
  unique?: boolean;
  pk?: boolean;
  name?: string;
}

// ============================================
// Program (Root node)
// ============================================

export interface ProgramNode extends ASTNode {
  kind: 'Program';
  project?: ProjectNode;
  tables: TableNode[];
  refs: RefNode[];
  areas: AreaNode[];
}
