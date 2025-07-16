// Custom hook for managing chat history with localStorage and future Supabase migration
import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  ChatHistorySession, 
  ChatHistoryFilter,
  ChatHistoryStats
} from '../types/chatHistory';
import { Message } from '../types';
import ChatHistoryStorage from '../utils/chatHistoryStorage';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const userId = user?.id;
  
  const [currentSession, setCurrentSession] = useState<ChatHistorySession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessions, setSessions] = useState<ChatHistorySession[]>([]);
  const [currentFilter, setCurrentFilter] = useState<ChatHistoryFilter>({
    isArchived: false,
    limit: 50
  });

  // Load sessions on mount and when user changes
  useEffect(() => {
    if (userId) {
      const loadedSessions = ChatHistoryStorage.getAllSessions(userId);
      setSessions(loadedSessions);
      
      // Load current session if exists
      const currentSessionId = ChatHistoryStorage.getCurrentSessionId(userId);
      if (currentSessionId) {
        const session = ChatHistoryStorage.getSessionById(currentSessionId, userId);
        setCurrentSession(session);
      }
    } else {
      // Clear sessions when user logs out
      setSessions([]);
      setCurrentSession(null);
    }
  }, [userId]);

  // Create a new chat session
  const createNewSession = useCallback((title?: string): string => {
    if (!userId) return '';
    
    const newSession = ChatHistoryStorage.createSession({
      title: title || 'New Chat Session',
      user_id: userId
    });
    
    ChatHistoryStorage.saveSession(newSession, userId);
    ChatHistoryStorage.setCurrentSessionId(newSession.id, userId);
    
    setCurrentSession(newSession);
    
    // Refresh the entire sessions list from storage to ensure consistency
    const refreshedSessions = ChatHistoryStorage.getAllSessions(userId);
    setSessions(refreshedSessions);
    
    return newSession.id;
  }, [userId]);

  // Load a session and return its messages
  const loadSession = useCallback(async (sessionId: string): Promise<Message[]> => {
    if (!userId) return [];
    
    setIsLoadingSession(true);
    
    try {
      const session = ChatHistoryStorage.getSessionById(sessionId, userId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      const historyMessages = ChatHistoryStorage.getMessagesBySessionId(sessionId, userId);
      
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
      ChatHistoryStorage.setCurrentSessionId(sessionId, userId);
      
      return messages;
    } catch (error) {
      console.error('Error loading session:', error);
      throw error;
    } finally {
      setIsLoadingSession(false);
    }
  }, [userId]);

  // Save current session with messages and metadata
  const saveCurrentSession = useCallback((messages: Message[], sessionData?: Partial<ChatHistorySession>) => {
    if (!currentSession || !userId) return;
    
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
      ChatHistoryStorage.saveSession(updatedSession, userId);
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
        
        ChatHistoryStorage.saveMessage(historyMessage, userId);
      });
      
      // Refresh sessions list from storage to ensure it's up to date
      const refreshedSessions = ChatHistoryStorage.getAllSessions(userId);
      setSessions(refreshedSessions);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [currentSession, userId]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    if (!userId) return;
    
    ChatHistoryStorage.deleteSession(sessionId, userId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  }, [currentSession, userId]);

  // Duplicate a session
  const duplicateSession = useCallback((sessionId: string): string => {
    if (!userId) return '';
    
    const originalSession = ChatHistoryStorage.getSessionById(sessionId, userId);
    if (!originalSession) return '';
    
    const newSession = ChatHistoryStorage.createSession({
      ...originalSession,
      title: `${originalSession.title} (Copy)`,
      is_favorite: false,
      user_id: userId
    });
    
    // Copy messages
    const originalMessages = ChatHistoryStorage.getMessagesBySessionId(sessionId, userId);
    originalMessages.forEach(msg => {
      const newMessage = ChatHistoryStorage.createMessage({
        ...msg,
        chat_session_id: newSession.id
      });
      ChatHistoryStorage.saveMessage(newMessage, userId);
    });
    
    ChatHistoryStorage.saveSession(newSession, userId);
    setSessions(prev => [newSession, ...prev]);
    
    return newSession.id;
  }, [userId]);

  // Archive/unarchive session
  const archiveSession = useCallback((sessionId: string, archived: boolean = true) => {
    if (!userId) return;
    
    ChatHistoryStorage.archiveSession(sessionId, archived, userId);
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, is_archived: archived, updated_at: new Date().toISOString() } : s)
    );
  }, [userId]);

  // Favorite/unfavorite session
  const favoriteSession = useCallback((sessionId: string, favorite: boolean = true) => {
    if (!userId) return;
    
    ChatHistoryStorage.favoriteSession(sessionId, favorite, userId);
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, is_favorite: favorite, updated_at: new Date().toISOString() } : s)
    );
  }, [userId]);

  // Update session title
  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    if (!userId) return;
    
    ChatHistoryStorage.updateSessionTitle(sessionId, title, userId);
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s)
    );
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title } : null);
    }
  }, [currentSession, userId]);

  // Search sessions
  const searchSessions = useCallback((filter: ChatHistoryFilter): ChatHistorySession[] => {
    if (!userId) return [];
    return ChatHistoryStorage.searchSessions(filter, userId);
  }, [userId]);

  // Set filter and update filtered sessions
  const setFilter = useCallback((filter: ChatHistoryFilter) => {
    setCurrentFilter(filter);
  }, []);

  // Filtered sessions based on current filter
  const filteredSessions = useMemo(() => {
    if (!userId) return [];
    return ChatHistoryStorage.searchSessions(currentFilter, userId);
  }, [currentFilter, sessions, userId]);

  // Get statistics
  const stats = useMemo(() => {
    if (!userId) return { totalSessions: 0, totalMessages: 0, favoriteCount: 0, archivedCount: 0 };
    return ChatHistoryStorage.getStats(userId);
  }, [sessions, userId]);

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
    if (!userId) return '{}';
    const data = ChatHistoryStorage.exportData(userId);
    return JSON.stringify(data, null, 2);
  }, [userId]);

  // Import history from JSON
  const importHistory = useCallback((jsonData: string) => {
    if (!userId) return;
    
    try {
      const data = JSON.parse(jsonData);
      ChatHistoryStorage.importData(data, userId);
      setSessions(ChatHistoryStorage.getAllSessions(userId));
    } catch (error) {
      console.error('Error importing history:', error);
      throw new Error('Invalid import data format');
    }
  }, [userId]);

  // Clear all history
  const clearAllHistory = useCallback(() => {
    if (!userId) return;
    
    ChatHistoryStorage.clearAllData(userId);
    setSessions([]);
    setCurrentSession(null);
  }, [userId]);

  // Get storage usage
  const getStorageUsage = useCallback(() => {
    if (!userId) return { sessions: 0, messages: 0, total: 0 };
    return ChatHistoryStorage.getStorageUsage(userId);
  }, [userId]);

  // Force refresh sessions from storage
  const refreshSessions = useCallback(() => {
    if (!userId) return;
    
    const refreshedSessions = ChatHistoryStorage.getAllSessions(userId);
    setSessions(refreshedSessions);
  }, [userId]);

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
