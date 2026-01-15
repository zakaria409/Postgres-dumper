import { DataFormat } from '../../types';
import { MarkdownTableParser } from './markdownParser';

export const detectFormat = (input: string): DataFormat => {
  const trimmed = input.trim();
  if (trimmed.length === 0) return 'unknown';
  
  // Priority 1: Markdown table
  if (isMarkdownTable(trimmed)) return 'markdown';
  
  // Priority 2: JSON
  if (isJSON(trimmed)) return 'json';
  
  // Priority 3: CSV
  if (isCSV(trimmed)) return 'csv';
  
  return 'unknown';
};

const isMarkdownTable = (input: string): boolean => {
  const lines = input.split('\n').filter(line => line.trim());
  
  // Need at least 2 lines for a valid markdown table
  if (lines.length < 2) return false;
  
  // Quick check: first line must have pipes or grid markers
  const firstLine = lines[0];
  if (!firstLine.includes('|') && !firstLine.includes('+')) return false;
  
  // Use the parser to validate
  try {
    const parser = new MarkdownTableParser(input);
    const result = parser.parse();
    
    // Consider it markdown if we successfully parsed headers
    // Allow some errors (like missing separator) but need valid headers
    return result.headers.length > 0 && result.errors.every(e => 
      e.type !== 'malformed_row' && e.type !== 'empty_table'
    );
  } catch {
    return false;
  }
};

const isJSON = (input: string): boolean => {
  const trimmed = input.trim();
  
  // Must start with [ or {
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return false;
  
  try {
    const parsed = JSON.parse(trimmed);
    // Valid JSON that's either an array or object
    return Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null);
  } catch {
    // Try to see if it's NDJSON (newline-delimited JSON)
    if (trimmed.includes('\n')) {
      const lines = trimmed.split('\n').filter(line => line.trim());
      try {
        // Try to parse each line as JSON
        const allValid = lines.every(line => {
          try {
            JSON.parse(line);
            return true;
          } catch {
            return false;
          }
        });
        return allValid && lines.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  }
};

const isCSV = (input: string): boolean => {
  const lines = input.split('\n').filter(line => line.trim());
  if (lines.length < 2) return false;
  
  const firstLine = lines[0];
  
  // Check for common delimiters
  const delimiters = [
    { char: ',', count: (firstLine.match(/,/g) || []).length },
    { char: ';', count: (firstLine.match(/;/g) || []).length },
    { char: '\t', count: (firstLine.match(/\t/g) || []).length },
    { char: '|', count: (firstLine.match(/\|/g) || []).length },
  ];
  
  // Find the most common delimiter
  delimiters.sort((a, b) => b.count - a.count);
  const primaryDelimiter = delimiters[0];
  
  // Need at least one delimiter in first line
  if (primaryDelimiter.count === 0) return false;
  
  const firstColCount = firstLine.split(primaryDelimiter.char).length;
  
  // Check if most lines have the same column count
  const consistentLines = lines.filter(line => {
    const cols = line.split(primaryDelimiter.char).length;
    return cols === firstColCount;
  }).length;
  
  const consistencyRatio = consistentLines / lines.length;
  
  // Require high consistency for CSV
  return consistencyRatio > 0.8 && firstColCount > 1;
};

export const getFormatDetails = (format: DataFormat) => {
  const details = {
    markdown: {
      label: 'Markdown Table',
      color: 'blue',
      icon: '📊'
    },
    json: {
      label: 'JSON',
      color: 'green',
      icon: '📄'
    },
    csv: {
      label: 'CSV',
      color: 'purple',
      icon: '📋'
    },
    unknown: {
      label: 'Unknown Format',
      color: 'gray',
      icon: '❓'
    }
  };
  
  return details[format];
};