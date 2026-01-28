import { ParseResult, ColumnMapping, SmartLink, MissingColumnValue } from '../../types';

export function generateSql(
    data: ParseResult,
    mappings: ColumnMapping[],
    _deprecatedTableName?: string,
    smartLinks?: SmartLink[],
    missingColumns?: MissingColumnValue[]
): string {
    if (!data.rows.length || !mappings.length) return '';

    const activeMappings = mappings.filter(m => !m.isIgnored && m.targetTable);
    if (activeMappings.length === 0) return '-- No tables/columns selected for import';

    // Group mappings by target table
    const tableGroups: Record<string, ColumnMapping[]> = {};
    activeMappings.forEach(m => {
        const table = m.targetTable!;
        if (!tableGroups[table]) tableGroups[table] = [];
        tableGroups[table].push(m);
    });

    const sqlBlocks: string[] = [];

    for (const [tableName, tableMappings] of Object.entries(tableGroups)) {
        // Get relevant missing columns
        const tableMissingCols = missingColumns?.filter(mc => mc.tableName === tableName && mc.value !== null) || [];

        // Build column list
        const mappedColNames = tableMappings.map(m => `"${m.target}"`);
        const missingColNames = tableMissingCols.map(mc => `"${mc.columnName}"`);
        const allColumnNames = [...mappedColNames, ...missingColNames].join(', ');

        const insertPrefix = `INSERT INTO ${tableName} (${allColumnNames}) VALUES`;

        const values = data.rows.map(row => {
            // 1. Handle mapped columns (dynamic from CSV)
            const mappedValues = tableMappings.map(m => {
                // Check for Smart Link
                const link = smartLinks?.find(l => l.targetColumn === m.target);
                if (link) {
                    const val = row[m.source];
                    if (val === null || val === undefined || val === '') return 'NULL';
                    const formattedVal = formatValue(val, 'string');
                    // Use foreignKey in WHERE clause since val is the actual FK value, not the display label
                    return `(SELECT ${link.foreignKey} FROM ${link.foreignTable} WHERE ${link.foreignKey} = ${formattedVal} LIMIT 1)`;
                }

                const val = row[m.source];
                // Use targetType if available, otherwise sourceType
                return formatValue(val, m.targetType || m.sourceType);
            });

            // 2. Handle missing columns (static values)
            const missingValues = tableMissingCols.map(mc => {
                // Use the column's actual data type from the database
                return formatValue(mc.value, mc.columnInfo.dataType);
            });

            return `\n  (${[...mappedValues, ...missingValues].join(', ')})`;
        });

        sqlBlocks.push(`${insertPrefix}${values.join(',')};`);
    }

    return sqlBlocks.join('\n\n');
}

function formatValue(value: any, type?: string): string {
    if (value === null || value === undefined) return 'NULL';
    if (value === '' || value === 'null') return 'NULL';

    // Handle JSON/array types
    const typeLower = (type || '').toLowerCase();

    // Check if it's a JSON type
    if (typeLower.includes('json') || typeLower.includes('[]')) {
        // If value looks like a JSON array but has lost its quotes
        if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
            // Check if it's already valid JSON
            try {
                JSON.parse(value);
                // Valid JSON, escape single quotes for SQL
                const escaped = value.replace(/'/g, "''");
                return `'${escaped}'`;
            } catch {
                // Not valid JSON - might be missing quotes
                // Try to parse as CSV-style array and convert to JSON
                const items = value.slice(1, -1).split(',');
                const jsonItems = items.map(item => {
                    const trimmed = item.trim();
                    // If item doesn't have quotes, add them
                    if (!trimmed.startsWith('"') && !trimmed.startsWith("'")) {
                        return `"${trimmed.replace(/"/g, '\\"')}"`;
                    }
                    return trimmed;
                });
                const jsonArray = `[${jsonItems.join(',')}]`;
                const escaped = jsonArray.replace(/'/g, "''");
                return `'${escaped}'`;
            }
        }
    }

    // Handle other types
    if (typeLower.includes('int') || typeLower.includes('numeric') ||
        typeLower.includes('float') || typeLower.includes('double') ||
        typeLower.includes('decimal') || typeLower.includes('real')) {
        const num = Number(value);
        return isNaN(num) ? 'NULL' : String(num);
    }

    if (typeLower.includes('bool')) {
        const s = String(value).toLowerCase();
        return (s === 'true' || s === '1' || s === 'yes' || s === 't' || s === 'y') ? 'true' : 'false';
    }

    // String/Date escaping
    const strVal = String(value).replace(/'/g, "''");
    return `'${strVal}'`;
}