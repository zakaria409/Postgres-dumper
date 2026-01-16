import { useState } from 'react';
import { ClipboardPaste, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SmartTextarea } from '../ui/SmartTextarea';
import { ParseResult } from '../../types';

interface SmartPasteZoneProps {
  onParse: (result: ParseResult) => void;
  className?: string;
}

export function SmartPasteZone({ onParse, className }: SmartPasteZoneProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);

  const handlePasteFromClipboard = async () => {
    setIsReadingClipboard(true);
    try {
      // Framework-safe clipboard access
      // In Tauri v2, we should ensure we have permissions or fallback gracefully
      const text = await navigator.clipboard.readText();

      if (!text) {
        setError('Clipboard is empty');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setInput(text);
      setError(null);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      // Friendly error for user
      setError('Clipboard access denied. Please manually paste (Ctrl+V).');
      setTimeout(() => setError(null), 4000);
    } finally {
      setIsReadingClipboard(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setError(null);
    // Also notify parent if needed via an empty result, strictly speaking onParse expects ParseResult
    // but clearing usually implies resetting state. 
    // We won't call onParse here to avoid confusing the preview with errors.
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="relative group animate-in fade-in duration-500">
        <SmartTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onParseResult={onParse}
          placeholder="Paste your data here (Markdown table, JSON array, or CSV)..."
          className="min-h-[350px] bg-gunmetal/80 border-taupe hover:border-taupe-grey focus:border-ember/50 transition-colors text-gray-200 placeholder:text-gray-600 font-mono text-sm p-6 rounded-xl resize-none shadow-inner"
        />

        {/* Empty State / Hint Overlay */}
        {!input && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
            <ClipboardPaste className="w-16 h-16 mb-4 text-khaki-beige" />
            <p className="text-lg font-medium text-khaki-beige">Ctrl + V to paste anywhere</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePasteFromClipboard}
            disabled={isReadingClipboard}
            className={cn(
              "px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-lg active:scale-95 group",
              input
                ? "bg-taupe/50 text-gray-300 hover:bg-taupe text-sm"
                : "bg-ember hover:bg-ember-hover text-white shadow-ember/20",
              isReadingClipboard && "opacity-50 cursor-wait"
            )}
          >
            <ClipboardPaste className={cn("w-4 h-4", input ? "text-gray-400" : "text-white")} />
            {isReadingClipboard ? 'Reading...' : (input ? 'Replace from Clipboard' : 'Paste from Clipboard')}
          </button>

          {input && (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors text-sm hover:underline decoration-ember/50 underline-offset-4"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 animate-in slide-in-from-right-4">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        {!error && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-taupe/30 px-3 py-1.5 rounded-full border border-taupe">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Auto-detection active</span>
          </div>
        )}
      </div>
    </div>
  );
}