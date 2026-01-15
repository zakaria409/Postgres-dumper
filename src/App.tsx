import React, { useState, useEffect } from 'react';
import { Database, ClipboardPaste, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import './App.css';

// Import our components (we'll create these next)
import { SmartTextarea } from './components/ui/SmartTextarea';
import { StatusBar } from './components/layout/StatusBar';
import { NavigationSidebar } from './components/layout/NavigationSidebar';
import { ParseResult, DataFormat } from './types';


function App() {
  const [input, setInput] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'templates'>('paste');
  const [isConnected, setIsConnected] = useState(false);
  
  // Simulate connection status for now
  useEffect(() => {
    // In real app, this would check actual connection
    setTimeout(() => setIsConnected(true), 1000);
  }, []);
  
  const handleFormatDetected = (format: DataFormat) => {
    console.log('Format detected:', format);
  };
  
  const handleParseResult = (result: ParseResult) => {
    setParseResult(result);
    console.log('Parse result:', result);
  };
  
  const handlePasteFromClipboard = async () => {
    try {
      // In Tauri, we need to use the clipboard API
      // For now, we'll use browser clipboard
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      // Fallback to prompt
      const text = prompt('Paste your data here:');
      if (text) setInput(text);
    }
  };
  
  const handleQuickAction = (action: string) => {
    alert(`Quick action: ${action} - This will load a template`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Status Bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg font-semibold">PostgreSQL Data Dumper</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            {isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Connected to localhost:5432</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Connecting...</span>
              </>
            )}
          </div>
          
          <button className="p-2 hover:bg-gray-100 rounded">
            ⚙️
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation - Simplified */}
        <div className="w-64 bg-white border-r p-4">
          <div className="mb-8">
            <h3 className="font-medium text-gray-700 mb-3">Connections</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded bg-blue-50 text-blue-700 font-medium">
                localhost (default)
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100">
                + Add Connection
              </button>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="font-medium text-gray-700 mb-3">Recent Dumps</h3>
            <div className="space-y-2 text-sm">
              <div className="px-3 py-2 rounded hover:bg-gray-100">
                <div className="flex justify-between">
                  <span className="font-medium">users.csv</span>
                  <span className="text-gray-500">Today</span>
                </div>
                <div className="text-gray-600">users table</div>
              </div>
              <div className="px-3 py-2 rounded hover:bg-gray-100">
                <div className="flex justify-between">
                  <span className="font-medium">logs.md</span>
                  <span className="text-gray-500">Yesterday</span>
                </div>
                <div className="text-gray-600">audit_logs table</div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Templates</h3>
            <div className="space-y-2 text-sm">
              <button 
                onClick={() => handleQuickAction('Daily Log Import')}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
              >
                📅 Daily Log Import
              </button>
              <button 
                onClick={() => handleQuickAction('User CSV Import')}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
              >
                👥 User CSV Import
              </button>
              <button 
                onClick={() => handleQuickAction('Custom Import')}
                className="w-full text-left px-3 py-2 rounded hover:bg-gray-100"
              >
                ➕ Custom Import
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Workspace */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <h2 className="text-xl font-bold mb-2">Ready to Import Data</h2>
              <p className="text-gray-600">
                Connected to <span className="font-semibold text-blue-600">localhost:5432</span>
              </p>
            </div>
            
            {/* Tabbed Input Area */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('paste')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'paste'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardPaste className="w-4 h-4" />
                      Paste Data
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'upload'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload File
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'templates'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Templates
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {activeTab === 'paste' && (
                  <div className="space-y-4">
                    {/* Paste Zone */}
                    <SmartTextarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFormatDetected={handleFormatDetected}
                      onParseResult={handleParseResult}
                      className="min-h-[300px]"
                    />
                    
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handlePasteFromClipboard}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <ClipboardPaste className="w-4 h-4" />
                        Paste from Clipboard
                      </button>
                      
                      <div className="text-sm text-gray-500">
                        Tip: Try pasting a markdown table, JSON array, or CSV data
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'upload' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Upload a File</h3>
                    <p className="text-gray-500 mb-6">
                      Drag & drop or click to browse files
                    </p>
                    <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                      Choose File
                    </button>
                    <p className="text-sm text-gray-400 mt-4">
                      Supports: .csv, .json, .txt, .md
                    </p>
                  </div>
                )}
                
                {activeTab === 'templates' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Template Cards */}
                      {[
                        { title: 'Daily Log Import', desc: 'Import today\'s application logs', icon: '📅' },
                        { title: 'User CSV Import', desc: 'Import users from HR system', icon: '👥' },
                        { title: 'Product Import', desc: 'Import product catalog', icon: '📦' },
                        { title: 'Order History', desc: 'Import daily order data', icon: '💰' },
                        { title: 'Inventory Update', desc: 'Update inventory levels', icon: '📊' },
                        { title: 'Custom Template', desc: 'Create your own', icon: '🛠️' },
                      ].map((template) => (
                        <button
                          key={template.title}
                          onClick={() => handleQuickAction(template.title)}
                          className="border rounded-xl p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{template.icon}</div>
                            <div>
                              <h4 className="font-semibold text-gray-800 group-hover:text-blue-700">
                                {template.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{template.desc}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Parse Result Preview */}
            {parseResult && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Data Preview</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {parseResult.headers.length} columns
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
                      {parseResult.rows.length} rows
                    </span>
                    {parseResult.errors.length > 0 && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        ⚠️ {parseResult.errors.length} issues
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Table Preview */}
                <div className="overflow-auto rounded-lg border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {parseResult.headers.map((header, index) => (
                          <th
                            key={index}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parseResult.rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {parseResult.headers.map((header, colIndex) => (
                            <td
                              key={colIndex}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b"
                            >
                              {row[header] !== null && row[header] !== undefined
                                ? String(row[header])
                                : <span className="text-gray-400">(empty)</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {parseResult.rows.length > 5 && (
                        <tr>
                          <td
                            colSpan={parseResult.headers.length}
                            className="px-6 py-3 text-center text-sm text-gray-500 bg-gray-50"
                          >
                            ... and {parseResult.rows.length - 5} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Next Steps */}
                {parseResult.rows.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-800">Ready to import?</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Select a target table and configure mapping
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                          Cancel
                        </button>
                        <button className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Continue to Mapping →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Quick Actions */}
            {!parseResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => {
                    setInput(`| Name | Age | Email |
|------|-----|-------|
| John Doe | 30 | john@example.com |
| Jane Smith | 25 | jane@example.com |`);
                  }}
                  className="border rounded-xl p-5 text-left hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ClipboardPaste className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Try Example</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Load a sample markdown table
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleQuickAction('JSON Example')}
                  className="border rounded-xl p-5 text-left hover:border-green-300 hover:bg-green-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">JSON Example</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Load sample JSON data
                      </p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleQuickAction('CSV Example')}
                  className="border rounded-xl p-5 text-left hover:border-purple-300 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">CSV Example</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Load sample CSV data
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Simple Toast Notification */}
      {parseResult && parseResult.rows.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>Successfully parsed {parseResult.rows.length} rows!</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;