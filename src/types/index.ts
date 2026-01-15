export type DataFormat = 'markdown' | 'json' | 'csv' | 'unknown';

export interface ColumnMapping {
  source: string;
  target: string;
  confidence: number; // 0-1 for auto-mapping
  transform?: (value: any) => any;
}

export interface ValidationError {
  type: 'duplicate' | 'type_mismatch' | 'schema_mismatch' | 'format_error';
  message: string;
  rowIndex?: number;
  column?: string;
  suggestedFix?: string;
}

export interface ParseError {
  type: 'malformed_row' | 'column_mismatch' | 'empty_table' | 'invalid_separator' | 'format_error';
  message: string;
  line?: number;
  column?: number;
  rawContent?: string;
  suggestion?: string;
}

export interface ParseResult {
  headers: string[];
  rows: any[];
  errors: ParseError[];
  metadata: {
    rowCount: number;
    columnCount: number;
    hasSeparatorRow: boolean;
    formatDetected: 'pipe' | 'grid' | 'minimal' | 'unknown';
    sampleValues: { [column: string]: any[] };
  };
}

export interface ColumnMapping {
  source: string;
  target: string;
  confidence: number; // 0-1 for auto-mapping
  transform?: (value: any) => any;
  sourceType?: string;
  targetType?: string;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  isDefault: boolean;
  lastUsed: Date;
}
