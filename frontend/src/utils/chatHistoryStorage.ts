// Local Storage utilities for chat history with Supabase-compatible schema
import { 
  ChatHistorySession, 
  ChatHistoryMessage, 
  ChatHistoryFilter,
  ChatHistoryStats,
  ChatHistoryExport
} from '../types/chatHistory';

const STORAGE_KEYS = {
  SESSIONS: 'cellm_chat_sessions',
  MESSAGES: 'cellm_chat_messages',
  CURRENT_SESSION: 'cellm_current_session_id',
  SETTINGS: 'cellm_chat_settings'
} as const;

// Utility functions for localStorage operations with user-specific storage
class ChatHistoryStorage {
  // Get user-specific storage key
  private static getUserKey(baseKey: string, userId?: string): string {
    return userId ? `${baseKey}_${userId}` : baseKey;
  }

  // Session management
  static getAllSessions(userId?: string): ChatHistorySession[] {
    try {
      const key = this.getUserKey(STORAGE_KEYS.SESSIONS, userId);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      return [];
    }
  }

  static saveSession(session: ChatHistorySession, userId?: string): void {
    try {
      const sessions = this.getAllSessions(userId);
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      const key = this.getUserKey(STORAGE_KEYS.SESSIONS, userId);
      localStorage.setItem(key, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }

  static getSessionById(id: string, userId?: string): ChatHistorySession | null {
    const sessions = this.getAllSessions(userId);
    return sessions.find(s => s.id === id) || null;
  }

  static deleteSession(id: string, userId?: string): void {
    try {
      // Delete session
      const sessions = this.getAllSessions(userId).filter(s => s.id !== id);
      const key = this.getUserKey(STORAGE_KEYS.SESSIONS, userId);
      localStorage.setItem(key, JSON.stringify(sessions));
      
      // Delete associated messages
      this.deleteMessagesBySessionId(id, userId);
      
      // Clear current session if it was deleted
      if (this.getCurrentSessionId(userId) === id) {
        this.setCurrentSessionId(null, userId);
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  }

  static archiveSession(id: string, archived: boolean = true, userId?: string): void {
    const session = this.getSessionById(id, userId);
    if (session) {
      session.is_archived = archived;
      session.updated_at = new Date().toISOString();
      this.saveSession(session, userId);
    }
  }

  static favoriteSession(id: string, favorite: boolean = true, userId?: string): void {
    const session = this.getSessionById(id, userId);
    if (session) {
      session.is_favorite = favorite;
      session.updated_at = new Date().toISOString();
      this.saveSession(session, userId);
    }
  }

  static updateSessionTitle(id: string, title: string, userId?: string): void {
    const session = this.getSessionById(id, userId);
    if (session) {
      session.title = title;
      session.updated_at = new Date().toISOString();
      this.saveSession(session, userId);
    }
  }

  // Message management
  static getAllMessages(userId?: string): ChatHistoryMessage[] {
    try {
      const key = this.getUserKey(STORAGE_KEYS.MESSAGES, userId);
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }
  }

  static saveMessage(message: ChatHistoryMessage, userId?: string): void {
    try {
      const messages = this.getAllMessages(userId);
      const existingIndex = messages.findIndex(m => m.id === message.id);
      
      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.push(message);
      }
      
      const key = this.getUserKey(STORAGE_KEYS.MESSAGES, userId);
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  static getMessagesBySessionId(sessionId: string, userId?: string): ChatHistoryMessage[] {
    return this.getAllMessages(userId)
      .filter(m => m.chat_session_id === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  static deleteMessagesBySessionId(sessionId: string, userId?: string): void {
    try {
      const messages = this.getAllMessages(userId).filter(m => m.chat_session_id !== sessionId);
      const key = this.getUserKey(STORAGE_KEYS.MESSAGES, userId);
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error('Error deleting messages for session:', error);
    }
  }

  static deleteMessage(messageId: string, userId?: string): void {
    try {
      const messages = this.getAllMessages(userId).filter(m => m.id !== messageId);
      const key = this.getUserKey(STORAGE_KEYS.MESSAGES, userId);
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  // Current session management
  static getCurrentSessionId(userId?: string): string | null {
    const key = this.getUserKey(STORAGE_KEYS.CURRENT_SESSION, userId);
    return localStorage.getItem(key);
  }

  static setCurrentSessionId(sessionId: string | null, userId?: string): void {
    const key = this.getUserKey(STORAGE_KEYS.CURRENT_SESSION, userId);
    if (sessionId) {
      localStorage.setItem(key, sessionId);
    } else {
      localStorage.removeItem(key);
    }
  }

  // Search and filtering
  static searchSessions(filter: ChatHistoryFilter, userId?: string): ChatHistorySession[] {
    let sessions = this.getAllSessions(userId);

    // Apply filters
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      sessions = sessions.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.last_message?.toLowerCase().includes(query)
      );
    }

    if (filter.ucfMode && filter.ucfMode !== 'all') {
      sessions = sessions.filter(s => s.ucf_mode === filter.ucfMode);
    }

    if (filter.dateRange) {
      const { start, end } = filter.dateRange;
      sessions = sessions.filter(s => {
        const sessionDate = new Date(s.created_at);
        return sessionDate >= start && sessionDate <= end;
      });
    }

    if (filter.isArchived !== undefined) {
      sessions = sessions.filter(s => s.is_archived === filter.isArchived);
    }

    if (filter.isFavorite !== undefined) {
      sessions = sessions.filter(s => s.is_favorite === filter.isFavorite);
    }

    // Sort by updated_at descending
    sessions.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    // Apply pagination
    if (filter.offset !== undefined && filter.limit !== undefined) {
      sessions = sessions.slice(filter.offset, filter.offset + filter.limit);
    } else if (filter.limit !== undefined) {
      sessions = sessions.slice(0, filter.limit);
    }

    return sessions;
  }

  // Statistics
  static getStats(userId?: string): ChatHistoryStats {
    const sessions = this.getAllSessions(userId);
    const messages = this.getAllMessages(userId);

    const ucfCounts: { [key: string]: number } = {};
    sessions.forEach(session => {
      if (session.selected_ucf_name) {
        ucfCounts[session.selected_ucf_name] = (ucfCounts[session.selected_ucf_name] || 0) + 1;
      }
    });

    const mostUsedUcf = Object.keys(ucfCounts).reduce((a, b) => 
      ucfCounts[a] > ucfCounts[b] ? a : b, 
      Object.keys(ucfCounts)[0]
    );

    const lastSession = sessions.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

    return {
      totalSessions: sessions.length,
      totalMessages: messages.length,
      favoriteCount: sessions.filter(s => s.is_favorite).length,
      archivedCount: sessions.filter(s => s.is_archived).length,
      lastSessionDate: lastSession?.updated_at,
      mostUsedUcf
    };
  }

  // Data export/import for migration
  static exportData(userId?: string): ChatHistoryExport {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      sessions: this.getAllSessions(userId),
      messages: this.getAllMessages(userId),
      stats: this.getStats(userId)
    };
  }

  static importData(data: ChatHistoryExport, userId?: string): void {
    try {
      const sessionsKey = this.getUserKey(STORAGE_KEYS.SESSIONS, userId);
      const messagesKey = this.getUserKey(STORAGE_KEYS.MESSAGES, userId);
      
      localStorage.setItem(sessionsKey, JSON.stringify(data.sessions));
      localStorage.setItem(messagesKey, JSON.stringify(data.messages));
    } catch (error) {
      console.error('Error importing chat history data:', error);
      throw new Error('Failed to import chat history');
    }
  }

  // Cleanup and maintenance
  static clearAllData(userId?: string): void {
    if (userId) {
      // Clear user-specific data
      Object.values(STORAGE_KEYS).forEach(key => {
        const userKey = this.getUserKey(key, userId);
        localStorage.removeItem(userKey);
      });
    } else {
      // Clear all data
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

  static getStorageUsage(userId?: string): { sessions: number; messages: number; total: number } {
    const sessionsKey = this.getUserKey(STORAGE_KEYS.SESSIONS, userId);
    const messagesKey = this.getUserKey(STORAGE_KEYS.MESSAGES, userId);
    
    const sessionsSize = localStorage.getItem(sessionsKey)?.length || 0;
    const messagesSize = localStorage.getItem(messagesKey)?.length || 0;
    
    return {
      sessions: sessionsSize,
      messages: messagesSize,
      total: sessionsSize + messagesSize
    };
  }

  // Helper for creating new sessions/messages with proper structure
  static createSession(partial: Partial<ChatHistorySession>): ChatHistorySession {
    const now = new Date().toISOString();
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Chat Session',
      ucf_mode: 'auto',
      output_files: [],
      message_count: 0,
      created_at: now,
      updated_at: now,
      is_archived: false,
      is_favorite: false,
      ...partial
    };
  }

  static createMessage(partial: Partial<ChatHistoryMessage>): ChatHistoryMessage {
    const now = new Date().toISOString();
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chat_session_id: '',
      text: '',
      is_user: false,
      timestamp: now,
      created_at: now,
      updated_at: now,
      ...partial
    };
  }
}

export default ChatHistoryStorage;
