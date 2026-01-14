// components/mapping/ValidationPanel.tsx
const ValidationPanel = () => {
  const { conflicts } = useSessionStore();
  
  const errorGroups = {
    duplicates: conflicts.filter(c => c.type === 'duplicate'),
    typeMismatches: conflicts.filter(c => c.type === 'type_mismatch'),
    schemaMismatches: conflicts.filter(c => c.type === 'schema_mismatch'),
    formatErrors: conflicts.filter(c => c.type === 'format_error')
  };
  
  return (
    <CollapsiblePanel title="Validation Issues" defaultOpen={true}>
      <Tabs defaultValue="duplicates">
        <TabsList>
          <TabsTrigger value="duplicates">
            Duplicates ({errorGroups.duplicates.length})
          </TabsTrigger>
          <TabsTrigger value="typeMismatches">
            Type Mismatches ({errorGroups.typeMismatches.length})
          </TabsTrigger>
          <TabsTrigger value="schemaMismatches">
            Schema ({errorGroups.schemaMismatches.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Interactive error resolution UI */}
        {errorGroups.duplicates.length > 0 && (
          <DuplicateResolver duplicates={errorGroups.duplicates} />
        )}
      </Tabs>
    </CollapsiblePanel>
  );
};