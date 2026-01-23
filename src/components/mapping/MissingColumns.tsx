import { useState, useEffect } from 'react';
import { AlertCircle, Check, Link2, Database } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MissingColumnValue } from '../../types';
import { invoke } from '@tauri-apps/api/core';

interface MissingColumnsProps {
    missingColumns: MissingColumnValue[];
    onMissingColumnsChange: (values: MissingColumnValue[]) => void;
    connectionString: string;
}

export function MissingColumns({
    missingColumns,
    onMissingColumnsChange,
    connectionString
}: MissingColumnsProps) {
    const [foreignKeyOptions, setForeignKeyOptions] = useState<Record<string, { label: string, value: string }[]>>({});

    // Fetch options for foreign key columns
    useEffect(() => {
        const fetchForeignKeyOptions = async () => {
            const fkColumns = missingColumns.filter(mc => mc.isForeignKey && mc.columnInfo.foreignKeyTable);

            for (const fkCol of fkColumns) {
                if (!fkCol.columnInfo.foreignKeyTable) continue;

                const cacheKey = `${fkCol.columnInfo.foreignKeyTable}`;
                if (foreignKeyOptions[cacheKey]) continue; // Already fetched

                try {
                    // Fetch all rows from the foreign table
                    const query = `SELECT * FROM ${fkCol.columnInfo.foreignKeyTable} ORDER BY ${fkCol.columnInfo.foreignKeyColumn} LIMIT 100`;
                    const result = await invoke<any[]>('execute_query', {
                        connectionString,
                        query
                    });

                    // Find a good display column (name, title, email, etc.)
                    const sampleRow = result[0];
                    if (!sampleRow) continue;

                    const displayCol = Object.keys(sampleRow).find(key =>
                        key.includes('name') || key.includes('title') || key.includes('email')
                    ) || Object.keys(sampleRow).find(key => key !== fkCol.columnInfo.foreignKeyColumn);

                    const options = result.map(row => ({
                        value: String(row[fkCol.columnInfo.foreignKeyColumn!]),
                        label: displayCol ? `${row[displayCol]} (ID: ${row[fkCol.columnInfo.foreignKeyColumn!]})` : String(row[fkCol.columnInfo.foreignKeyColumn!])
                    }));

                    setForeignKeyOptions(prev => ({
                        ...prev,
                        [cacheKey]: options
                    }));
                } catch (e) {
                    console.error('Failed to fetch FK options:', e);
                }
            }
        };

        fetchForeignKeyOptions();
    }, [missingColumns, connectionString]);

    const handleValueChange = (index: number, value: string) => {
        const newMissingColumns = [...missingColumns];
        newMissingColumns[index].value = value;
        onMissingColumnsChange(newMissingColumns);
    };

    // Group by table for better organization
    const groupedByTable = missingColumns.reduce((acc, col) => {
        if (!acc[col.tableName]) acc[col.tableName] = [];
        acc[col.tableName].push(col);
        return acc;
    }, {} as Record<string, MissingColumnValue[]>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                    <h3 className="text-xl font-bold text-white tracking-wide">Missing Required Columns</h3>
                </div>
                <div className="text-sm text-gray-400">
                    {missingColumns.length} column{missingColumns.length !== 1 ? 's' : ''} need values
                </div>
            </div>

            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                    <p className="font-bold text-amber-400 mb-1">These columns are required but weren't in your source data</p>
                    <p>Please provide values for each missing column. Foreign keys can be selected from existing records.</p>
                </div>
            </div>

            <div className="space-y-6">
                {Object.entries(groupedByTable).map(([tableName, columns]) => (
                    <div key={tableName} className="bg-gunmetal/50 border border-taupe rounded-xl p-6">
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-ember" />
                            {tableName}
                        </h4>

                        <div className="space-y-4">
                            {columns.map((col) => {
                                const globalIndex = missingColumns.indexOf(col);
                                const isFK = col.isForeignKey && col.columnInfo.foreignKeyTable;
                                const fkCacheKey = col.columnInfo.foreignKeyTable || '';
                                const options = foreignKeyOptions[fkCacheKey] || [];

                                return (
                                    <div key={`${col.tableName}-${col.columnName}`}
                                        className="bg-taupe/10 border border-taupe/50 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-white font-bold">{col.columnName}</span>
                                                    {isFK && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                                            <Link2 className="w-3 h-3" />
                                                            FK to {col.columnInfo.foreignKeyTable}
                                                        </span>
                                                    )}
                                                    {!col.columnInfo.isNullable && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                                            REQUIRED
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Type: {col.columnInfo.dataType}</p>
                                            </div>
                                        </div>

                                        {isFK ? (
                                            <select
                                                value={col.value || ''}
                                                onChange={(e) => handleValueChange(globalIndex, e.target.value)}
                                                className="w-full bg-gunmetal border border-taupe rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-ember focus:ring-2 focus:ring-ember/50 outline-none"
                                            >
                                                <option value="">Select {col.columnInfo.foreignKeyTable}...</option>
                                                {options.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={col.value || ''}
                                                onChange={(e) => handleValueChange(globalIndex, e.target.value)}
                                                placeholder={`Enter ${col.columnName}...`}
                                                className="w-full bg-gunmetal border border-taupe rounded-lg px-3 py-2 text-sm font-mono text-white focus:border-ember focus:ring-2 focus:ring-ember/50 outline-none"
                                            />
                                        )}

                                        {col.value && (
                                            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
                                                <Check className="w-3 h-3" />
                                                Value set
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
