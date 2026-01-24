import { ParseResult, ParseError } from '../../types';

export class JsonParser {
    private rawInput: string;
    private parsedData: any[] = [];
    private parseErrors: ParseError[] = [];

    constructor(input: string) {
        this.rawInput = input.trim();
    }

    parse(): ParseResult {
        this.parseInput();

        if (this.parsedData.length === 0 && this.parseErrors.length === 0) {
            return this.createEmptyResult('empty_table', 'Input is empty or invalid');
        }

        const headers = this.extractHeaders();
        // Normalize rows to ensure all headers are present
        const rows = this.parsedData.map(row => this.normalizeRow(row, headers));

        return {
            headers,
            rows,
            errors: this.parseErrors,
            metadata: {
                rowCount: rows.length,
                columnCount: headers.length,
                hasSeparatorRow: false, // Not applicable for JSON
                formatDetected: 'json',
                sampleValues: this.getSampleValues(rows, headers, 3)
            }
        };
    }

    private parseInput() {
        if (!this.rawInput) return;

        try {
            // Try standard JSON parse
            const parsed = JSON.parse(this.rawInput);

            if (Array.isArray(parsed)) {
                this.parsedData = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                // Single object treated as one row
                this.parsedData = [parsed];
            } else {
                this.parseErrors.push({
                    type: 'format_error',
                    message: 'JSON input must be an array or an object',
                    suggestion: 'Ensure the input starts with [ or {'
                });
            }
        } catch (e) {
            // If standard parse fails, try NDJSON (Newline Delimited JSON)
            if (this.rawInput.includes('\n')) {
                this.parseNDJSON();
            } else {
                this.parseErrors.push({
                    type: 'format_error',
                    message: `Invalid JSON: ${(e as Error).message}`,
                    suggestion: 'Check for missing quotes, commas, or braces'
                });
            }
        }
    }

    private parseNDJSON() {
        const lines = this.rawInput.split('\n').filter(line => line.trim());
        const rows: any[] = [];
        const errors: ParseError[] = [];

        lines.forEach((line, index) => {
            try {
                const parsed = JSON.parse(line);
                if (typeof parsed === 'object' && parsed !== null) {
                    rows.push(parsed);
                } else {
                    errors.push({
                        type: 'malformed_row',
                        message: `Line ${index + 1} is not a valid JSON object`,
                        line: index + 1,
                        rawContent: line
                    });
                }
            } catch (e) {
                errors.push({
                    type: 'format_error',
                    message: `Invalid JSON on line ${index + 1}`,
                    line: index + 1,
                    rawContent: line
                });
            }
        });

        if (rows.length > 0) {
            this.parsedData = rows;
            this.parseErrors = errors; // Keep track of line-level errors
        } else {
            if (errors.length === lines.length) {
                // All lines failed
                this.parseErrors = errors;
            }
        }
    }

    private extractHeaders(): string[] {
        if (this.parsedData.length === 0) return [];

        // Collect all unique keys from all objects, including flattened nested keys
        const keys = new Set<string>();
        this.parsedData.forEach(row => {
            if (row && typeof row === 'object') {
                this.collectKeys(row, '', keys);
            }
        });
        return Array.from(keys).sort();
    }

    private collectKeys(obj: any, prefix: string, keys: Set<string>) {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];

            // If the value is an object but not null, and not an array, recursively collect keys
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.collectKeys(value, fullKey, keys);
            } else {
                // For arrays, primitive values, and null, add the key as is
                keys.add(fullKey);
            }
        });
    }

    private normalizeRow(row: any, headers: string[]): any {
        const normalized: any = {};
        headers.forEach(header => {
            // Get value by navigating through nested structure
            const val = this.getValueByPath(row, header);
            normalized[header] = (val === undefined) ? null : this.inferType(val);
        });
        return normalized;
    }

    private getValueByPath(obj: any, path: string): any {
        if (!obj || typeof obj !== 'object') return undefined;

        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            current = current[part];
        }

        return current;
    }

    private inferType(value: any): any {
        if (value === null || value === undefined) return null;

        if (typeof value === 'string') {
            // Keep date strings as strings
            const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
            if (isoDateRegex.test(value)) {
                return value;
            }
            return value;
        }

        // Handle arrays by converting to JSON string
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }

        // Handle objects by converting to JSON string
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        // Return primitives as is
        return value;
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

    private createEmptyResult(
        errorType: ParseError['type'],
        errorMessage: string
    ): ParseResult {
        return {
            headers: [],
            rows: [],
            errors: [{ type: errorType, message: errorMessage }],
            metadata: {
                rowCount: 0,
                columnCount: 0,
                hasSeparatorRow: false,
                formatDetected: 'json',
                sampleValues: {}
            }
        };
    }
}