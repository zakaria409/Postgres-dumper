import React from 'react';
import { Settings, ShieldCheck, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatusBarProps {
    isConnected: boolean;
    dbName?: string;
    className?: string;
}

export function StatusBar({ isConnected, dbName = 'localhost:5432', className }: StatusBarProps) {
    return (
        <header className={cn("h-16 bg-gunmetal border-b border-taupe flex items-center justify-between px-8", className)}>
            <div className="flex items-center gap-4">
                {/* Left side can be breadcrumbs or active operation */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Operation:</span>
                    <span className="text-white font-medium">New Data Import</span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border",
                    isConnected
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500"
                    )} />
                    <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        {isConnected ? `Connected: ${dbName}` : 'Reconnecting...'}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-gray-400">
                    <div className="flex flex-col items-end mr-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-khaki-beige">System Load</span>
                        <div className="flex gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className={cn("w-1.5 h-3 rounded-sm", i < 4 ? "bg-ember/40" : "bg-taupe")} />
                            ))}
                        </div>
                    </div>

                    <button className="p-2 hover:bg-taupe rounded-lg transition-colors group">
                        <Settings className="w-5 h-5 group-hover:text-ember transition-colors" />
                    </button>
                </div>
            </div>
        </header>
    );
}
