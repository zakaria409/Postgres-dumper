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