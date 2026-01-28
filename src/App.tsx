import { useState, useEffect, useRef, useCallback } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { DataInputArea } from './components/data-input/DataInputArea';
import { ColumnMapper } from './components/mapping/ColumnMapper';
import { MissingColumns } from './components/mapping/MissingColumns';
import { ConnectionSetup } from './components/connection/ConnectionSetup';
import { generateSql } from './lib/generators/sqlGenerator';
import { ParseResult, ColumnMapping, DatabaseConnection, SmartLink, ColumnInfo, MissingColumnValue } from './types';
import { CheckCircle2, ChevronRight, FileCode, Copy, RefreshCw, ArrowLeft, Database, Play, AlertTriangle, Loader2 } from 'lucide-react';
import { SmartTextarea } from './components/ui/SmartTextarea';
import { invoke } from '@tauri-apps/api/core';
import { cn } from './lib/utils';

type Step = 'input' | 'preview' | 'mapping' | 'missing-columns' | 'result';

function App() {
  const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
  const [showConnectionSetup, setShowConnectionSetup] = useState(false);

  const [step, setStep] = useState<Step>('input');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parsingMethod, setParsingMethod] = useState<'default' | 'alternative'>('default');
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [sqlOutput, setSqlOutput] = useState('');

  const [tables, setTables] = useState<string[]>([]);
  const [columnsCache, setColumnsCache] = useState<Record<string, ColumnInfo[]>>({});

  const [smartLinks, setSmartLinks] = useState<SmartLink[]>([]);
  const [missingColumns, setMissingColumns] = useState<MissingColumnValue[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('Successfully Parsed!');

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean, message: string } | null>(null);

  // Load connection and smart links from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('active_connection');
    console.log('[App] Loading from localStorage:', { hasSaved: !!saved });
    if (saved) {
      try {
        const conn = JSON.parse(saved);
        console.log('[App] Parsed connection:', {
          name: conn.name,
          hasPassword: !!(conn.password),
          host: conn.host,
          database: conn.database
        });

        // Ensure password field exists (for backward compatibility)
        const fullConn: DatabaseConnection = {
          ...conn,
          password: conn.password || '' // Default to empty string if missing
        };

        setActiveConnection(fullConn);
      } catch (e) {
        console.error('Failed to load saved connection', e);
      }
    }
  }, []);

  const handleSmartLinkChange = (newLinks: SmartLink[]) => {
    setSmartLinks(newLinks);
    localStorage.setItem('smart_links', JSON.stringify(newLinks));
  };

  const handleConnectionSaved = (conn: DatabaseConnection) => {
    setActiveConnection(conn);
    localStorage.setItem('active_connection', JSON.stringify(conn));
    setShowConnectionSetup(false);
    showToast(`Connected to ${conn.name}`);
  };

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleParse = (result: ParseResult) => {
    setParseResult(result);
    setStep('preview');
    if (result.rows.length > 0) {
      showToast(`Detected ${result.metadata.formatDetected} format`);
    }
  };

  const handleMappingComplete = (newMappings: ColumnMapping[]) => {
    setMappings(newMappings);
  };

  const handleGenerateSql = () => {
    if (!parseResult) return;
    const sql = generateSql(parseResult, mappings, undefined, smartLinks, missingColumns); // Removed tableName
    setSqlOutput(sql);
    setStep('result');
  };

  const handleReset = () => {
    setStep('input');
    setParseResult(null);
    setParsingMethod('default');
    setMappings([]);
    setSqlOutput('');
    setExecutionResult(null);
    setMissingColumns([]);
  };

  const detectMissingColumns = async (): Promise<MissingColumnValue[]> => {
    const activeMappings = mappings.filter(m => !m.isIgnored && m.targetTable && m.target);

    // Group by table
    const tableGroups: Record<string, ColumnMapping[]> = {};
    activeMappings.forEach(m => {
      const table = m.targetTable!;
      if (!tableGroups[table]) tableGroups[table] = [];
      tableGroups[table].push(m);
    });

    const missing: MissingColumnValue[] = [];

    // For each target table, check what columns are missing
    for (const [tableName, tableMappings] of Object.entries(tableGroups)) {
      const columns = await fetchColumns(tableName);
      const mappedColumnNames = new Set(tableMappings.map(m => m.target));

      // Find required columns that aren't mapped
      const requiredColumns = columns.filter(col =>
        col.isNullable === false && // Required (NOT NULL) - Strict check
        !col.isAutoGenerated && // Not auto-generated
        !col.isGenerated && // Not generated (STORED)
        !col.isIdentity && // Not identity
        !col.columnDefault && // No default value
        !mappedColumnNames.has(col.name) // Not already mapped
      );

      for (const col of requiredColumns) {
        missing.push({
          tableName,
          columnName: col.name,
          columnInfo: col,
          value: null,
          isForeignKey: col.isForeignKey
        });
      }
    }

    return missing;
  };

  const handleProceedToMissingColumns = async () => {
    const missing = await detectMissingColumns();

    if (missing.length === 0) {
      // No missing columns, go straight to SQL generation
      handleGenerateSql();
    } else {
      setMissingColumns(missing);
      setStep('missing-columns');
    }
  };

  const handleMissingColumnsComplete = (values: MissingColumnValue[]) => {
    setMissingColumns(values);
  };

  const getConnectionString = (conn: DatabaseConnection) => {
    const user = encodeURIComponent(conn.username);
    const password = encodeURIComponent(conn.password || '');
    const host = conn.host;
    const port = conn.port;
    const db = encodeURIComponent(conn.database);

    // Log for debugging (mask password)
    const maskedStr = `postgresql://${user}:${conn.password ? '***' : ''}@${host}:${port}/${db}`;
    console.log('[App] Connection string:', maskedStr);

    // Build proper connection string
    return `postgresql://${user}:${password}@${host}:${port}/${db}`;
  };

  const handleExecute = async () => {
    if (!activeConnection || !sqlOutput) return;

    setIsExecuting(true);
    setExecutionResult(null);

    const connStr = getConnectionString(activeConnection);

    try {
      const res = await invoke<string>('execute_sql', {
        connectionString: connStr,
        sql: sqlOutput
      });
      setExecutionResult({ success: true, message: res });
      showToast('SQL Executed Successfully!');
    } catch (err) {
      setExecutionResult({ success: false, message: String(err) });
    } finally {
      setIsExecuting(false);
    }
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only fetch tables when connection actually changes (not on initial mount)
    if (activeConnection) {
      fetchTables();
    } else {
      setTables([]);
    }
  }, [activeConnection]);

  const fetchTables = useCallback(async () => {
    console.log("[App] fetchTables called");
    if (!activeConnection) {
      console.log("[App] fetchTables: No active connection, returning");
      return;
    }

    console.log("[App] fetchTables: Active connection:", {
      name: activeConnection.name,
      host: activeConnection.host,
      port: activeConnection.port,
      database: activeConnection.database,
      username: activeConnection.username,
      hasPassword: !!(activeConnection as any).password
    });

    const connStr = getConnectionString(activeConnection);
    console.log("[App] fetchTables: Connection string built (check previous log for details)");

    try {
      console.log("[App] fetchTables: Invoking Rust get_tables command...");
      const tables = await invoke<string[]>('get_tables', { connectionString: connStr });
      console.log("[App] fetchTables: Invoke completed successfully");
      console.log("[App] fetchTables: Response type:", typeof tables);
      console.log("[App] fetchTables: Response is array:", Array.isArray(tables));
      console.log("[App] fetchTables: Response length:", tables.length);
      console.log("[App] fetchTables: Response content:", tables);

      setTables(tables);
      console.log("[App] fetchTables: State updated with", tables.length, "tables");

      if (tables.length === 0) {
        console.warn("[App] No tables found in database - empty array returned");
      }
    } catch (e) {
      console.error("[App] Failed to fetch tables - Error:", e);
      console.error("[App] Error type:", typeof e);
      console.error("[App] Error details:", JSON.stringify(e, null, 2));
      showToast(`Error fetching tables: ${String(e)}`);
    }
  }, [activeConnection]);

  useEffect(() => {
    const loadTables = async () => {
      if (activeConnection) {
        try {
          await fetchTables();
        } catch (error) {
          console.error("Failed to load tables:", error);
        }
      } else {
        setTables([]);
      }
    };

    loadTables();
  }, [activeConnection, fetchTables]);

  const fetchColumns = useCallback(async (tableName: string): Promise<ColumnInfo[]> => {
    console.log("[App] fetchColumns called for table:", tableName);

    // Check cache first
    if (columnsCache[tableName]) {
      console.log("[App] fetchColumns: Returning cached columns for", tableName);
      return columnsCache[tableName];
    }

    if (!activeConnection) {
      console.log("[App] fetchColumns: No active connection, returning empty array");
      return [];
    }

    const connStr = getConnectionString(activeConnection);

    try {
      console.log("[App] fetchColumns: Invoking Rust get_columns command for", tableName);
      const columns = await invoke<ColumnInfo[]>('get_columns', {
        connectionString: connStr,
        tableName: tableName
      });

      console.log("[App] fetchColumns: Received", columns.length, "columns for", tableName);
      if (columns.length > 0) {
        console.log("[App] fetchColumns: First column sample:", JSON.stringify(columns[0], null, 2));
      }

      // Cache the results
      setColumnsCache(prev => ({
        ...prev,
        [tableName]: columns
      }));

      return columns;
    } catch (e) {
      console.error("[App] Failed to fetch columns for", tableName, ":", e);
      showToast(`Error fetching columns: ${String(e)}`);
      return [];
    }
  }, [activeConnection, columnsCache]);

  return (
    <MainLayout isConnected={!!activeConnection} dbName={activeConnection?.name}>
      {/* Connection Setup Modal */}
      {showConnectionSetup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <ConnectionSetup
            onConnectionSaved={handleConnectionSaved}
            onCancel={() => setShowConnectionSetup(false)}
            initialConnection={activeConnection}
          />
        </div>
      )}

      {/* Top Bar Connection Trigger */}
      <div className="absolute top-4 right-6 z-40">
        <button
          onClick={() => setShowConnectionSetup(true)}
          className="flex items-center gap-2 text-xs font-bold bg-gunmetal border border-taupe px-3 py-1.5 rounded-full hover:bg-taupe transition-colors text-gray-400 hover:text-white"
        >
          <Database className={cn("w-3 h-3", activeConnection ? "text-emerald-500" : "text-gray-500")} />
          {activeConnection ? activeConnection.name : "Connect Database"}
        </button>
      </div>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-8">

        {/* Progress Stepper */}
        {step !== 'input' && (
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
            <button onClick={handleReset} className="hover:text-ember transition-colors">Input</button>
            <ChevronRight className="w-4 h-4" />
            <span className={step === 'preview' ? 'text-ember font-bold' : ''}>Preview</span>
            <ChevronRight className="w-4 h-4" />
            <span className={step === 'mapping' ? 'text-ember font-bold' : ''}>Mapping</span>
            <ChevronRight className="w-4 h-4" />
            <span className={step === 'missing-columns' ? 'text-ember font-bold' : ''}>Missing Columns</span>
            <ChevronRight className="w-4 h-4" />
            <span className={step === 'result' ? 'text-ember font-bold' : ''}>SQL</span>
          </div>
        )}

        {/* Welcome Header */}
        {step === 'input' && (
          <div className="relative overflow-hidden bg-gradient-to-br from-gunmetal to-taupe/40 p-10 rounded-3xl border border-taupe shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-4xl font-black text-white tracking-tight mb-3">
                Ready to <span className="text-ember">Dump</span>?
              </h2>
              <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
                Connect to your PostgreSQL instance, paste your data, and we'll handle the rest.
                Zero configuration for repeat exports.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-ember/10 rounded-full blur-3xl -mr-20 -mt-20" />
          </div>
        )}

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-ember rounded-full" />
              <h3 className="text-xl font-bold text-white tracking-wide">Data Source</h3>
            </div>
            <DataInputArea onParse={handleParse} />
          </section>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && parseResult && (() => {
          // Get active parse data based on selected method
          const hasAlternative = parseResult.metadata.formatDetected === 'headings' &&
            parseResult.metadata.alternativeParsing?.multiColumn;

          const activeHeaders = parsingMethod === 'alternative' && hasAlternative
            ? parseResult.metadata.alternativeParsing!.multiColumn!.headers
            : parseResult.headers;

          const activeRows = parsingMethod === 'alternative' && hasAlternative
            ? parseResult.metadata.alternativeParsing!.multiColumn!.rows
            : parseResult.rows;

          return (
            <section className="animate-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-khaki-beige rounded-full" />
                  <h3 className="text-xl font-bold text-white tracking-wide">Mapping Preview</h3>
                </div>
                <div className="flex items-center gap-3">
                  {hasAlternative && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-gunmetal border border-taupe rounded-lg">
                      <button
                        onClick={() => setParsingMethod('default')}
                        className={cn(
                          "px-3 py-1 rounded text-xs font-bold transition-all",
                          parsingMethod === 'default'
                            ? "bg-ember text-white shadow-lg"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        Single Column
                      </button>
                      <button
                        onClick={() => setParsingMethod('alternative')}
                        className={cn(
                          "px-3 py-1 rounded text-xs font-bold transition-all",
                          parsingMethod === 'alternative'
                            ? "bg-ember text-white shadow-lg"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        Multi Column
                      </button>
                    </div>
                  )}
                  <span className="px-3 py-1 bg-taupe/50 text-khaki-beige rounded-md text-xs font-bold border border-taupe">
                    {activeRows.length} ROWS
                  </span>
                  <span className="px-3 py-1 bg-taupe/50 text-khaki-beige rounded-md text-xs font-bold border border-taupe">
                    {activeHeaders.length} COLUMNS
                  </span>
                </div>
              </div>

              <div className="bg-taupe/10 border border-taupe rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gunmetal/80 border-b border-taupe">
                        {activeHeaders.map((header, i) => (
                          <th key={i} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-taupe/30">
                      {activeRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-taupe/5 transition-colors group">
                          {activeHeaders.map((header, j) => (
                            <td key={j} className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap group-hover:text-white">
                              {String(row[header] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button
                  onClick={handleReset}
                  className="px-8 py-3 rounded-xl border border-taupe text-gray-400 hover:text-white hover:bg-taupe/20 font-bold transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={() => {
                    // Update parseResult with selected method before proceeding
                    if (parsingMethod === 'alternative' && hasAlternative) {
                      setParseResult({
                        ...parseResult,
                        headers: parseResult.metadata.alternativeParsing!.multiColumn!.headers,
                        rows: parseResult.metadata.alternativeParsing!.multiColumn!.rows,
                        metadata: {
                          ...parseResult.metadata,
                          rowCount: parseResult.metadata.alternativeParsing!.multiColumn!.rowCount,
                          columnCount: parseResult.metadata.alternativeParsing!.multiColumn!.columnCount
                        }
                      });
                    }
                    setStep('mapping');
                  }}
                  className="px-10 py-3 rounded-xl bg-ember hover:bg-ember-hover text-white font-bold shadow-lg shadow-ember/20 transition-all flex items-center gap-2 group"
                >
                  Continue to Mapping
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>
            </section>
          );
        })()}

        {/* STEP 3: MAPPING */}
        {step === 'mapping' && parseResult && (
          <section className="animate-in slide-in-from-right-8 duration-500">
            {/* Table Name Input Removed */}

            <ColumnMapper
              parseResult={parseResult}
              onMappingComplete={handleMappingComplete}
              tables={tables}
              onRefreshTables={fetchTables}
              onFetchColumns={fetchColumns}
              smartLinks={smartLinks}
              onSmartLinkChange={handleSmartLinkChange}
              isConnected={!!activeConnection}
              onOpenConnection={() => setShowConnectionSetup(true)}
            />

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => setStep('preview')}
                className="px-8 py-3 rounded-xl border border-taupe text-gray-400 hover:text-white hover:bg-taupe/20 font-bold transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleProceedToMissingColumns}
                className="px-10 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
              >
                <FileCode className="w-5 h-5" />
                Continue
              </button>
            </div>
          </section>
        )}

        {/* STEP 4: MISSING COLUMNS */}
        {step === 'missing-columns' && (
          <section className="animate-in slide-in-from-right-8 duration-500">
            <MissingColumns
              missingColumns={missingColumns}
              onMissingColumnsChange={handleMissingColumnsComplete}
              connectionString={activeConnection ? getConnectionString(activeConnection) : ''}
            />

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => setStep('mapping')}
                className="px-8 py-3 rounded-xl border border-taupe text-gray-400 hover:text-white hover:bg-taupe/20 font-bold transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Mapping
              </button>
              <button
                onClick={handleGenerateSql}
                disabled={missingColumns.some(mc => !mc.value)}
                className={cn(
                  "px-10 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2",
                  missingColumns.some(mc => !mc.value)
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20"
                )}
              >
                <FileCode className="w-5 h-5" />
                Generate SQL
              </button>
            </div>
          </section>
        )}

        {/* STEP 5: RESULT */}
        {step === 'result' && sqlOutput && (
          <section className="animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                <h3 className="text-xl font-bold text-white tracking-wide">Generated SQL</h3>
              </div>
              <div className="flex gap-4">
                {!activeConnection ? (
                  <button
                    onClick={() => setShowConnectionSetup(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember text-white shadow-lg shadow-ember/20 hover:bg-ember-hover text-sm font-bold animate-pulse"
                  >
                    <Database className="w-4 h-4" />
                    Connect to Execute
                  </button>
                ) : (
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-lg text-sm font-bold transition-all",
                      isExecuting ? "bg-taupe text-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                    )}
                  >
                    {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {isExecuting ? 'Executing...' : 'Execute in DB'}
                  </button>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlOutput);
                    showToast('Copied to clipboard');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-taupe/50 text-khaki-beige hover:text-white border border-taupe hover:bg-taupe text-sm font-medium transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-taupe text-gray-400 hover:text-white text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Import
                </button>
              </div>
            </div>

            <div className="relative">
              <SmartTextarea
                value={sqlOutput}
                readOnly
                className="min-h-[400px] font-mono text-sm bg-gunmetal border-taupe text-green-400 selection:bg-green-900/30"
              />

              {/* Execution Result Overlay */}
              {executionResult && (
                <div className={cn(
                  "absolute bottom-4 left-4 right-4 p-4 rounded-xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-2",
                  executionResult.success
                    ? "bg-emerald-900/90 border-emerald-500/50 text-emerald-100"
                    : "bg-red-900/90 border-red-500/50 text-red-100"
                )}>
                  <div className="flex items-start gap-3">
                    {executionResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />}
                    <div>
                      <h4 className="font-bold mb-1">{executionResult.success ? 'Execution Successful' : 'Execution Failed'}</h4>
                      <p className="text-sm opacity-90 font-mono">{executionResult.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed bottom-10 right-10 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 ring-4 ring-emerald-600/20 backdrop-blur-md z-50">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">{notificationMsg}</p>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default App;
