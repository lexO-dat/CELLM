import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Edit3,
  Search,
  Star,
  Archive,
  Copy,
  Download,
  Upload,
  Database
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import { useChatHistory } from '../../hooks/useChatHistory';
import { ChatHistoryFilter } from '../../types/chatHistory';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle
}) => {
  const { user, logout } = useAuth();
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'favorites' | 'archived'>('all');
  const [showHistoryManager, setShowHistoryManager] = useState(false);

  // Chat history hooks
  const { 
    filteredSessions,
    setFilter,
    archiveSession,
    favoriteSession,
    deleteSession,
    duplicateSession,
    updateSessionTitle,
    stats,
    exportHistory,
    importHistory,
    clearAllHistory,
    refreshSessions
  } = useChatHistory();
  
  const { 
    loadSession, 
    currentSessionId, 
    isLoadingSession,
    createNewSession 
  } = useChat();

  // Update filter when search or filter changes
  React.useEffect(() => {
    const filter: ChatHistoryFilter = {
      searchQuery: searchQuery || undefined,
      isArchived: selectedFilter === 'archived' ? true : selectedFilter === 'all' ? undefined : false,
      isFavorite: selectedFilter === 'favorites' ? true : undefined,
      limit: 50
    };
    setFilter(filter);
  }, [searchQuery, selectedFilter, setFilter]);

  // Refresh sessions periodically to ensure UI stays updated
  React.useEffect(() => {
    const interval = setInterval(() => {
      refreshSessions();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, [refreshSessions]);

  const handleSessionClick = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    
    try {
      await loadSession(sessionId);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleNewSession = () => {
    createNewSession();
    // Refresh the sessions list to ensure the new session appears immediately
    setTimeout(() => {
      refreshSessions();
    }, 100);
  };

  const handleEditStart = (sessionId: string, currentTitle: string) => {
    setEditingSession(sessionId);
    setEditTitle(currentTitle);
  };

  const handleEditSave = () => {
    if (editingSession && editTitle.trim()) {
      updateSessionTitle(editingSession, editTitle.trim());
    }
    setEditingSession(null);
    setEditTitle('');
  };

  const handleEditCancel = () => {
    setEditingSession(null);
    setEditTitle('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getFilterCount = (filter: 'all' | 'favorites' | 'archived') => {
    switch (filter) {
      case 'favorites': return stats.favoriteCount;
      case 'archived': return stats.archivedCount;
      default: return stats.totalSessions - stats.archivedCount;
    }
  };

  const handleExport = () => {
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
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 60 : 280 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-900 text-white h-full flex flex-col relative md:relative z-40"
    >
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 md:gap-3"
              >
                <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 md:w-5 md:h-5" />
                </div>
                <span className="font-semibold text-sm md:text-base">CELLM</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={onToggle}
            className="p-1.5 md:p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3 md:w-4 md:h-4" /> : <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />}
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3 md:p-4">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm md:text-base"
        >
          <Plus className="w-4 md:w-5 h-4 md:h-5" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                New Chat
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Search and Filters (when expanded) */}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 md:px-4 pb-3"
          >
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-white placeholder-gray-400"
              />
            </div>
            
            {/* Filter Tabs */}
            <div className="flex space-x-1 mb-3">
              {[
                { key: 'all', icon: MessageSquare, label: 'All' },
                { key: 'favorites', icon: Star, label: 'Favorites' },
                { key: 'archived', icon: Archive, label: 'Archived' }
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedFilter(key as any)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedFilter === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                  }`}
                  title={`${label} (${getFilterCount(key as any)})`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{getFilterCount(key as any)}</span>
                </button>
              ))}
            </div>

            {/* History Manager Button */}
            <button
              onClick={() => setShowHistoryManager(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors text-xs"
            >
              <Database className="w-3 h-3" />
              <span>Manage History</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 md:px-4 pb-4"
            >
              {isLoadingSession && (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400 mt-2">Loading session...</p>
                </div>
              )}
              
              {filteredSessions.length === 0 && !isLoadingSession ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No conversations found' : 'No chat history yet'}
                  </p>
                  <p className="text-xs">
                    {searchQuery ? 'Try a different search term' : 'Start a new conversation to see your chats here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className="relative"
                      onMouseEnter={() => setHoveredChatId(session.id)}
                      onMouseLeave={() => setHoveredChatId(null)}
                    >
                      <button
                        onClick={() => handleSessionClick(session.id)}
                        className={`w-full flex items-start gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg transition-colors text-left text-sm md:text-base ${
                          currentSessionId === session.id 
                            ? 'bg-blue-600 text-white' 
                            : 'hover:bg-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1 pt-1">
                          {session.is_favorite && (
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          )}
                          {session.is_archived && (
                            <Archive className="w-3 h-3 text-gray-400" />
                          )}
                          {!session.is_favorite && !session.is_archived && (
                            <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {editingSession === session.id ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={handleEditSave}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') handleEditSave();
                                if (e.key === 'Escape') handleEditCancel();
                              }}
                              className="w-full text-sm font-medium bg-transparent border-none outline-none text-white"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <p className="truncate text-xs md:text-sm font-medium">
                                {session.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-400">
                                  {formatDate(session.updated_at)}
                                </span>
                                {session.message_count > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {session.message_count} messages
                                  </span>
                                )}
                              </div>
                              {session.last_message && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {session.last_message}
                                </p>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  session.ucf_mode === 'auto' 
                                    ? 'bg-green-600 text-green-100' 
                                    : 'bg-blue-600 text-blue-100'
                                }`}>
                                  {session.ucf_mode}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                      
                      {/* Session Actions */}
                      <AnimatePresence>
                        {hoveredChatId === session.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute right-1 md:right-2 top-1 md:top-2 flex items-center gap-1"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                favoriteSession(session.id, !session.is_favorite);
                              }}
                              className="p-1 hover:bg-gray-700 rounded"
                              title={session.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star className={`w-3 h-3 ${session.is_favorite ? 'fill-current text-yellow-400' : 'text-gray-400'}`} />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStart(session.id, session.title);
                              }}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Edit title"
                            >
                              <Edit3 className="w-3 h-3 text-gray-400" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateSession(session.id);
                              }}
                              className="p-1 hover:bg-gray-700 rounded"
                              title="Duplicate session"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveSession(session.id, !session.is_archived);
                              }}
                              className="p-1 hover:bg-gray-700 rounded"
                              title={session.is_archived ? 'Unarchive' : 'Archive'}
                            >
                              <Archive className="w-3 h-3 text-gray-400" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this conversation?')) {
                                  deleteSession(session.id);
                                }
                              }}
                              className="p-1 hover:bg-red-600 rounded"
                              title="Delete session"
                            >
                              <Trash2 className="w-3 h-3 text-gray-400" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

              {/* History Manager Modal */}
              <AnimatePresence>
                {showHistoryManager && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black bg-opacity-50 z-50"
                      onClick={() => setShowHistoryManager(false)}
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
                              onClick={() => setShowHistoryManager(false)}
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
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Export Chat History
                            </button>
                          </div>

                          {/* Clear History */}
                          <div>
                            <h3 className="text-sm font-medium text-red-900 mb-3">Danger Zone</h3>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <p className="text-sm text-red-700 mb-3">
                                Permanently delete all chat history. This action cannot be undone.
                              </p>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete ALL chat history? This action cannot be undone.')) {
                                    clearAllHistory();
                                    setShowHistoryManager(false);
                                  }
                                }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Profile */}
      <div className="border-t border-gray-700 p-3 md:p-4">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 md:gap-3"
            >
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-6 h-6 md:w-8 md:h-8 rounded-full" />
                ) : (
                  <User className="w-3 h-3 md:w-4 md:h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate hidden md:block">{user?.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {/* Handle settings */}}
                  className="p-1 hover:bg-gray-800 rounded"
                  title="Settings"
                >
                  <Settings className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                <button
                  onClick={logout}
                  className="p-1 hover:bg-red-600 rounded"
                  title="Logout"
                >
                  <LogOut className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-500 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-6 h-6 md:w-8 md:h-8 rounded-full" />
                ) : (
                  <User className="w-3 h-3 md:w-4 md:h-4" />
                )}
              </div>
              <button
                onClick={logout}
                className="p-1 hover:bg-red-600 rounded"
                title="Logout"
              >
                <LogOut className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Sidebar;
