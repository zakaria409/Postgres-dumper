import { ParseResult, ParseError } from '../../types';

export class MarkdownTableParser {
  /*
  Parses markdown tables in multiple formats:
  1. Pipe tables (standard)
  2. Grid tables
  3. Minimal tables (without outer pipes)
  */
  private rawInput: string;
  private lines: string[];
  
  constructor(input: string) {
    this.rawInput = input.trim();
    this.lines = this.rawInput.split('\n').map(line => line.trim());
  }
  
  parse(): ParseResult {
    if (this.lines.length === 0) {
      return this.createEmptyResult('empty_table', 'Input is empty');
    }
    
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
          return this.createEmptyResult('format_error', 'Unsupported markdown table format');
      }
    } catch (error) {
      return this.createEmptyResult(
        'format_error',
        `Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  private detectFormat(): 'pipe' | 'grid' | 'minimal' | 'unknown' {
    if (this.lines.length < 2) return 'unknown';
    
    const firstLine = this.lines[0];
    
    // Grid table detection (has +---+ separators)
    if (firstLine.includes('+') && firstLine.match(/[-+]+/)) {
      return 'grid';
    }
    
    // Pipe table detection
    if (firstLine.includes('|')) {
      // Check if there's a separator row (second line with dashes and pipes)
      if (this.lines.length >= 2) {
        const secondLine = this.lines[1];
        const hasSeparator = secondLine.includes('|') && 
                            (secondLine.includes('-') || secondLine.includes(':'));
        return hasSeparator ? 'pipe' : 'minimal';
      }
      return 'minimal'; // No separator row
    }
    
    return 'unknown';
  }
  
  private parsePipeTable(): ParseResult {
    const errors: ParseError[] = [];
    const rows: any[] = [];
    
    // Find separator row index
    let separatorIndex = -1;
    for (let i = 1; i < this.lines.length; i++) {
      if (this.isSeparatorRow(this.lines[i])) {
        separatorIndex = i;
        break;
      }
    }
    
    // If no separator found but we have pipe structure, assume first line is header
    if (separatorIndex === -1) {
      errors.push({
        type: 'invalid_separator',
        message: 'No separator row found (expected a row with |---|)',
        suggestion: 'Add a separator row with dashes between header and data'
      });
      separatorIndex = 0; // Treat first line as header
    }
    
    // Parse headers
    const headerLine = separatorIndex > 0 ? this.lines[separatorIndex - 1] : this.lines[0];
    const headers = this.parsePipeLine(headerLine, errors, separatorIndex > 0 ? separatorIndex - 1 : 0);
    
    if (headers.length === 0) {
      errors.push({
        type: 'malformed_row',
        message: 'No valid headers found',
        line: separatorIndex > 0 ? separatorIndex : 1,
        suggestion: 'Check that your header row has proper pipe characters'
      });
      return this.createResult(headers, rows, errors, 'pipe', false);
    }
    
    // Start parsing data rows after separator
    const dataStartIndex = separatorIndex + 1;
    for (let i = dataStartIndex; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (line.trim() === '') continue;
      if (this.isSeparatorRow(line)) continue;
      
      const rowValues = this.parsePipeLine(line, errors, i);
      
      if (rowValues.length !== headers.length) {
        errors.push({
          type: 'column_mismatch',
          message: `Row ${i - dataStartIndex + 1} has ${rowValues.length} columns, expected ${headers.length}`,
          line: i + 1,
          rawContent: line,
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
    
    return this.createResult(headers, rows, errors, 'pipe', separatorIndex > 0);
  }
  
  private parsePipeLine(line: string, errors: ParseError[], lineNumber: number): string[] {
    // Remove leading/trailing pipes
    let cleanLine = line.trim();
    if (cleanLine.startsWith('|')) cleanLine = cleanLine.substring(1);
    if (cleanLine.endsWith('|')) cleanLine = cleanLine.slice(0, -1);
    
    // Handle escaped pipes
    const tempMarker = '___PIPE___';
    const escapedLine = cleanLine.replace(/\\\|/g, tempMarker);
    
    // Split by unescaped pipes
    const cells = escapedLine.split('|').map(cell => {
      const unescaped = cell.replace(new RegExp(tempMarker, 'g'), '|');
      return unescaped.trim();
    });
    
    // Filter out separator cells
    return cells.filter(cell => {
      const isSeparator = cell.match(/^[-: ]+$/);
      return !isSeparator;
    });
  }
  
  private isSeparatorRow(line: string): boolean {
    if (!line.includes('|')) return false;
    
    const cleanLine = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    const cells = cleanLine.split('|').map(cell => cell.trim());
    
    // Check if all cells contain only dashes, colons, or spaces
    return cells.every(cell => {
      if (cell === '') return true;
      return !!cell.match(/^[-: ]+$/);
    });
  }
  
  private createRowObject(headers: string[], values: string[]): any {
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = index < values.length ? values[index] : '';
      row[header] = this.inferType(value);
    });
    
    return row;
  }
  
  private inferType(value: string): any {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    
    const trimmed = value.trim();
    
    // Boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    // Integer
    if (/^-?\d+$/.test(trimmed)) {
      const intVal = parseInt(trimmed, 10);
      if (!isNaN(intVal)) return intVal;
    }
    
    // Float
    if (/^-?\d+\.\d+$/.test(trimmed)) {
      const floatVal = parseFloat(trimmed);
      if (!isNaN(floatVal)) return floatVal;
    }
    
    // Date (ISO format)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
    if (isoDateRegex.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    
    // Date (common formats)
    const dateFormats = [
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    ];
    
    for (const format of dateFormats) {
      if (format.test(trimmed)) {
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) return date.toISOString();
      }
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
      return [...rowValues, ...Array(expectedLength - rowValues.length).fill('')];
    }
  }
  
  private getSampleValues(rows: any[], headers: string[], sampleCount: number = 3): { [column: string]: any[] } {
    const samples: { [column: string]: any[] } = {};
    
    headers.forEach(header => {
      samples[header] = rows
        .slice(0, sampleCount)
        .map(row => row[header])
        .filter(val => val !== null && val !== undefined && val !== '');
    });
    
    return samples;
  }
  
  private parseGridTable(): ParseResult {
    // TODO: Implement grid table parsing
    return this.createEmptyResult(
      'format_error',
      'Grid tables are not yet supported',
      'grid'
    );
  }
  
  private parseMinimalTable(): ParseResult {
    // TODO: Implement minimal table parsing
    return this.createEmptyResult(
      'format_error',
      'Minimal tables are not yet supported',
      'minimal'
    );
  }
  
  private createEmptyResult(
    errorType: ParseError['type'],
    errorMessage: string,
    formatDetected: 'pipe' | 'grid' | 'minimal' | 'unknown' = 'unknown'
  ): ParseResult {
    return {
      headers: [],
      rows: [],
      errors: [{ type: errorType, message: errorMessage }],
      metadata: {
        rowCount: 0,
        columnCount: 0,
        hasSeparatorRow: false,
        formatDetected,
        sampleValues: {}
      }
    };
  }
  
  private createResult(
    headers: string[],
    rows: any[],
    errors: ParseError[],
    formatDetected: 'pipe' | 'grid' | 'minimal',
    hasSeparatorRow: boolean
  ): ParseResult {
    return {
      headers,
      rows,
      errors,
      metadata: {
        rowCount: rows.length,
        columnCount: headers.length,
        hasSeparatorRow,
        formatDetected,
        sampleValues: this.getSampleValues(rows, headers, 3)
      }
    };
  }
}