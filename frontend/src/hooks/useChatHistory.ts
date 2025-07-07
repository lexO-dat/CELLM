// Custom hook for managing chat history with localStorage and future Supabase migration
import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ChatHistorySession, 
  ChatHistoryFilter,
  ChatHistoryStats
} from '../types/chatHistory';
import { Message } from '../types';
import ChatHistoryStorage from '../utils/chatHistoryStorage';

export interface UseChatHistoryReturn {
  // Current session
  currentSession: ChatHistorySession | null;
  isLoadingSession: boolean;
  
  // Session management
  sessions: ChatHistorySession[];
  createNewSession: (title?: string) => string;
  loadSession: (sessionId: string) => Promise<Message[]>;
  saveCurrentSession: (messages: Message[], sessionData?: Partial<ChatHistorySession>) => void;
  deleteSession: (sessionId: string) => void;
  duplicateSession: (sessionId: string) => string;
  
  // Session actions
  archiveSession: (sessionId: string, archived?: boolean) => void;
  favoriteSession: (sessionId: string, favorite?: boolean) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  
  // History search and filtering
  searchSessions: (filter: ChatHistoryFilter) => ChatHistorySession[];
  filteredSessions: ChatHistorySession[];
  setFilter: (filter: ChatHistoryFilter) => void;
  currentFilter: ChatHistoryFilter;
  
  // Statistics
  stats: ChatHistoryStats;
  
  // Data management
  exportHistory: () => string;
  importHistory: (jsonData: string) => void;
  clearAllHistory: () => void;
  
  // Utilities
  generateSessionTitle: (messages: Message[]) => string;
  getStorageUsage: () => { sessions: number; messages: number; total: number };
  refreshSessions: () => void;
}

