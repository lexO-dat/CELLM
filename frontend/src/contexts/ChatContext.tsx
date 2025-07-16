import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Message, ChatState, UCFOption } from '../types';
import { useChatHistory } from '../hooks/useChatHistory';
import ChatHistoryStorage from '../utils/chatHistoryStorage';

const UCF_OPTIONS: UCFOption[] = [
  { id: 0, name: 'Bth1C1G1T1', description: 'Bacillus thuringiensis', organism: 'B. thuringiensis', gates: 1, complexity: 'simple' },
  { id: 1, name: 'Eco1C1G1T1', description: 'E. coli', organism: 'E. coli', gates: 1, complexity: 'simple' },
  { id: 2, name: 'Eco1C2G2T2', description: 'E. coli', organism: 'E. coli', gates: 2, complexity: 'medium' },
  { id: 3, name: 'Eco2C1G3T1', description: 'E. coli', organism: 'E. coli', gates: 3, complexity: 'medium' },
  { id: 4, name: 'Eco2C1G5T1', description: 'E. coli', organism: 'E. coli', gates: 5, complexity: 'complex' },
  { id: 5, name: 'SC1C1G1T1', description: 'S. cerevisiae', organism: 'S. cerevisiae', gates: 1, complexity: 'simple' },
];

interface ChatContextType extends ChatState {
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setUcfMode: (mode: 'auto' | 'manual') => void;
  setSelectedUcf: (ucf: UCFOption) => void;
  setVerilogRefining: (isRefining: boolean) => void;
  setOutputFiles: (files: string[]) => void;
  setFolderName: (name: string) => void;
  setError: (error?: string) => void;
  ucfOptions: UCFOption[];
  generateMessageId: () => string;
  parseThinking: (text: string) => { thinking?: string; response: string };
  
