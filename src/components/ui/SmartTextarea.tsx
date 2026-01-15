import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MarkdownTableParser } from '../../lib/parsers/markdownParser';
import { detectFormat, getFormatDetails } from '../../lib/parsers/formatDetector';
import { DataFormat, ParseResult } from '../../types';

interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onFormatDetected?: (format: DataFormat) => void;
  onParseResult?: (result: ParseResult) => void;
  showFormatBadge?: boolean;
  className?: string;
  autoParse?: boolean;
}

export const SmartTextarea: React.FC<SmartTextareaProps> = ({
  className,
  value,
  onChange,
  onFormatDetected,
  onParseResult,
  showFormatBadge = true,
  autoParse = true,
  ...props
}) => {
  const [detectedFormat, setDetectedFormat] = useState<DataFormat>('unknown');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  // Debounce input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  // Format detection and parsing
  useEffect(() => {
    if (!debouncedValue || typeof debouncedValue !== 'string') return;
    
    const format = detectFormat(debouncedValue);
    setDetectedFormat(format);
    onFormatDetected?.(format);
    
    if (autoParse && format === 'markdown') {
      parseMarkdown(debouncedValue);
    } else if (autoParse && format !== 'unknown') {
      // TODO: Add JSON and CSV parsers when ready
      setParseResult(null);
    } else {
      setParseResult(null);
    }
  }, [debouncedValue, autoParse, onFormatDetected]);
  
  const parseMarkdown = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    setIsParsing(true);
    try {
      const parser = new MarkdownTableParser(content);
      const result = parser.parse();
      setParseResult(result);
      onParseResult?.(result);
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      // Set an error result
      const errorResult: ParseResult = {
        headers: [],
        rows: [],
        errors: [{
          type: 'format_error',
          message: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        metadata: {
          rowCount: 0,
          columnCount: 0,
          hasSeparatorRow: false,
          formatDetected: 'unknown',
          sampleValues: {}
        }
      };
      setParseResult(errorResult);
      onParseResult?.(errorResult);
    } finally {
      setIsParsing(false);
    }
  }, [onParseResult]);
  
  const formatDetails = getFormatDetails(detectedFormat);
  
  const formatColors = {
    markdown: 'border-blue-500 bg-blue-50 text-blue-800',
    json: 'border-green-500 bg-green-50 text-green-800',
    csv: 'border-purple-500 bg-purple-50 text-purple-800',
    unknown: 'border-gray-300 bg-gray-50 text-gray-800'
  };
  
  const handleExampleClick = () => {
    const example = `| Name          | Age | Email               | Active | Join Date   |
                    |---------------|-----|---------------------|--------|-------------|
                    | John Doe      | 28  | john@example.com    | true   | 2023-01-15  |
                    | Jane Smith    | 32  | jane@example.com    | false  | 2022-08-22  |
                    | Bob Johnson   | 41  | bob@example.com     | true   | 2021-03-10  |
                    | Alice Brown   | 24  | alice@example.com   | true   | 2023-06-05  |`;
    
    if (onChange) {
      onChange({ target: { value: example } } as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };
  
  const handleClear = () => {
    if (onChange) {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
    }
    setParseResult(null);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Data Input
        </label>
        
        <div className="flex items-center gap-2">
          {showFormatBadge && (
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2",
              formatColors[detectedFormat]
            )}>
              {isParsing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Parsing...</span>
                </>
              ) : (
                <>
                  <span>{formatDetails.icon}</span>
                  <span>{formatDetails.label}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="relative">
        <textarea
          className={cn(
            "w-full min-h-[200px] p-4 font-mono text-sm border rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "transition-all duration-200 resize-none",
            formatColors[detectedFormat].split(' ')[0],
            "bg-white",
            className
          )}
          value={value}
          onChange={onChange}
          placeholder={`Paste your data here...

Examples:
• Markdown table with pipes
• JSON array of objects
• CSV data with headers

Try this markdown table:
| Name | Age | Email |
|------|-----|-------|
| John | 30  | john@example.com |`}
          spellCheck={false}
          {...props}
        />
        
        {/* Example button */}
        <button
          type="button"
          onClick={handleExampleClick}
          className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Try Example
        </button>
        
        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute bottom-2 right-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      
      {/* Parse summary */}
      {parseResult && !isParsing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                📊 <span className="font-medium">{parseResult.headers.length}</span> columns
                {' × '}
                <span className="font-medium">{parseResult.rows.length}</span> rows
              </span>
              
              {parseResult.metadata.hasSeparatorRow && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  Markdown table
                </span>
              )}
            </div>
            
            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>{parseResult.errors.length} issue{parseResult.errors.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          {parseResult.errors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <div className="font-medium text-amber-800 mb-1">Issues detected:</div>
              <ul className="space-y-1">
                {parseResult.errors.slice(0, 3).map((error, idx) => (
                  <li key={idx} className="text-amber-700 flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>
                      {error.message}
                      {error.line && ` (line ${error.line})`}
                      {error.suggestion && (
                        <span className="block text-amber-600 text-xs mt-0.5">
                          Suggestion: {error.suggestion}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
                {parseResult.errors.length > 3 && (
                  <li className="text-amber-700">
                    ...and {parseResult.errors.length - 3} more issues
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {parseResult.rows.length > 0 && parseResult.errors.length === 0 && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Data parsed successfully!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};