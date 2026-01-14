interface SmartPasteZoneProps {
  onDataDetected: (data: ParsedData) => void;
}

const SmartPasteZone = () => {
  const [rawInput, setRawInput] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<Format | null>(null);
  
  // Debounced detection on paste/type
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (rawInput.trim()) {
        const format = detectFormat(rawInput);
        setDetectedFormat(format);
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [rawInput]);

  return (
    <div className="transition-all duration-300">
      {/* Initial state - empty */}
      {!rawInput && (
        <div className="paste-placeholder" onClick={focusTextarea}>
          <ClipboardPasteIcon />
          <p>Paste markdown, JSON, or CSV here...</p>
        </div>
      )}
      
      {/* Input state - transforms in place */}
      <SmartTextarea
        value={rawInput}
        onChange={setRawInput}
        format={detectedFormat}
        className={cn(
          "min-h-[200px] transition-all",
          detectedFormat && "border-l-4", // Color-coded border
          detectedFormat === 'markdown' && "border-l-blue-500",
          detectedFormat === 'json' && "border-l-green-500",
          detectedFormat === 'csv' && "border-l-purple-500"
        )}
      />
      
      {/* Detection feedback */}
      {detectedFormat && (
        <div className="slide-in-from-bottom">
          <FormatBadge format={detectedFormat} />
          <PreviewButton onClick={() => parseAndPreview(rawInput, detectedFormat)} />
        </div>
      )}
    </div>
  );
};