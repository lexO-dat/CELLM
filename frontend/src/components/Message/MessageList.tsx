import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Message from './Message';
import { Message as MessageType } from '../../types';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
}

const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex justify-start mb-4"
  >
    <div className="max-w-xs sm:max-w-md lg:max-w-3xl mr-4 sm:mr-8 lg:mr-12">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-500 flex items-center justify-center">
          <svg className="w-3 h-3 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-xs sm:text-sm text-gray-500">CELLM</span>
        <span className="text-xs text-gray-400">typing...</span>
      </div>
      
      <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </motion.div>
);

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        
        {isLoading && <TypingIndicator />}
      </AnimatePresence>
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;