export const useChatHistory = (): UseChatHistoryReturn => {
  const [currentSession, setCurrentSession] = useState<ChatHistorySession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessions, setSessions] = useState<ChatHistorySession[]>([]);
  const [currentFilter, setCurrentFilter] = useState<ChatHistoryFilter>({
    isArchived: false,
    limit: 50
  });

  // Load sessions on mount
  useEffect(() => {
    const loadedSessions = ChatHistoryStorage.getAllSessions();
    setSessions(loadedSessions);
    
    // Load current session if exists
    const currentSessionId = ChatHistoryStorage.getCurrentSessionId();
    if (currentSessionId) {
      const session = ChatHistoryStorage.getSessionById(currentSessionId);
      setCurrentSession(session);
    }
  }, []);

  // Create a new chat session
  const createNewSession = useCallback((title?: string): string => {
    const newSession = ChatHistoryStorage.createSession({
      title: title || 'New Chat Session'
    });
    
    ChatHistoryStorage.saveSession(newSession);
    ChatHistoryStorage.setCurrentSessionId(newSession.id);
    
    setCurrentSession(newSession);
    
    // Refresh the entire sessions list from storage to ensure consistency
    const refreshedSessions = ChatHistoryStorage.getAllSessions();
    setSessions(refreshedSessions);
    
    return newSession.id;
  }, []);

  // Load a session and return its messages
  const loadSession = useCallback(async (sessionId: string): Promise<Message[]> => {
    setIsLoadingSession(true);
    
    try {
      const session = ChatHistoryStorage.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      const historyMessages = ChatHistoryStorage.getMessagesBySessionId(sessionId);
      
      // Convert history messages to chat messages
      const messages: Message[] = historyMessages.map(hm => ({
        id: hm.id,
        text: hm.text,
        isUser: hm.is_user,
        timestamp: new Date(hm.timestamp),
        thinking: hm.thinking,
        type: hm.type
      }));
      
      setCurrentSession(session);
      ChatHistoryStorage.setCurrentSessionId(sessionId);
      
      return messages;
    } catch (error) {
      console.error('Error loading session:', error);
      throw error;
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // Save current session with messages and metadata
  const saveCurrentSession = useCallback((messages: Message[], sessionData?: Partial<ChatHistorySession>) => {
    if (!currentSession) return;
    
    try {
      // Update session metadata
      const updatedSession: ChatHistorySession = {
        ...currentSession,
        ...sessionData,
        message_count: messages.length,
        last_message: messages[messages.length - 1]?.text.substring(0, 100),
        updated_at: new Date().toISOString()
      };
      
      // Save session
      ChatHistoryStorage.saveSession(updatedSession);
      setCurrentSession(updatedSession);
      
      // Save messages
      messages.forEach(message => {
        const historyMessage = ChatHistoryStorage.createMessage({
          id: message.id,
          chat_session_id: currentSession.id,
          text: message.text,
          is_user: message.isUser,
          thinking: message.thinking,
          type: message.type,
          timestamp: message.timestamp.toISOString()
        });
        
        ChatHistoryStorage.saveMessage(historyMessage);
      });
      
      // Refresh sessions list from storage to ensure it's up to date
      const refreshedSessions = ChatHistoryStorage.getAllSessions();
      setSessions(refreshedSessions);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [currentSession]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    ChatHistoryStorage.deleteSession(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  }, [currentSession]);

  // Duplicate a session
  const duplicateSession = useCallback((sessionId: string): string => {
    const originalSession = ChatHistoryStorage.getSessionById(sessionId);
    if (!originalSession) return '';
    
    const newSession = ChatHistoryStorage.createSession({
      ...originalSession,
      title: `${originalSession.title} (Copy)`,
      is_favorite: false
    });
    
    // Copy messages
    const originalMessages = ChatHistoryStorage.getMessagesBySessionId(sessionId);
    originalMessages.forEach(msg => {
      const newMessage = ChatHistoryStorage.createMessage({
        ...msg,
        chat_session_id: newSession.id
      });
      ChatHistoryStorage.saveMessage(newMessage);
    });
    
    ChatHistoryStorage.saveSession(newSession);
    setSessions(prev => [newSession, ...prev]);
    
    return newSession.id;
  }, []);

  // Archive/unarchive session
  const archiveSession = useCallback((sessionId: string, archived: boolean = true) => {
    ChatHistoryStorage.archiveSession(sessionId, archived);
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, is_archived: archived, updated_at: new Date().toISOString() } : s)
    );
  }, []);

  // Favorite/unfavorite session
  const favoriteSession = useCallback((sessionId: string, favorite: boolean = true) => {
    ChatHistoryStorage.favoriteSession(sessionId, favorite);
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, is_favorite: favorite, updated_at: new Date().toISOString() } : s)
    );
  }, []);

  // Update session title
  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    ChatHistoryStorage.updateSessionTitle(sessionId, title);
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s)
    );
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title } : null);
    }
  }, [currentSession]);

  // Search sessions
  const searchSessions = useCallback((filter: ChatHistoryFilter): ChatHistorySession[] => {
    return ChatHistoryStorage.searchSessions(filter);
  }, []);

  // Set filter and update filtered sessions
  const setFilter = useCallback((filter: ChatHistoryFilter) => {
    setCurrentFilter(filter);
  }, []);

  // Filtered sessions based on current filter
  const filteredSessions = useMemo(() => {
    return ChatHistoryStorage.searchSessions(currentFilter);
  }, [currentFilter, sessions]);

  // Get statistics
  const stats = useMemo(() => {
    return ChatHistoryStorage.getStats();
  }, [sessions]);

  // Generate smart session title based on messages
  const generateSessionTitle = useCallback((messages: Message[]): string => {
    if (messages.length === 0) return 'New Chat Session';
    
    const userMessages = messages.filter(m => m.isUser);
    if (userMessages.length === 0) return 'New Chat Session';
    
    const firstUserMessage = userMessages[0].text;
    
    // Extract key terms for title generation
    const terms = firstUserMessage
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3);
    
    if (terms.length === 0) {
      return firstUserMessage.substring(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
    }
    
    // Capitalize first letter of each term
    const title = terms
      .map(term => term.charAt(0).toUpperCase() + term.slice(1))
      .join(' ');
    
    return title + ' Circuit';
  }, []);

  // Export history as JSON
  const exportHistory = useCallback((): string => {
    const data = ChatHistoryStorage.exportData();
    return JSON.stringify(data, null, 2);
  }, []);

  // Import history from JSON
  const importHistory = useCallback((jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      ChatHistoryStorage.importData(data);
      setSessions(ChatHistoryStorage.getAllSessions());
    } catch (error) {
      console.error('Error importing history:', error);
      throw new Error('Invalid import data format');
    }
  }, []);

  // Clear all history
  const clearAllHistory = useCallback(() => {
    ChatHistoryStorage.clearAllData();
    setSessions([]);
    setCurrentSession(null);
  }, []);

  // Get storage usage
  const getStorageUsage = useCallback(() => {
    return ChatHistoryStorage.getStorageUsage();
  }, []);

  // Force refresh sessions from storage
  const refreshSessions = useCallback(() => {
    const refreshedSessions = ChatHistoryStorage.getAllSessions();
    setSessions(refreshedSessions);
  }, []);

  return {
    currentSession,
    isLoadingSession,
    sessions,
    createNewSession,
    loadSession,
    saveCurrentSession,
    deleteSession,
    duplicateSession,
    archiveSession,
    favoriteSession,
    updateSessionTitle,
    searchSessions,
    filteredSessions,
    setFilter,
    currentFilter,
    stats,
    exportHistory,
    importHistory,
    clearAllHistory,
    generateSessionTitle,
    getStorageUsage,
    refreshSessions
  };
};
