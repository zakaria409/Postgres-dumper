const Workspace = () => {
  const { createFromPaste } = useSessionStore();
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'templates'>('paste');
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Connection Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <ConnectionStatus />
        <QuickTableSelector />
      </div>
      
      {/* Tabbed Input Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="paste" className="flex items-center gap-2">
            <ClipboardIcon /> Paste Data
          </TabsTrigger>
          <TabsTrigger value="upload">
            <UploadIcon /> Upload File
          </TabsTrigger>
          <TabsTrigger value="templates">
            <TemplateIcon /> Templates
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="paste" className="mt-4">
          <SmartPasteZone onDataDetected={createFromPaste} />
        </TabsContent>
        
        <TabsContent value="upload">
          <FileUploader />
        </TabsContent>
      </Tabs>
      
      {/* Session Progress - Appears after data detection */}
      <ImportSessionFlow />
    </div>
  );
};