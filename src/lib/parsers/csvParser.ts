import { ParseResult, ParseError } from '../../types';

export class CsvParser {
    private rawInput: string;
    private parseErrors: ParseError[] = [];
    private delimiter: string = ',';

    constructor(input: string) {
        this.rawInput = input.trim();
        this.delimiter = this.detectDelimiter(this.rawInput);
    }

    parse(): ParseResult {
        if (!this.rawInput) {
            return this.createEmptyResult('empty_table', 'Input is empty');
        }

        const lines = this.rawInput.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length === 0) {
            return this.createEmptyResult('empty_table', 'Input contains no data');
        }

        const rows: any[] = [];

        // Parse headers from the first line
        const headers = this.parseLine(lines[0]);

        // Validate headers
        if (headers.length === 0) {
            return this.createEmptyResult('format_error', 'Could not parse headers');
        }

        // Parse remaining lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = this.parseLine(line);

            if (values.length !== headers.length) {
                this.parseErrors.push({
                    type: 'column_mismatch',
                    message: `Row ${i} has ${values.length} columns, expected ${headers.length}`,
                    line: i + 1,
                    rawContent: line,
                    suggestion: 'Check for unescaped delimiters or missing values'
                });

                // Try to adjust row
                const adjusted = this.adjustRow(values, headers.length);
                rows.push(this.createRowObject(headers, adjusted));
            } else {
                rows.push(this.createRowObject(headers, values));
            }
        }

        return {
            headers,
            rows,
            errors: this.parseErrors,
            metadata: {
                rowCount: rows.length,
                columnCount: headers.length,
                hasSeparatorRow: false,
                formatDetected: 'csv',
                sampleValues: this.getSampleValues(rows, headers)
            }
        };
    }

    private detectDelimiter(input: string): string {
        const firstLine = input.split('\n')[0];
        const commas = (firstLine.match(/,/g) || []).length;
        const tabs = (firstLine.match(/\t/g) || []).length;
        const pipes = (firstLine.match(/\|/g) || []).length;
        const semicolons = (firstLine.match(/;/g) || []).length;

        const max = Math.max(commas, tabs, pipes, semicolons);
        if (max === 0) return ','; // Default

        if (max === tabs) return '\t';
        if (max === pipes) return '|';
        if (max === semicolons) return ';';
        return ',';
    }

    private parseLine(line: string): string[] {
        const values: string[] = [];
        let currentValue = '';
        let insideQuotes = false;
        let bracketDepth = 0;
        let braceDepth = 0;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            // Handle quotes - but skip if we're inside JSON structures
            if (char === '"' && bracketDepth === 0 && braceDepth === 0) {
                if (insideQuotes && nextChar === '"') {
                    // Escaped quote in CSV
                    currentValue += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle CSV quotes
                    insideQuotes = !insideQuotes;
                }
            }
            // Track JSON brackets and braces
            else if (char === '[' && !insideQuotes) {
                bracketDepth++;
                currentValue += char;
            }
            else if (char === ']' && !insideQuotes) {
                bracketDepth--;
                currentValue += char;
            }
            else if (char === '{' && !insideQuotes) {
                braceDepth++;
                currentValue += char;
            }
            else if (char === '}' && !insideQuotes) {
                braceDepth--;
                currentValue += char;
            }
            // Only split on delimiter when not inside quotes or JSON structures
            else if (char === this.delimiter && !insideQuotes && bracketDepth === 0 && braceDepth === 0) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }

        // Push the last value
        values.push(currentValue);

        return values;
    }

    private createRowObject(headers: string[], values: string[]): any {
        const row: any = {};
        headers.forEach((header, index) => {
            const val = index < values.length ? values[index] : '';
            row[header] = this.inferType(val);
        });
        return row;
    }

    private adjustRow(values: string[], expected: number): string[] {
        if (values.length > expected) return values.slice(0, expected);
        while (values.length < expected) values.push('');
        return values;
    }

    private inferType(value: string): any {
        if (!value) return null;

        // Try number
        if (!isNaN(Number(value)) && value.trim() !== '') {
            return Number(value);
        }

        // Try boolean
        const lower = value.toLowerCase().trim();
        if (lower === 'true') return true;
        if (lower === 'false') return false;

        return value;
    }

    private getSampleValues(rows: any[], headers: string[], count = 3): { [key: string]: any[] } {
        const samples: { [key: string]: any[] } = {};

        headers.forEach(header => {
            samples[header] = rows
                .slice(0, count)
                .map(r => r[header])
                .filter(v => v !== null && v !== '');
        });

        return samples;
    }

    private createEmptyResult(type: ParseError['type'], message: string): ParseResult {
        return {
            headers: [],
            rows: [],
            errors: [{ type, message }],
            metadata: {
                rowCount: 0,
                columnCount: 0,
                hasSeparatorRow: false,
                formatDetected: 'csv',
                sampleValues: {}
            }
        };
    }
}
