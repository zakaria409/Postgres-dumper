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
                    return `(SELECT ${link.foreignKey} FROM ${link.foreignTable} WHERE ${link.foreignLabel} = ${formattedVal} LIMIT 1)`;
                }

                const val = row[m.source];
                return formatValue(val, m.sourceType);
            });

            // 2. Handle missing columns (static values)
            const missingValues = tableMissingCols.map(mc => {
                // Infer type from Postgres data type
                let type = 'string';
                const dt = mc.columnInfo.dataType.toLowerCase();
                if (dt.includes('int') || dt.includes('numeric') || dt.includes('float') || dt.includes('double')) {
                    type = 'number';
                } else if (dt.includes('bool')) {
                    type = 'boolean';
                }

                return formatValue(mc.value, type);
            });

            return `\n  (${[...mappedValues, ...missingValues].join(', ')})`;
        });

        sqlBlocks.push(`${insertPrefix}${values.join(',')};`);
    }

    return sqlBlocks.join('\n\n');
}

function formatValue(value: any, type?: string): string {
    if (value === null || value === undefined) return 'NULL';
    if (value === '' || value === 'null') return 'NULL'; // Explicit check for string "null"

    if (type === 'number') {
        const num = Number(value);
        return isNaN(num) ? 'NULL' : String(num);
    }

    if (type === 'boolean') {
        const s = String(value).toLowerCase();
        return (s === 'true' || s === '1' || s === 'yes' || s === 't') ? 'true' : 'false';
    }

    // String/Date escaping
    const strVal = String(value).replace(/'/g, "''");
    return `'${strVal}'`;
}
