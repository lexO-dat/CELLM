import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import MessageList from '../Message/MessageList';
import MessageInput from '../Message/MessageInput';
import Sidebar from '../Layout/Sidebar';
import { apiService } from '../../services/api';
import { ChatSession, Message } from '../../types';
import { Files, Download, AlertCircle } from 'lucide-react';

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
    setUcfMode, 
    setSelectedUcf, 
    setOutputFiles, 
    setFolderName,
    setError,
    generateMessageId
  } = useChat();

  const [inputMessage, setInputMessage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Set responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // Mobile
        setSidebarCollapsed(true);
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

  const createNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: generateMessageId(),
      title: 'New Chat',
      createdAt: new Date(),
      messageCount: 0
    };
    setChatSessions(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  }, [generateMessageId]);

  const selectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    // In a real app, you'd load the messages for this chat
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  }, [activeChatId]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Omit<Message, 'id' | 'timestamp'> = {
      text: inputMessage,
      isUser: true,
      type: 'text'
    };

    addMessage(userMessage);
    setInputMessage('');
    setError(undefined);

    try {
      // Step 1: Generate Verilog code
      addMessage({
        text: 'Generating Verilog code for your genetic circuit...',
        isUser: false,
        type: 'system'
      });

      const verilogResult = await apiService.generateVerilog(inputMessage);
      
      addMessage({
        text: verilogResult.response,
        isUser: false,
        thinking: verilogResult.thinking,
        type: 'verilog'
      });

      // Extract Verilog module
      const verilogCode = apiService.extractVerilogModule(verilogResult.response);
      if (!verilogCode) {
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
    ucfMode, 
    ucfOptions, 
    addMessage, 
    setSelectedUcf, 
    setOutputFiles, 
    setFolderName, 
    setError
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
        md:relative md:block
        ${sidebarCollapsed ? 'hidden' : 'fixed inset-0 z-50 md:z-auto'}
      `}>
        {!sidebarCollapsed && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        <div className={`
          ${sidebarCollapsed ? 'hidden md:block' : 'block'}
          h-full md:h-auto
        `}>
          <Sidebar
            isCollapsed={false} // Always show full sidebar on mobile when open
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            chatSessions={chatSessions}
            activeChatId={activeChatId || undefined}
            onChatSelect={(chatId) => {
              selectChat(chatId);
              setSidebarCollapsed(true); // Close sidebar after selecting chat on mobile
            }}
            onNewChat={() => {
              createNewChat();
              setSidebarCollapsed(true); // Close sidebar after creating new chat on mobile
            }}
            onDeleteChat={deleteChat}
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
            
            {/* Status Indicators */}
            <div className="flex items-center gap-2 lg:gap-4 ml-4">
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
              <span className="text-xs md:text-sm text-gray-500 hidden sm:block">
                Folder: {folderName}
              </span>
            </div>
            
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
