import { useState, useEffect } from 'react';
import { ArrowRight, Check, X, Wand2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ParseResult, ColumnMapping } from '../../types';

interface ColumnMapperProps {
    parseResult: ParseResult;
    onMappingComplete: (mappings: ColumnMapping[]) => void;
    className?: string;
}

export function ColumnMapper({ parseResult, onMappingComplete, className }: ColumnMapperProps) {
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);

    // Initialize mappings when parseResult changes
    useEffect(() => {
        if (!parseResult) return;

        const initialMappings: ColumnMapping[] = parseResult.headers.map(header => ({
            source: header,
            target: toSnakeCase(header),
            confidence: 1.0,
            sourceType: inferType(parseResult.metadata.sampleValues[header]),
            isIgnored: false
        }));

        setMappings(initialMappings);
    }, [parseResult]);

    useEffect(() => {
        onMappingComplete(mappings);
    }, [mappings, onMappingComplete]);

    const handleTargetChange = (index: number, value: string) => {
        const newMappings = [...mappings];
        newMappings[index].target = value;
        setMappings(newMappings);
    };

    const toggleIgnore = (index: number) => {
        const newMappings = [...mappings];
        newMappings[index].isIgnored = !newMappings[index].isIgnored;
        setMappings(newMappings);
    };

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-3">
                    <Wand2 className="w-5 h-5 text-ember" />
                    Column Mapping
                </h3>
                <p className="text-sm text-gray-400">
                    Map {parseResult.headers.length} source columns to your database
                </p>
            </div>

            <div className="bg-gunmetal/50 border border-taupe rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-taupe/30 border-b border-taupe text-xs uppercase tracking-wider text-khaki-beige font-bold">
                                <th className="px-6 py-4">Source Column</th>
                                <th className="px-6 py-4 text-center">Map</th>
                                <th className="px-6 py-4">Target Column</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-taupe/20">
                            {mappings.map((map, idx) => (
                                <tr
                                    key={idx}
                                    className={cn(
                                        "group transition-colors",
                                        map.isIgnored ? "bg-gunmetal/80 opacity-50" : "hover:bg-taupe/10"
                                    )}
                                >
                                    {/* Source */}
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-200">{map.source}</div>
                                        <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
                                            Ex: {parseResult.metadata.sampleValues[map.source]?.[0] || '-'}
                                        </div>
                                    </td>

                                    {/* Arrow */}
                                    <td className="px-6 py-4 text-center">
                                        <ArrowRight className={cn(
                                            "w-4 h-4 mx-auto transition-transform",
                                            map.isIgnored ? "text-gray-600" : "text-ember group-hover:translate-x-1"
                                        )} />
                                    </td>

                                    {/* Target Input */}
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={map.target}
                                            onChange={(e) => handleTargetChange(idx, e.target.value)}
                                            disabled={map.isIgnored}
                                            className={cn(
                                                "w-full bg-gunmetal border rounded-lg px-3 py-2 text-sm font-mono transition-all focus:ring-2 focus:ring-ember/50 outline-none",
                                                map.isIgnored
                                                    ? "border-transparent text-gray-600 cursor-not-allowed"
                                                    : "border-taupe text-white focus:border-ember"
                                            )}
                                        />
                                    </td>

                                    {/* Type Badge */}
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-bold border",
                                            map.sourceType === 'number' && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                            map.sourceType === 'boolean' && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                            map.sourceType === 'date' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                            map.sourceType === 'string' && "bg-gray-500/10 text-gray-400 border-gray-500/20",
                                        )}>
                                            {map.sourceType || 'string'}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => toggleIgnore(idx)}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                map.isIgnored
                                                    ? "bg-taupe text-gray-400 hover:text-white"
                                                    : "text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                                            )}
                                            title={map.isIgnored ? "Enable column" : "Ignore column"}
                                        >
                                            {map.isIgnored ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Helper to infer type from a sample array
function inferType(samples: any[]): string {
    if (!samples || samples.length === 0) return 'string';

    // Check first non-null sample
    const sample = samples.find(s => s !== null && s !== undefined && s !== '');
    if (sample === undefined) return 'string';

    if (typeof sample === 'boolean' || sample === 'true' || sample === 'false') return 'boolean';
    if (typeof sample === 'number' || !isNaN(Number(sample))) return 'number';

    // Simple date check
    const date = new Date(sample);
    if (!isNaN(date.getTime()) && sample.length > 5) return 'date';

    return 'string';
}

function toSnakeCase(str: string): string {
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
}
