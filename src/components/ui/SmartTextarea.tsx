import React from 'react';
import { cn } from '../../lib/utils';

// Temporary types
export type DataFormat = 'markdown' | 'json' | 'csv' | 'unknown';

interface ParseResult {
  headers: string[];
  rows: any[];
  errors: any[];
  metadata: {
    rowCount: number;
    columnCount: number;
    hasSeparatorRow: boolean;
    formatDetected: string;
  };
}

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onFormatDetected?: (format: DataFormat) => void;
  onParseResult?: (result: ParseResult) => void;
  className?: string;
}

// Simple format detector for now
const detectFormat = (input: string): DataFormat => {
  if (!input.trim()) return 'unknown';
  
  const trimmed = input.trim();
  
  // Check for markdown table
  const lines = trimmed.split('\n').filter(line => line.trim());
  if (lines.length >= 2) {
    const firstLine = lines[0];
    if (firstLine.includes('|') && lines.some(line => line.includes('|'))) {
      // Check if second line is a separator
      if (lines.length >= 2 && lines[1].includes('|') && lines[1].includes('-')) {
        return 'markdown';
      }
    }
  }
  
  // Check for JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }
  
  // Check for CSV
  if (lines.length > 1) {
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    if (commaCount > 0) return 'csv';
  }
  
  return 'unknown';
};

// Simple markdown parser for now
const parseMarkdown = (input: string): ParseResult => {
  const lines = input.trim().split('\n').filter(line => line.trim());
  const errors: any[] = [];
  
  if (lines.length < 2) {
    return {
      headers: [],
      rows: [],
      errors: [{ type: 'empty', message: 'Not enough data' }],
      metadata: { rowCount: 0, columnCount: 0, hasSeparatorRow: false, formatDetected: 'markdown' }
    };
  }
  
  // Parse headers (first line)
  const headers = lines[0]
    .split('|')
    .map(h => h.trim())
    .filter(h => h && !h.match(/^[-:|]+$/));
  
  // Find data rows (skip separator if exists)
  let startIndex = 1;
  if (lines[1] && lines[1].includes('-') && lines[1].includes('|')) {
    startIndex = 2;
  }
  
  const rows = lines.slice(startIndex).map((line, index) => {
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    const row: any = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] || '';
    });
    return row;
  });
  
  return {
    headers,
    rows,
    errors,
    metadata: {
      rowCount: rows.length,
      columnCount: headers.length,
      hasSeparatorRow: startIndex === 2,
      formatDetected: 'markdown'
    }
  };
};

export const SmartTextarea: React.FC<SmartTextareaProps> = ({
  className,
  value,
  onChange,
  onFormatDetected,
  onParseResult,
  ...props
}) => {
  const formatColors = {
    markdown: 'border-blue-500 bg-blue-50',
    json: 'border-green-500 bg-green-50',
    csv: 'border-purple-500 bg-purple-50',
    unknown: 'border-gray-300 bg-gray-50'
  };
  
  const formatLabels = {
    markdown: 'Markdown Table',
    json: 'JSON',
    csv: 'CSV',
    unknown: 'Unknown Format'
  };
  
  const detectedFormat = detectFormat(value as string || '');
  
  // Parse on change
  React.useEffect(() => {
    if (onFormatDetected) {
      onFormatDetected(detectedFormat);
    }
    
    if (onParseResult && detectedFormat === 'markdown' && value) {
      const result = parseMarkdown(value as string);
      onParseResult(result);
    }
  }, [value, detectedFormat, onFormatDetected, onParseResult]);
  
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Paste your data here
        </label>
        
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium border",
          formatColors[detectedFormat]
        )}>
          {formatLabels[detectedFormat]}
        </div>
      </div>
      
      <textarea
        className={cn(
          "w-full min-h-[200px] p-4 font-mono text-sm border rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "transition-all duration-200 resize-none",
          formatColors[detectedFormat],
          className
        )}
        value={value}
        onChange={onChange}
        placeholder={`Paste markdown table, JSON, or CSV...

Example markdown table:
| Name     | Age | Email               |
|----------|-----|---------------------|
| John Doe | 30  | john@example.com    |
| Jane Smith | 25 | jane@example.com    |`}
        spellCheck={false}
        {...props}
      />
    </div>
  );
};