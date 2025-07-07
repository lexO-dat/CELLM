// Chat History Types - Compatible with Supabase PostgreSQL migration
// These types mirror the structure that will be used in Supabase

export interface ChatHistoryMessage {
  id: string;
  chat_session_id: string;
  text: string;
  is_user: boolean;
  thinking?: string;
  type?: 'text' | 'verilog' | 'ucf_selection' | 'system' | 'error';
  timestamp: string; // ISO string for database compatibility
  created_at: string; // ISO string for database compatibility
  updated_at: string; // ISO string for database compatibility
}

export interface ChatHistorySession {
  id: string;
  user_id?: string; // Will be used when migrating to Supabase with auth
  title: string;
  description?: string;
  ucf_mode: 'auto' | 'manual';
  selected_ucf_id?: number;
  selected_ucf_name?: string;
  verilog_code?: string;
  output_files: string[]; // JSON array stored as string in localStorage
  folder_name?: string;
  message_count: number;
  last_message?: string;
  created_at: string; // ISO string for database compatibility
  updated_at: string; // ISO string for database compatibility
  is_archived: boolean;
  is_favorite: boolean;
}

export interface ChatHistoryFilter {
  searchQuery?: string;
  ucfMode?: 'auto' | 'manual' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
  isArchived?: boolean;
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
}

export interface ChatHistoryStats {
  totalSessions: number;
  totalMessages: number;
  favoriteCount: number;
  archivedCount: number;
  lastSessionDate?: string;
  mostUsedUcf?: string;
}

// Database migration types for future Supabase integration
export interface SupabaseChatSession {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  ucf_mode: 'auto' | 'manual';
  selected_ucf_id?: number;
  selected_ucf_name?: string;
  verilog_code?: string;
  output_files: string[];
  folder_name?: string;
  message_count: number;
  last_message?: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  is_favorite: boolean;
}

export interface SupabaseChatMessage {
  id: string;
  chat_session_id: string;
  text: string;
  is_user: boolean;
  thinking?: string;
  type?: 'text' | 'verilog' | 'ucf_selection' | 'system' | 'error';
  timestamp: string;
  created_at: string;
  updated_at: string;
}

// Export helper for migration
export interface ChatHistoryExport {
  version: string;
  exportedAt: string;
  sessions: ChatHistorySession[];
  messages: ChatHistoryMessage[];
  stats: ChatHistoryStats;
}
