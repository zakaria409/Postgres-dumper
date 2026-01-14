// stores/sessionStore.ts
interface ImportSession {
  id: string;
  status: 'idle' | 'parsing' | 'mapping' | 'validating' | 'executing' | 'complete';
  
  source: {
    raw: string;
    format: 'markdown' | 'json' | 'csv' | 'unknown';
    parsed: any[];
    headers: string[];
  };
  
  target: {
    connectionId: string;
    database: string;
    table: string | null;
    schema: ColumnSchema[]; // From DB inspection
  };
  
  mapping: {
    autoMapped: ColumnMapping[];
    manualOverrides: ColumnMapping[];
    conflicts: ValidationError[];
  };
  
  options: {
    onDuplicate: 'ignore' | 'update' | 'error';
    batchSize: number;
    dryRun: boolean;
  };
}

const useSessionStore = create<SessionStore>((set, get) => ({
  currentSession: null,
  
  createFromPaste: async (rawData: string) => {
    // 1. Detect format (markdown priority)
    const format = detectFormat(rawData);
    
    // 2. Parse based on format
    const parser = getParser(format);
    const { headers, rows } = parser.parse(rawData);
    
    // 3. Auto-suggest table based on headers
    const suggestedTable = await suggestTable(headers);
    
    // 4. Fetch schema for auto-mapping
    const schema = await fetchTableSchema(suggestedTable);
    
    // 5. Create mapping with confidence scores
    const autoMapped = autoMapColumns(headers, schema);
    
    set({
      currentSession: {
        id: nanoid(),
        status: 'mapping',
        source: { raw: rawData, format, parsed: rows, headers },
        target: { table: suggestedTable, schema },
        mapping: { autoMapped, manualOverrides: [], conflicts: [] },
        options: getDefaultOptions()
      }
    });
  }
}));