import { useState, useEffect } from 'react';
import { Database, Save, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../../lib/utils';
import { DatabaseConnection } from '../../types';
import { nanoid } from 'nanoid';

interface ConnectionSetupProps {
    onConnectionSaved: (conn: DatabaseConnection) => void;
    onCancel: () => void;
    initialConnection?: DatabaseConnection | null;
}

export function ConnectionSetup({ onConnectionSaved, onCancel, initialConnection }: ConnectionSetupProps) {
    const [formData, setFormData] = useState({
        name: 'My Postgres DB',
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        username: 'postgres',
        password: ''
    });

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (initialConnection) {
            // Retrieve password from secure storage if we had it (simulated here)
            // For MVP we can't easily get the password back if we didn't store it in plain text
            // So we might leave it blank to require re-entry or assume stored
            setFormData({
                ...initialConnection,
                password: '' // Security best practice: don't auto-fill unless strictly managed
            });
        }
    }, [initialConnection]);

    const getConnectionString = () => {
        return `postgresql://${formData.username}:${formData.password}@${formData.host}:${formData.port}/${formData.database}`;
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await invoke<string>('test_connection', {
                connectionString: getConnectionString()
            });
            setTestResult({ success: true, message: result });
        } catch (error) {
            setTestResult({ success: false, message: String(error) });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = () => {
        const newConnection: DatabaseConnection = {
            id: initialConnection?.id || nanoid(),
            name: formData.name,
            host: formData.host,
            port: formData.port,
            database: formData.database,
            username: formData.username,
            isDefault: false,
            lastUsed: new Date()
        };

        // Save connection details (excluding password for now in simple storage, or including if user accepts risk)
        // For this MVP we will save to localStorage. 
        // Ideally use tauri-plugin-store for better persistence.
        // We will pass the password back up to be held in session memory.

        onConnectionSaved({ ...newConnection, password: formData.password } as any);
    };

    return (
        <div className="bg-gunmetal border border-taupe rounded-2xl p-6 shadow-2xl max-w-md w-full mx-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-6 border-b border-taupe pb-4">
                <div className="w-10 h-10 rounded-lg bg-ember/20 flex items-center justify-center">
                    <Database className="w-6 h-6 text-ember" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Connection Setup</h3>
                    <p className="text-xs text-gray-500">Configure your PostgreSQL instance</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Connection Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-taupe/20 border border-taupe rounded-lg px-3 py-2 text-white focus:border-ember outline-none text-sm transition-colors"
                        placeholder="Production DB"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Host</label>
                        <input
                            type="text"
                            value={formData.host}
                            onChange={e => setFormData({ ...formData, host: e.target.value })}
                            className="w-full bg-taupe/20 border border-taupe rounded-lg px-3 py-2 text-white focus:border-ember outline-none text-sm transition-colors"
                            placeholder="localhost"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Port</label>
                        <input
                            type="number"
                            value={formData.port}
                            onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })}
                            className="w-full bg-taupe/20 border border-taupe rounded-lg px-3 py-2 text-white focus:border-ember outline-none text-sm transition-colors"
                            placeholder="5432"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Database</label>
                        <input
                            type="text"
                            value={formData.database}
                            onChange={e => setFormData({ ...formData, database: e.target.value })}
                            className="w-full bg-taupe/20 border border-taupe rounded-lg px-3 py-2 text-white focus:border-ember outline-none text-sm transition-colors"
                            placeholder="postgres"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-taupe/20 border border-taupe rounded-lg px-3 py-2 text-white focus:border-ember outline-none text-sm transition-colors"
                            placeholder="postgres"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-taupe/20 border border-taupe rounded-lg px-3 py-2 text-white focus:border-ember outline-none text-sm transition-colors font-mono"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
                <div className={cn(
                    "mt-4 p-3 rounded-lg text-xs flex items-start gap-2",
                    testResult.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{testResult.message}</span>
                </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-taupe">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 text-sm bg-taupe text-white hover:bg-taupe/80 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Test
                </button>
                <button
                    onClick={handleSave}
                    disabled={!testResult?.success}
                    className="px-6 py-2 text-sm bg-ember text-white hover:bg-ember-hover rounded-lg font-bold shadow-lg shadow-ember/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" />
                    Save & Connect
                </button>
            </div>
        </div>
    );
}
