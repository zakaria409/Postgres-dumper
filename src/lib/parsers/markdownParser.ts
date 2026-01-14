export interface ParseResult {
  headers: string[];
  rows: any[];
  errors: ParseError[];
  metadata: {
    rowCount: number;
    columnCount: number;
    hasSeparatorRow: boolean;
    formatDetected: 'pipe' | 'grid' | 'minimal';
  };
}

export interface ParseError {
  type: 'malformed_row' | 'column_mismatch' | 'empty_table' | 'invalid_separator';
  message: string;
  line?: number;
  column?: number;
  rawContent?: string;
  suggestion?: string;
}

/**
 * Parses markdown tables in multiple formats:
 * 1. Pipe tables (standard)
 * 2. Grid tables
 * 3. Minimal tables (without outer pipes)
 */
export class MarkdownTableParser {
  private rawInput: string;
  private lines: string[];
  
  constructor(input: string) {
    this.rawInput = input.trim();
    this.lines = this.rawInput.split('\n').map(line => line.trim());
  }
  
  parse(): ParseResult {
    if (this.lines.length === 0) {
      return {
        headers: [],
        rows: [],
        errors: [{ type: 'empty_table', message: 'Input is empty' }],
        metadata: { rowCount: 0, columnCount: 0, hasSeparatorRow: false, formatDetected: 'pipe' }
      };
    }
    
    // Detect table format
    const format = this.detectFormat();
    
    try {
      switch (format) {
        case 'pipe':
          return this.parsePipeTable();
        case 'grid':
          return this.parseGridTable();
        case 'minimal':
          return this.parseMinimalTable();
        default:
          return this.parsePipeTable(); // Default fallback
      }
    } catch (error) {
      return {
        headers: [],
        rows: [],
        errors: [{
          type: 'malformed_row',
          message: `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          rawContent: this.rawInput.substring(0, 100)
        }],
        metadata: { rowCount: 0, columnCount: 0, hasSeparatorRow: false, formatDetected: 'pipe' }
      };
    }
  }
  
  private detectFormat(): 'pipe' | 'grid' | 'minimal' {
    const firstLine = this.lines[0];
    
    // Grid table detection (has +---+ separators)
    if (firstLine.includes('+') && firstLine.includes('-')) {
      return 'grid';
    }
    
    // Pipe table detection (has | characters)
    if (firstLine.includes('|')) {
      // Check if it has a separator row (second line with dashes and pipes)
      if (this.lines.length >= 2) {
        const secondLine = this.lines[1];
        if (secondLine.includes('|') && secondLine.includes('-')) {
          return 'pipe';
        }
      }
    }
    
    // Minimal table (no outer pipes, but consistent spacing)
    return 'minimal';
  }
  
  private parsePipeTable(): ParseResult {
    const errors: ParseError[] = [];
    const rows: any[] = [];
    
    // Find separator row index
    let separatorIndex = -1;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.isSeparatorRow(this.lines[i])) {
        separatorIndex = i;
        break;
      }
    }
    
    if (separatorIndex === -1) {
      errors.push({
        type: 'invalid_separator',
        message: 'No separator row found (expected a row with |---|)',
        suggestion: 'Add a separator row with dashes between header and data'
      });
      // Try to parse without separator
      separatorIndex = 1; // Assume second line is data
    }
    
    // Parse headers (line before separator)
    const headerLine = this.lines[separatorIndex - 1] || this.lines[0];
    const headers = this.parsePipeLine(headerLine, errors, 0);
    
    // Validate separator matches header count
    if (separatorIndex > 0 && separatorIndex < this.lines.length) {
      const separatorCols = this.parsePipeLine(this.lines[separatorIndex], errors, separatorIndex)
        .filter(col => col && !col.match(/^[-:|]+$/));
      
      if (separatorCols.length > 0 && separatorCols.length !== headers.length) {
        errors.push({
          type: 'column_mismatch',
          message: `Separator row has ${separatorCols.length} columns, but header has ${headers.length}`,
          line: separatorIndex + 1,
          suggestion: 'Ensure separator row matches header column count'
        });
      }
    }
    
    // Parse data rows (after separator)
    for (let i = separatorIndex + 1; i < this.lines.length; i++) {
      if (this.lines[i].trim() === '') continue; // Skip empty lines
      if (this.isSeparatorRow(this.lines[i])) continue; // Skip extra separators
      
      const rowValues = this.parsePipeLine(this.lines[i], errors, i);
      
      // Handle column count mismatch
      if (rowValues.length !== headers.length) {
        errors.push({
          type: 'column_mismatch',
          message: `Row ${i - separatorIndex} has ${rowValues.length} columns, expected ${headers.length}`,
          line: i + 1,
          rawContent: this.lines[i],
          suggestion: rowValues.length > headers.length 
            ? 'Too many columns - check for extra pipe characters' 
            : 'Too few columns - check for missing values'
        });
        
        // Adjust row to match headers
        const adjustedRow = this.adjustRowToHeaders(rowValues, headers.length);
        rows.push(this.createRowObject(headers, adjustedRow));
      } else {
        rows.push(this.createRowObject(headers, rowValues));
      }
    }
    
    return {
      headers,
      rows,
      errors,
      metadata: {
        rowCount: rows.length,
        columnCount: headers.length,
        hasSeparatorRow: separatorIndex > 0,
        formatDetected: 'pipe'
      }
    };
  }
  
  private parsePipeLine(line: string, errors: ParseError[], lineNumber: number): string[] {
    // Clean the line: remove leading/trailing pipes if they exist
    let cleanLine = line.trim();
    if (cleanLine.startsWith('|')) cleanLine = cleanLine.substring(1);
    if (cleanLine.endsWith('|')) cleanLine = cleanLine.slice(0, -1);
    
    // Split by pipe, preserving empty values
    const cells = cleanLine.split('|').map(cell => {
      const trimmed = cell.trim();
      
      // Handle escaped pipes if any
      if (trimmed.includes('\\|')) {
        return trimmed.replace(/\\\|/g, '|');
      }
      
      return trimmed;
    });
    
    // Validate cells aren't just separator markers
    const validCells = cells.filter(cell => {
      if (cell.match(/^[-:|]+$/) && cell.includes('-')) {
        // This looks like a separator cell, skip it
        return false;
      }
      return true;
    });
    
    return validCells;
  }
  
  private isSeparatorRow(line: string): boolean {
    if (!line.includes('|')) return false;
    
    const cleanLine = line.trim();
    const cells = cleanLine.split('|').map(cell => cell.trim());
    
    // Check if all cells contain only dashes, colons, or spaces
    return cells.every(cell => {
      if (cell === '') return true; // Empty between pipes is okay
      return !!cell.match(/^[-: ]+$/);
    });
  }
  
  private createRowObject(headers: string[], values: string[]): any {
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = index < values.length ? values[index] : '';
      
      // Convert string values to appropriate types
      row[header] = this.inferType(value);
    });
    
    return row;
  }
  
  private inferType(value: string): any {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    
    // Check for numbers
    if (!isNaN(Number(value)) && value.trim() !== '') {
      const num = Number(value);
      if (Number.isInteger(num) && !value.includes('.')) {
        return num;
      }
      return num;
    }
    
    // Check for booleans
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === 'false') {
      return lowerValue === 'true';
    }
    
    // Check for date/time
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return date.toISOString();
    }
    
    // Return as string
    return value;
  }
  
  private adjustRowToHeaders(rowValues: string[], expectedLength: number): string[] {
    if (rowValues.length === expectedLength) return rowValues;
    
    if (rowValues.length > expectedLength) {
      // Truncate extra values
      return rowValues.slice(0, expectedLength);
    } else {
      // Pad with empty values
      const padded = [...rowValues];
      while (padded.length < expectedLength) {
        padded.push('');
      }
      return padded;
    }
  }
  
  // Additional format parsers (for future expansion)
  private parseGridTable(): ParseResult {
    // Implementation for grid tables
    return {
      headers: [],
      rows: [],
      errors: [{ type: 'malformed_row', message: 'Grid tables not yet supported' }],
      metadata: { rowCount: 0, columnCount: 0, hasSeparatorRow: false, formatDetected: 'grid' }
    };
  }
  
  private parseMinimalTable(): ParseResult {
    // Implementation for minimal tables (without pipes)
    return {
      headers: [],
      rows: [],
      errors: [{ type: 'malformed_row', message: 'Minimal tables not yet supported' }],
      metadata: { rowCount: 0, columnCount: 0, hasSeparatorRow: false, formatDetected: 'minimal' }
    };
  }
}