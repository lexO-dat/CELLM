// Enhanced types for CELLM frontend

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  thinking?: string; // For model thinking process
  isTyping?: boolean;
  type?: 'text' | 'verilog' | 'ucf_selection' | 'system' | 'error';
}

export interface UCFOption {
  id: number;
  name: string;
  description?: string;
  organism?: string;
  gates?: number;
  complexity?: 'simple' | 'medium' | 'complex';
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  lastMessage?: string;
  messageCount: number;
}

export interface UCFSelectionMode {
  mode: 'auto' | 'manual';
  selectedUcf?: UCFOption;
  isProcessing: boolean;
}

export interface VerilogGeneration {
  isRefining: boolean;
  currentCode?: string;
  isGenerating: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  ucfMode: UCFSelectionMode;
  verilogState: VerilogGeneration;
  outputFiles: string[];
  folderName: string;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  isLoading: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Re-export chat history types
export * from './chatHistory';
