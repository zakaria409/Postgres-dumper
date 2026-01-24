import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MarkdownTableParser } from '../../lib/parsers/markdownParser';
import { JsonParser } from '../../lib/parsers/jsonParser';
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
    } else if (autoParse && format === 'json') {
      parseJson(debouncedValue);
    } else if (autoParse && format !== 'unknown') {
      // TODO: Add CSV parser when ready
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

  const parseJson = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsParsing(true);
    try {
      const parser = new JsonParser(content);
      const result = parser.parse();
      setParseResult(result);
      onParseResult?.(result);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
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
    markdown: 'border-ember/50 bg-ember/5 text-ember',
    json: 'border-khaki-beige/50 bg-khaki-beige/5 text-khaki-beige',
    csv: 'border-taupe-grey/50 bg-taupe-grey/5 text-taupe-grey',
    unknown: 'border-taupe bg-taupe/10 text-gray-500'
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
        <label className="text-sm font-semibold uppercase tracking-wider text-khaki-beige/70">
          Source Data
        </label>

        <div className="flex items-center gap-2">
          {showFormatBadge && (
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-300",
              formatColors[detectedFormat]
            )}>
              {isParsing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin inline mr-1.5" />
                  <span>Parsing...</span>
                </>
              ) : (
                <>
                  <span className="mr-1.5 opacity-70">{formatDetails.icon}</span>
                  <span>{formatDetails.label}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative group">
        <textarea
          className={cn(
            "w-full min-h-[200px] p-6 font-mono text-sm border rounded-xl shadow-inner",
            "focus:outline-none focus:ring-2 focus:ring-ember/30 focus:border-ember/50",
            "transition-all duration-300 resize-none",
            formatColors[detectedFormat].split(' ')[0],
            "bg-gunmetal/80 text-gray-100 placeholder:text-gray-600",
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
          className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium bg-taupe/80 hover:bg-taupe text-khaki-beige hover:text-white rounded-lg border border-taupe transition-all shadow-md backdrop-blur-sm"
        >
          Try Example
        </button>

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute bottom-4 right-4 px-3 py-1.5 text-xs font-medium bg-taupe/80 hover:bg-taupe text-gray-400 hover:text-white rounded-lg border border-taupe transition-all shadow-md backdrop-blur-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Parse summary */}
      {parseResult && !isParsing && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">
                📊 <span className="font-medium text-gray-200">{parseResult.headers.length}</span> columns
                {' × '}
                <span className="font-medium text-gray-200">{parseResult.rows.length}</span> rows
              </span>

              {parseResult.metadata.hasSeparatorRow && (
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded text-xs">
                  Markdown table
                </span>
              )}
            </div>

            {parseResult.errors.length > 0 && (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>{parseResult.errors.length} issue{parseResult.errors.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {parseResult.errors.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <div className="font-medium text-amber-200 mb-2">Issues detected:</div>
              <ul className="space-y-2">
                {parseResult.errors.slice(0, 3).map((error, idx) => (
                  <li key={idx} className="text-amber-200/80 flex items-start gap-2">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <span>
                      {error.message}
                      {error.line && ` (line ${error.line})`}
                      {error.suggestion && (
                        <span className="block text-amber-400/80 text-xs mt-0.5">
                          Suggestion: {error.suggestion}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
                {parseResult.errors.length > 3 && (
                  <li className="text-amber-500/70 pl-4 text-xs">
                    ...and {parseResult.errors.length - 3} more issues
                  </li>
                )}
              </ul>
            </div>
          )}

          {parseResult.rows.length > 0 && parseResult.errors.length === 0 && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-4 h-4" />
              <span>Data parsed successfully!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};