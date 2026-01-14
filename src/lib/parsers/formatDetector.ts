// lib/parsers/formatDetector.ts
import { MarkdownTableParser } from './markdownParser';

export type DataFormat = 'markdown' | 'json' | 'csv' | 'unknown';

export const detectFormat = (input: string): DataFormat => {
  const trimmed = input.trim();
  if (trimmed.length === 0) return 'unknown';
  
  // 1. Check for markdown table (priority #1)
  if (isMarkdownTable(trimmed)) return 'markdown';
  
  // 2. Check for JSON
  if (isJSON(trimmed)) return 'json';
  
  // 3. Check for CSV
  if (isCSV(trimmed)) return 'csv';
  
  return 'unknown';
};

const isMarkdownTable = (input: string): boolean => {
  const lines = input.split('\n').filter(line => line.trim());
  
  // Need at least 2 lines for a valid markdown table
  if (lines.length < 2) return false;
  
  // Check for pipe structure in first line
  const firstLine = lines[0].trim();
  if (!firstLine.includes('|')) return false;
  
  // Count pipes in first line
  const pipeCount = (firstLine.match(/\|/g) || []).length;
  if (pipeCount < 2) return false; // Need at least 2 pipes for a table
  
  // Check if it could be a markdown table with separator
  const parser = new MarkdownTableParser(input);
  const result = parser.parse();
  
  // Consider it markdown if we successfully parsed headers and at least one row
  return result.headers.length > 0 && result.errors.length === 0;
};

const isJSON = (input: string): boolean => {
  try {
    const parsed = JSON.parse(input);
    // We want arrays of objects or single objects
    return Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null);
  } catch {
    return false;
  }
};

const isCSV = (input: string): boolean => {
  const lines = input.split('\n').filter(line => line.trim());
  if (lines.length < 2) return false;
  
  // Check for consistent delimiter
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  // Needs a delimiter and consistent column count
  if (commaCount > 0 || semicolonCount > 0 || tabCount > 0) {
    const delimiter = commaCount > semicolonCount && commaCount > tabCount ? ',' : 
                     semicolonCount > tabCount ? ';' : '\t';
    
    const firstCols = lines[0].split(delimiter).length;
    
    // Check if at least 80% of lines have same column count
    const consistentLines = lines.filter(line => {
      const cols = line.split(delimiter).length;
      return cols === firstCols;
    }).length;
    
    return consistentLines / lines.length > 0.8;
  }
  
  return false;
};