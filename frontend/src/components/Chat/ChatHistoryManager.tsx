import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Upload, 
  Trash2, 
  Settings,
  Database,
  FileText
} from 'lucide-react';
import { useChatHistory } from '../../hooks/useChatHistory';

interface ChatHistoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistoryManager: React.FC<ChatHistoryManagerProps> = ({ isOpen, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState('');
  
  const {
    stats,
    exportHistory,
    importHistory,
    clearAllHistory,
    getStorageUsage
  } = useChatHistory();

  const handleExport = () => {
    setIsExporting(true);
    try {
      const data = exportHistory();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cellm-chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    if (!importData.trim()) return;
    
    try {
      importHistory(importData);
      setImportData('');
      setIsImporting(false);
      alert('Chat history imported successfully!');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed. Please check the data format.');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to delete ALL chat history? This action cannot be undone.')) {
      clearAllHistory();
      alert('All chat history has been cleared.');
    }
  };

  const storageUsage = getStorageUsage();
  const totalSizeKB = Math.round(storageUsage.total / 1024);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Chat History Manager
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                {/* Statistics */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Storage Statistics</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Conversations:</span>
                      <span className="font-medium">{stats.totalSessions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Messages:</span>
                      <span className="font-medium">{stats.totalMessages}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Favorites:</span>
                      <span className="font-medium">{stats.favoriteCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Archived:</span>
                      <span className="font-medium">{stats.archivedCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Storage Used:</span>
                      <span className="font-medium">{totalSizeKB} KB</span>
                    </div>
                    {stats.mostUsedUcf && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Most Used UCF:</span>
                        <span className="font-medium text-xs">{stats.mostUsedUcf}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Export */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Export Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Download all your chat history as a JSON file for backup or migration to Supabase.
                  </p>
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export Chat History'}
                  </button>
                </div>

                {/* Import */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Import Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Import chat history from a JSON backup file.
                  </p>
                  {!isImporting ? (
                    <button
                      onClick={() => setIsImporting(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Import Chat History
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        placeholder="Paste your exported JSON data here..."
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-mono"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleImport}
                          disabled={!importData.trim()}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg transition-colors"
                        >
                          Import
                        </button>
                        <button
                          onClick={() => {
                            setIsImporting(false);
                            setImportData('');
                          }}
                          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Migration Info */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Supabase Migration</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Ready for Cloud Storage</h4>
                        <p className="text-xs text-blue-700 mb-2">
                          Your chat history uses a database-compatible schema that can be easily migrated to Supabase PostgreSQL for cloud storage and synchronization.
                        </p>
                        <div className="text-xs text-blue-600">
                          <strong>Migration features:</strong>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            <li>UUID-compatible session and message IDs</li>
                            <li>PostgreSQL-ready data types</li>
                            <li>Indexed timestamps and user fields</li>
                            <li>Full-text search capabilities</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div>
                  <h3 className="text-sm font-medium text-red-900 mb-3">Danger Zone</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 mb-3">
                      Permanently delete all chat history. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleClearHistory}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All History
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryManager;
