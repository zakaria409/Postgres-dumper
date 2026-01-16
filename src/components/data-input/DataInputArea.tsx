import { useState } from 'react';
import { ClipboardPaste, Upload, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SmartPasteZone } from './SmartPasteZone';

interface DataInputAreaProps {
    onParse: (data: any) => void;
}

export function DataInputArea({ onParse }: DataInputAreaProps) {
    const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'templates'>('paste');
    const [isDragging, setIsDragging] = useState(false);


    const tabs = [
        { id: 'paste', label: 'Paste Data', icon: <ClipboardPaste className="w-4 h-4" /> },
        { id: 'upload', label: 'Upload File', icon: <Upload className="w-4 h-4" /> },
        { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
    ] as const;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Handle file drop logic here
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setActiveTab('upload');
            console.log('File dropped:', files[0].name);
        }
    };

    return (
        <div
            className={cn(
                "bg-taupe/20 border border-taupe rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl shadow-black/20",
                isDragging && "ring-2 ring-ember border-ember bg-ember/5 scale-[1.01]"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Tab Navigation */}
            <div className="flex border-b border-taupe px-4 pt-4 bg-gunmetal/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative",
                            activeTab === tab.id
                                ? "text-ember"
                                : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ember shadow-[0_0_8px_rgba(191,86,13,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            <div className="p-8">
                {activeTab === 'paste' && (
                    <SmartPasteZone onParse={onParse} />
                )}

                {activeTab === 'upload' && (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-taupe rounded-xl bg-gunmetal/30 group hover:border-ember/50 transition-all cursor-pointer">
                        <div className="w-16 h-16 bg-taupe/50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-ember/10 transition-all">
                            <Upload className="w-8 h-8 text-gray-400 group-hover:text-ember" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Drop your file here</h3>
                        <p className="text-gray-500 mb-8">or click to browse your PC</p>
                        <div className="flex gap-4 text-xs">
                            {['.csv', '.json', '.md', '.sql'].map(ext => (
                                <span key={ext} className="px-3 py-1 bg-taupe/40 text-khaki-beige rounded-md border border-taupe">{ext}</span>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { title: 'Users Export', desc: 'Standard user table mapping', icon: '👥' },
                            { title: 'Log Batch', desc: 'Application event logs', icon: '📝' },
                            { title: 'Inventory Sync', desc: 'Daily stock updates', icon: '📦' },
                            { title: 'New Template...', desc: 'Save current mapping', icon: '➕' },
                        ].map((t, i) => (
                            <button key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gunmetal/50 border border-taupe hover:border-ember/40 hover:bg-taupe/10 transition-all text-left group">
                                <div className="text-2xl">{t.icon}</div>
                                <div>
                                    <h4 className="font-bold text-white group-hover:text-ember transition-colors">{t.title}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{t.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
