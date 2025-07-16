import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Copy, 
  MessageSquare,
  Plus
} from 'lucide-react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { useChat } from '../../contexts/ChatContext';
import { ChatHistoryFilter } from '../../types/chatHistory';

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all'>('all');
  
  const { 
    filteredSessions,
    setFilter,
    deleteSession,
    duplicateSession,
    updateSessionTitle,
    stats
  } = useChatHistory();
  
  const { 
    loadSession, 
    currentSessionId, 
    isLoadingSession,
    createNewSession: createNewChatSession 
  } = useChat();

  // Update filter when search or filter changes
  React.useEffect(() => {
    const filter: ChatHistoryFilter = {
      searchQuery: searchQuery || undefined,
      isArchived: false, // Only show non-archived sessions
      limit: 50
    };
    setFilter(filter);
  }, [searchQuery, selectedFilter, setFilter]);

  const handleSessionClick = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    
    try {
      await loadSession(sessionId);
      onClose();
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleNewSession = () => {
    createNewChatSession();
    onClose();
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

  const getFilterCount = () => {
    return stats.totalSessions - stats.archivedCount;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200 z-50 flex flex-col shadow-lg"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
                <button
                  onClick={handleNewSession}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="New Chat"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              {/* Filter Tabs */}
              <div className="flex space-x-1">
                {[
                  { key: 'all', icon: MessageSquare }
                ].map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedFilter(key as any)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      selectedFilter === key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{getFilterCount()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingSession && (
                <div className="p-4 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 mt-2">Loading session...</p>
                </div>
              )}
              
              {filteredSessions.length === 0 && !isLoadingSession ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </p>
                  <p className="text-xs mt-1 text-gray-400">
                    {searchQuery ? 'Try a different search term' : 'Start a new conversation to begin'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                        session.id === currentSessionId
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSessionClick(session.id)}
                    >
                      <div className="flex items-start justify-between">
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
                              className="w-full text-sm font-medium bg-transparent border-none outline-none"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {session.title}
                            </h3>
                          )}
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatDate(session.updated_at)}
                            </span>
                            {session.message_count > 0 && (
                              <span className="text-xs text-gray-400">
                                {session.message_count} messages
                              </span>
                            )}
                          </div>
                          
                          {session.last_message && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {session.last_message}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-1 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              session.ucf_mode === 'auto' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {session.ucf_mode}
                            </span>
                          </div>
                        </div>
                        
                        {/* Session Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStart(session.id, session.title);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                              title="Edit title"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateSession(session.id);
                              }}
                              className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                              title="Duplicate session"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Are you sure you want to delete this conversation?')) {
                                  deleteSession(session.id);
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Total Conversations:</span>
                  <span>{stats.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Messages:</span>
                  <span>{stats.totalMessages}</span>
                </div>
                {stats.mostUsedUcf && (
                  <div className="flex justify-between">
                    <span>Most Used UCF:</span>
                    <span className="truncate ml-2">{stats.mostUsedUcf}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistorySidebar;
