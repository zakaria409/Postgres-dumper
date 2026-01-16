import React from 'react';
import { Database, Clock, FileText, Settings, Plus, ChevronRight, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavigationSidebarProps {
    className?: string;
}

interface NavItem {
    label: string;
    active: boolean;
    status?: string;
    sub?: string;
}

interface NavSection {
    title: string;
    icon: React.ReactNode;
    items: NavItem[];
    action?: React.ReactNode;
}

export function NavigationSidebar({ className }: NavigationSidebarProps) {
    const sections: NavSection[] = [

        {
            title: 'Connections',
            icon: <Database className="w-4 h-4" />,
            items: [
                { label: 'Local PC', active: true, status: 'online' },
                { label: 'Staging DB', active: false, status: 'offline' },
            ],
            action: <Plus className="w-4 h-4 cursor-pointer hover:text-ember transition-colors" />
        },
        {
            title: 'Recent Dumps',
            icon: <Clock className="w-4 h-4" />,
            items: [
                { label: 'users.csv', sub: 'Today', active: false },
                { label: 'orders_export.json', sub: 'Yesterday', active: false },
            ]
        },
        {
            title: 'Templates',
            icon: <FileText className="w-4 h-4" />,
            items: [
                { label: 'Daily Logs', active: false },
                { label: 'User Imports', active: false },
            ]
        },
        {
            title: 'System',
            icon: <Settings className="w-4 h-4" />,
            items: [
                { label: 'Settings', active: false },
            ]
        }
    ];

    return (
        <aside className={cn("w-[250px] bg-gunmetal h-full border-r border-taupe flex flex-col text-gray-300", className)}>
            <div className="p-6 flex items-center gap-3 border-b border-taupe">
                <div className="w-8 h-8 bg-ember rounded-lg flex items-center justify-center shadow-lg shadow-ember/20">
                    <Database className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-bold text-lg tracking-tight text-white">PG Dumper</h1>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between px-3 mb-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-khaki-beige/60">
                                {section.icon}
                                {section.title}
                            </div>
                            {section.action}
                        </div>

                        <div className="space-y-1">
                            {section.items.map((item, itemIdx) => (
                                <button
                                    key={itemIdx}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center justify-between group",
                                        item.active
                                            ? "bg-taupe text-white border border-taupe-grey/30"
                                            : "hover:bg-taupe/50 text-gray-400 hover:text-gray-200"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {item.label === 'Local PC' && <Globe className="w-3 h-3 text-ember" />}
                                        <div className="flex flex-col">
                                            <span>{item.label}</span>
                                            {item.sub && <span className="text-[10px] opacity-50">{item.sub}</span>}
                                        </div>
                                    </div>
                                    {item.active && <div className="w-1 h-1 rounded-full bg-ember shadow-[0_0_8px_rgba(191,86,13,0.8)]" />}
                                    {!item.active && <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-4 bg-taupe/30 border-t border-taupe mt-auto">
                <div className="flex items-center gap-3 px-2 py-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <div className="text-xs">
                        <p className="text-white font-medium">Postgres 15.4</p>
                        <p className="text-gray-500">v0.1.0-alpha</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
