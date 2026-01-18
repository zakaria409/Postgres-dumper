import { ParseResult, ColumnMapping } from '../../types';

export function generateSql(
    data: ParseResult,
    mappings: ColumnMapping[],
    tableName: string = 'public.table_name'
): string {
    if (!data.rows.length || !mappings.length) return '';

    const activeMappings = mappings.filter(m => !m.isIgnored);
    if (activeMappings.length === 0) return '-- No columns selected for import';

    const columns = activeMappings.map(m => `"${m.target}"`).join(', ');
    const insertPrefix = `INSERT INTO ${tableName} (${columns}) VALUES`;

    const values = data.rows.map(row => {
        const rowValues = activeMappings.map(m => {
            const val = row[m.source];
            return formatValue(val, m.sourceType);
        });
        return `\n  (${rowValues.join(', ')})`;
    });

    return `${insertPrefix}${values.join(',')};`;
}

function formatValue(value: any, type?: string): string {
    if (value === null || value === undefined) return 'NULL';
    if (value === '') return 'NULL'; // Treat empty strings as NULL for now, arguably configurable

    if (type === 'number') {
        const num = Number(value);
        return isNaN(num) ? 'NULL' : String(num);
    }

    if (type === 'boolean') {
        return String(value).toLowerCase() === 'true' ? 'true' : 'false';
    }

    // String/Date escaping
    // Very basic escaping for single quotes
    const strVal = String(value).replace(/'/g, "''");
    return `'${strVal}'`;
}
