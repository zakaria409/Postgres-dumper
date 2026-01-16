import { useState, useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { DataInputArea } from './components/data-input/DataInputArea';
import { ParseResult } from './types';
import { CheckCircle2 } from 'lucide-react';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  // Simulate connection status
  useEffect(() => {
    const timer = setTimeout(() => setIsConnected(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleParse = (result: ParseResult) => {
    setParseResult(result);
    if (result.rows.length > 0) {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  return (
    <MainLayout isConnected={isConnected}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Welcome Header */}
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

        {/* Data Input Area */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-ember rounded-full" />
            <h3 className="text-xl font-bold text-white tracking-wide">Data Source</h3>
          </div>
          <DataInputArea onParse={handleParse} />
        </section>

        {/* Preview Section */}
        {parseResult && (
          <section className="animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-khaki-beige rounded-full" />
                <h3 className="text-xl font-bold text-white tracking-wide">Mapping Preview</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-taupe/50 text-khaki-beige rounded-md text-xs font-bold border border-taupe">
                  {parseResult.rows.length} ROWS
                </span>
                <span className="px-3 py-1 bg-taupe/50 text-khaki-beige rounded-md text-xs font-bold border border-taupe">
                  {parseResult.headers.length} COLUMNS
                </span>
              </div>
            </div>

            <div className="bg-taupe/10 border border-taupe rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gunmetal/80 border-b border-taupe">
                      {parseResult.headers.map((header, i) => (
                        <th key={i} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-taupe/30">
                    {parseResult.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-taupe/5 transition-colors group">
                        {parseResult.headers.map((header, j) => (
                          <td key={j} className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap group-hover:text-white">
                            {String(row[header] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseResult.rows.length > 5 && (
                <div className="p-4 bg-gunmetal/30 text-center border-t border-taupe">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing first 5 rows of {parseResult.rows.length}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button className="px-8 py-3 rounded-xl border border-taupe text-gray-400 hover:text-white hover:bg-taupe/20 font-bold transition-all">
                Discard
              </button>
              <button className="px-10 py-3 rounded-xl bg-ember hover:bg-ember-hover text-white font-bold shadow-lg shadow-ember/20 transition-all flex items-center gap-2 group">
                Continue to Mapping
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed bottom-10 right-10 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-500 ring-4 ring-emerald-600/20 backdrop-blur-md">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Successfully Parsed!</p>
            <p className="text-white/80 text-xs">Detected {parseResult?.metadata.formatDetected} format</p>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default App;
