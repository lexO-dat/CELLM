import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import MessageList from '../Message/MessageList';
import MessageInput from '../Message/MessageInput';
import Sidebar from '../Layout/Sidebar';
import { apiService } from '../../services/api';
import { Message } from '../../types';
import { Files, Download, AlertCircle, Eye, EyeOff, Save, Settings } from 'lucide-react';

const ChatInterface: React.FC = () => {
  const { user } = useAuth();
  const { 
    messages, 
    isLoading, 
    ucfMode, 
    ucfOptions, 
    outputFiles, 
    folderName,
    error,
    addMessage,
    updateMessage, 
    setUcfMode, 
    setSelectedUcf, 
    setOutputFiles, 
    setFolderName,
    setError,
    currentSessionId,
    isLoadingSession,
    createNewSession,
    saveSession,
    autoSaveEnabled,
    setAutoSaveEnabled,
    generateMessageId
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filesVisible, setFilesVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Set responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // Mobile
        setSidebarCollapsed(true);
      } else { // Desktop
        setSidebarCollapsed(false); // Default to expanded on desktop
      }
    };

    // Set initial state
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize with default UCF
  useEffect(() => {
    if (!ucfMode.selectedUcf && ucfOptions.length > 0) {
      setSelectedUcf(ucfOptions[1]); // Default to Eco1C1G1T1
    }
  }, [ucfMode.selectedUcf, ucfOptions, setSelectedUcf]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  }, []);

  // Initialize new session only on first load if none exists
  useEffect(() => {
    // Only create a new session if we don't have one and this is the initial load
    const hasStoredSessions = localStorage.getItem('cellm_chat_history');
    if (!currentSessionId && !hasStoredSessions) {
      const timeoutId = setTimeout(() => {
        createNewSession();
      }, 100); // Small delay to avoid race conditions
      
      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty dependency array - only run once on mount

  const handleManualSave = useCallback(() => {
    saveSession();
  }, [saveSession]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Create a new session if we don't have one
    if (!currentSessionId) {
      createNewSession();
    }

    const userMessage: Omit<Message, 'id' | 'timestamp'> = {
      text: inputMessage,
      isUser: true,
      type: 'text'
    };

    addMessage(userMessage);
    setInputMessage('');
    setError(undefined);

    try {
      // Step 1: Generate Verilog code with streaming
      addMessage({
        text: 'Generating Verilog code for your genetic circuit...',
        isUser: false,
        type: 'system'
      });

      // Step 1: Generate Verilog code
      const verilogResult = await apiService.generateVerilog(inputMessage);
      
      // Check if there's thinking content and display it
      if (verilogResult.thinking) {
        const verilogMessage: Message = {
          id: generateMessageId(),
          text: verilogResult.response,
          isUser: false,
          type: 'verilog',
          timestamp: new Date(),
          thinking: verilogResult.thinking
        };
        addMessage(verilogMessage);
      } else {
        addMessage({
          text: verilogResult.response,
          isUser: false,
          type: 'verilog'
        });
      }

      // Continue with UCF selection and Cello processing
      continueWithProcessing(verilogResult.response);

      async function continueWithProcessing(verilogResponse: string) {
        try {
          // Extract Verilog module
          const verilogCode = apiService.extractVerilogModule(verilogResponse);
          if (!verilogCode) {
            console.log(verilogResponse);
            throw new Error('No valid Verilog module found in the response');
          }

          // Step 2: UCF Selection
          let selectedUcfForProcessing = ucfMode.selectedUcf;
          
          if (ucfMode.mode === 'auto') {
            addMessage({
              text: 'Automatically selecting optimal UCF based on your design...',
              isUser: false,
              type: 'system'
            });

            const ucfName = await apiService.selectUcf(inputMessage);
            const autoSelectedUcf = ucfOptions.find(ucf => 
              ucf.name.toLowerCase() === ucfName.toLowerCase()
            );
            
            if (autoSelectedUcf) {
              selectedUcfForProcessing = autoSelectedUcf;
              setSelectedUcf(autoSelectedUcf);
            }

            addMessage({
              text: `Selected UCF: ${selectedUcfForProcessing?.name || 'Eco1C1G1T1'}`,
              isUser: false,
              type: 'ucf_selection'
            });
          } else {
            addMessage({
              text: `Using manually selected UCF: ${selectedUcfForProcessing?.name || 'Eco1C1G1T1'}`,
              isUser: false,
              type: 'ucf_selection'
            });
          }

          // Step 3: Cello Processing
          addMessage({
            text: 'Processing with Cello to generate genetic circuit design...',
            isUser: false,
            type: 'system'
          });

          const celloResult = await apiService.processCello(
            verilogCode, 
            selectedUcfForProcessing?.id || 1
          );
          
          setOutputFiles(celloResult.output_files || []);
          setFolderName(celloResult.folder_name || '');

          addMessage({
            text: `✅ Cello processing completed successfully!\n\nGenerated ${celloResult.output_files?.length || 0} output files:\n${(celloResult.output_files || []).map(file => `• ${file}`).join('\n')}\n\nFolder: ${celloResult.folder_name}`,
            isUser: false,
            type: 'system'
          });

          // Save session after completing the full workflow
          setTimeout(() => {
            saveSession();
          }, 500); // Small delay to ensure all messages are processed

        } catch (error: any) {
          console.error('Error in processing workflow:', error);
          setError(error.message);
          addMessage({
            text: `❌ Error: ${error.message}`,
            isUser: false,
            type: 'error'
          });
        }
      }

    } catch (error: any) {
      console.error('Error in chat flow:', error);
      setError(error.message);
      addMessage({
        text: `❌ Error: ${error.message}`,
        isUser: false,
        type: 'error'
      });
    }
  }, [
    inputMessage, 
    isLoading, 
    currentSessionId,
    ucfMode, 
    ucfOptions, 
    addMessage,
    updateMessage, 
    setSelectedUcf, 
    setOutputFiles, 
    setFolderName, 
    setError,
    createNewSession,
    saveSession,
    generateMessageId
  ]);

  const downloadFile = useCallback(async (fileName: string) => {
    if (!folderName) return;

    try {
      const blob = await apiService.downloadFile(folderName, fileName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Download error:', error);
      addMessage({
        text: `❌ Download failed: ${error.message}`,
        isUser: false,
        type: 'error'
      });
    }
  }, [folderName, addMessage]);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Loading Session Overlay */}
      {isLoadingSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-700">Loading conversation...</span>
          </div>
        </div>
      )}

      {/* Chat History Sidebar */}
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-semibold text-gray-900">CELLM</h1>
          </div>
          <div className="flex items-center gap-2">
            {error && <AlertCircle className="w-5 h-5 text-red-600" />}
            {outputFiles.length > 0 && <Files className="w-5 h-5 text-green-600" />}
          </div>
        </div>
      </div>

      {/* Sidebar - Mobile Overlay */}
      <div className={`
        ${sidebarCollapsed 
          ? 'hidden md:block' 
          : 'fixed inset-0 z-50 md:relative md:z-auto md:block'
        }
      `}>
        {!sidebarCollapsed && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        <div className={`
          ${sidebarCollapsed ? 'hidden md:block' : 'block'}
          h-screen md:h-full
        `}>
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Desktop Header */}
        <div className="hidden md:block bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">
                CELLM - Genetic Circuit Designer
              </h1>
              <p className="text-sm text-gray-500 hidden lg:block">
                Design genetic circuits with AI-powered Verilog generation
              </p>
            </div>
            
            {/* Chat Controls */}
            <div className="flex items-center gap-2 lg:gap-3 ml-4">
              {/* Manual Save Button */}
              {currentSessionId && (
                <button
                  onClick={handleManualSave}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Save Session"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              {/* Status Indicators */}
              {error && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm hidden lg:inline">Error occurred</span>
                </div>
              )}
              
              {outputFiles.length > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <Files className="w-4 h-4" />
                  <span className="text-sm hidden lg:inline">{outputFiles.length} files ready</span>
                </div>
              )}
              
              <div className="text-sm text-gray-500 hidden sm:block">
                {user?.name}
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-gray-50 rounded-lg border"
            >
              <h3 className="text-sm font-medium text-gray-900 mb-3">Chat Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Auto-save conversations</label>
                  <button
                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoSaveEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {currentSessionId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Current session</span>
                    <span className="text-xs text-gray-500 font-mono">{currentSessionId.slice(-8)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Messages */}
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
        />

        {/* Output Files Panel */}
        {outputFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-3 md:mx-6 mb-4 p-3 md:p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Files className="w-4 md:w-5 h-4 md:h-5" />
                <span className="text-sm md:text-base">Generated Files ({outputFiles.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm text-gray-500 hidden sm:block">
                  Folder: {folderName}
                </span>
                <button
                  onClick={() => setFilesVisible(!filesVisible)}
                  className="p-1.5 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                  title={filesVisible ? "Hide files" : "Show files"}
                >
                  {filesVisible ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-md text-red-500 hidden sm:inline">
                    {filesVisible ? "Hide" : "Show"}
                  </span>
                </button>
              </div>
            </div>
            
            {filesVisible && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {outputFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => downloadFile(file)}
                    className="flex items-center justify-between p-2 md:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <span className="text-xs md:text-sm font-medium text-gray-900 truncate">
                      {file.replace(/^temp_[a-f0-9]{32}_/, '')}
                    </span>
                    <Download className="w-3 md:w-4 h-3 md:h-4 text-gray-500 flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Input */}
        <MessageInput
          inputValue={inputMessage}
          onChange={handleInputChange}
          onSend={sendMessage}
          isLoading={isLoading}
          ucfMode={ucfMode.mode}
          onUcfModeChange={(mode) => setUcfMode(mode)}
          selectedUcf={ucfMode.selectedUcf}
          onUcfSelect={setSelectedUcf}
          ucfOptions={ucfOptions}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