  // Chat History Integration
  currentSessionId: string | null;
  isLoadingSession: boolean;
  createNewSession: (title?: string) => string;
  loadSession: (sessionId: string) => Promise<void>;
  saveSession: () => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    ucfMode: {
      mode: 'auto',
      isProcessing: false
    },
    verilogState: {
      isRefining: false,
      isGenerating: false
    },
    outputFiles: [],
    folderName: ''
  });

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Initialize chat history hook
  const {
    currentSession,
    isLoadingSession,
    createNewSession: createHistorySession,
    loadSession: loadHistorySession,
    saveCurrentSession,
    generateSessionTitle
  } = useChatHistory();

  // Auto-save effect - saves periodically when auto-save is enabled
  useEffect(() => {
    if (!autoSaveEnabled || !currentSession || chatState.messages.length === 0) return;
    
    const autoSaveInterval = setInterval(() => {
      saveCurrentSession(chatState.messages, {
        title: chatState.messages.length === 1 ? generateSessionTitle(chatState.messages) : currentSession.title,
        ucf_mode: chatState.ucfMode.mode,
        selected_ucf_id: chatState.ucfMode.selectedUcf?.id,
        selected_ucf_name: chatState.ucfMode.selectedUcf?.name,
        verilog_code: chatState.verilogState.currentCode,
        output_files: chatState.outputFiles,
        folder_name: chatState.folderName
      });
    }, 10000); // Auto-save every 10 seconds instead of 5
    
    return () => clearInterval(autoSaveInterval);
  }, [autoSaveEnabled, currentSession, chatState.messages.length, saveCurrentSession, generateSessionTitle]); // Only depend on message count, not entire chatState

  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const parseThinking = useCallback((text: string): { thinking?: string; response: string } => {
    if (text.includes('</think>')) {
      const parts = text.split('</think>', 2);
      return {
        thinking: parts[0].trim(),
        response: parts[1].trim()
      };
    }
    return { response: text };
  }, []);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateMessageId(),
      timestamp: new Date()
    };

    setChatState(prev => {
      const updatedMessages = [...prev.messages, newMessage];
      
      // Save immediately when user sends a message (isUser = true)
      if (message.isUser && currentSession) {
        setTimeout(() => {
          saveCurrentSession(updatedMessages, {
            title: updatedMessages.length === 1 ? generateSessionTitle(updatedMessages) : currentSession.title,
            ucf_mode: prev.ucfMode.mode,
            selected_ucf_id: prev.ucfMode.selectedUcf?.id,
            selected_ucf_name: prev.ucfMode.selectedUcf?.name,
            verilog_code: prev.verilogState.currentCode,
            output_files: prev.outputFiles,
            folder_name: prev.folderName
          });
        }, 100);
      }
      
      return {
        ...prev,
        messages: updatedMessages
      };
    });
  }, [generateMessageId, currentSession, saveCurrentSession, generateSessionTitle]);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setChatState(prev => {
      const updatedMessages = prev.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      );
      
      return {
        ...prev,
        messages: updatedMessages
      };
    });
  }, []);

  const clearMessages = useCallback(() => {
    setChatState(prev => ({
      ...prev,
      messages: []
    }));
  }, []);

  const setUcfMode = useCallback((mode: 'auto' | 'manual') => {
    setChatState(prev => ({
      ...prev,
      ucfMode: {
        ...prev.ucfMode,
        mode
      }
    }));
  }, []);

  const setSelectedUcf = useCallback((ucf: UCFOption) => {
    setChatState(prev => ({
      ...prev,
      ucfMode: {
        ...prev.ucfMode,
        selectedUcf: ucf
      }
    }));
  }, []);

  const setVerilogRefining = useCallback((isRefining: boolean) => {
    setChatState(prev => ({
      ...prev,
      verilogState: {
        ...prev.verilogState,
        isRefining
      }
    }));
  }, []);

  const setOutputFiles = useCallback((files: string[]) => {
    setChatState(prev => ({
      ...prev,
      outputFiles: files
    }));
  }, []);

  const setFolderName = useCallback((name: string) => {
    setChatState(prev => ({
      ...prev,
      folderName: name
    }));
  }, []);

  const setError = useCallback((error?: string) => {
    setChatState(prev => ({
      ...prev,
      error
    }));
  }, []);

  // Chat History Integration Methods
  const createNewSession = useCallback((title?: string): string => {
    // Don't create a new session if we already have an empty one
    if (currentSession && chatState.messages.length === 0) {
      return currentSession.id;
    }
    
    // Clear current messages and session-specific data
    setChatState(prev => ({
      ...prev,
      messages: [],
      outputFiles: [],
      folderName: '',
      error: undefined
    }));
    
    // Create new session
    const sessionId = createHistorySession(title);
    
    return sessionId;
  }, [createHistorySession, currentSession, chatState.messages.length]);

  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const messages = await loadHistorySession(sessionId);
      
      // Load session-specific data including output files and folder name
      const sessionData = ChatHistoryStorage.getSessionById(sessionId);
      
      setChatState(prev => ({
        ...prev,
        messages,
        outputFiles: sessionData?.output_files || [],
        folderName: sessionData?.folder_name || '',
        ucfMode: {
          ...prev.ucfMode,
          mode: sessionData?.ucf_mode || 'auto',
          selectedUcf: sessionData?.selected_ucf_id !== undefined 
            ? UCF_OPTIONS.find(ucf => ucf.id === sessionData.selected_ucf_id) || prev.ucfMode.selectedUcf
            : prev.ucfMode.selectedUcf
        }
      }));
    } catch (error) {
      console.error('Error loading session:', error);
      setError('Failed to load session');
    }
  }, [loadHistorySession, setError]);

  const saveSession = useCallback(() => {
    if (currentSession && chatState.messages.length > 0) {
      saveCurrentSession(chatState.messages, {
        title: currentSession.title || generateSessionTitle(chatState.messages),
        ucf_mode: chatState.ucfMode.mode,
        selected_ucf_id: chatState.ucfMode.selectedUcf?.id,
        selected_ucf_name: chatState.ucfMode.selectedUcf?.name,
        verilog_code: chatState.verilogState.currentCode,
        output_files: chatState.outputFiles,
        folder_name: chatState.folderName
      });
    }
  }, [currentSession, chatState, saveCurrentSession, generateSessionTitle]);

  return (
    <ChatContext.Provider value={{
      ...chatState,
      addMessage,
      updateMessage,
      clearMessages,
      setUcfMode,
      setSelectedUcf,
      setVerilogRefining,
      setOutputFiles,
      setFolderName,
      setError,
      ucfOptions: UCF_OPTIONS,
      generateMessageId,
      parseThinking,
      currentSessionId: currentSession?.id || null,
      isLoadingSession,
      createNewSession,
      loadSession,
      saveSession,
      autoSaveEnabled,
      setAutoSaveEnabled
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
