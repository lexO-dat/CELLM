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

// Utility functions for localStorage operations
class ChatHistoryStorage {
  // Session management
  static getAllSessions(): ChatHistorySession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      return [];
    }
  }

  static saveSession(session: ChatHistorySession): void {
    try {
      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }

  static getSessionById(id: string): ChatHistorySession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === id) || null;
  }

  static deleteSession(id: string): void {
    try {
      // Delete session
      const sessions = this.getAllSessions().filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      
      // Delete associated messages
      this.deleteMessagesBySessionId(id);
      
      // Clear current session if it was deleted
      if (this.getCurrentSessionId() === id) {
        this.setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  }

  static archiveSession(id: string, archived: boolean = true): void {
    const session = this.getSessionById(id);
    if (session) {
      session.is_archived = archived;
      session.updated_at = new Date().toISOString();
      this.saveSession(session);
    }
  }

  static favoriteSession(id: string, favorite: boolean = true): void {
    const session = this.getSessionById(id);
    if (session) {
      session.is_favorite = favorite;
      session.updated_at = new Date().toISOString();
      this.saveSession(session);
    }
  }

  static updateSessionTitle(id: string, title: string): void {
    const session = this.getSessionById(id);
    if (session) {
      session.title = title;
      session.updated_at = new Date().toISOString();
      this.saveSession(session);
    }
  }

  // Message management
  static getAllMessages(): ChatHistoryMessage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }
  }

  static saveMessage(message: ChatHistoryMessage): void {
    try {
      const messages = this.getAllMessages();
      const existingIndex = messages.findIndex(m => m.id === message.id);
      
      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.push(message);
      }
      
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  static getMessagesBySessionId(sessionId: string): ChatHistoryMessage[] {
    return this.getAllMessages()
      .filter(m => m.chat_session_id === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  static deleteMessagesBySessionId(sessionId: string): void {
    try {
      const messages = this.getAllMessages().filter(m => m.chat_session_id !== sessionId);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.error('Error deleting messages for session:', error);
    }
  }

  static deleteMessage(messageId: string): void {
    try {
      const messages = this.getAllMessages().filter(m => m.id !== messageId);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  // Current session management
  static getCurrentSessionId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  }

  static setCurrentSessionId(sessionId: string | null): void {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, sessionId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    }
  }

  // Search and filtering
  static searchSessions(filter: ChatHistoryFilter): ChatHistorySession[] {
    let sessions = this.getAllSessions();

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
  static getStats(): ChatHistoryStats {
    const sessions = this.getAllSessions();
    const messages = this.getAllMessages();

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
  static exportData(): ChatHistoryExport {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      sessions: this.getAllSessions(),
      messages: this.getAllMessages(),
      stats: this.getStats()
    };
  }

  static importData(data: ChatHistoryExport): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(data.sessions));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(data.messages));
    } catch (error) {
      console.error('Error importing chat history data:', error);
      throw new Error('Failed to import chat history');
    }
  }

  // Cleanup and maintenance
  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  static getStorageUsage(): { sessions: number; messages: number; total: number } {
    const sessionsSize = localStorage.getItem(STORAGE_KEYS.SESSIONS)?.length || 0;
    const messagesSize = localStorage.getItem(STORAGE_KEYS.MESSAGES)?.length || 0;
    
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
