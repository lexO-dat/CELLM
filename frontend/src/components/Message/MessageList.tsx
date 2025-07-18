import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Message from './Message';
import LiveThinking from './LiveThinking';
import { Message as MessageType } from '../../types';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
  conversationStage?: string;
  lastUserMessage?: string;
  onApproval?: (approved: boolean) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading = false, 
  conversationStage = 'design',
  lastUserMessage = '',
  onApproval 
}) => {
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
          <Message key={message.id} message={message} onApproval={onApproval} />
        ))}
        
        <LiveThinking 
          isVisible={isLoading} 
          stage={conversationStage}
          userMessage={lastUserMessage}
        />
      </AnimatePresence>
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;