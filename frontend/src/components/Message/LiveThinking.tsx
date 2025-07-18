import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

interface LiveThinkingProps {
  isVisible: boolean;
  stage?: string;
  userMessage?: string;
}

const LiveThinking: React.FC<LiveThinkingProps> = ({ 
  isVisible
}) => {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    if (!isVisible) return;

    const dotInterval = setInterval(() => {
      setDots((prev) => prev.length >= 3 ? '' : prev + '.');
    }, 400);

    return () => clearInterval(dotInterval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex justify-start mb-4"
    >
      <div className="max-w-xs sm:max-w-md lg:max-w-3xl mr-4 sm:mr-8 lg:mr-12">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
            </motion.div>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 font-medium">CELLM</span>
          <span className="text-xs text-blue-500 font-medium">thinking{dots}</span>
        </div>
        
        <div className="bg-white border border-gray-200 p-3 sm:p-4 rounded-2xl rounded-bl-md shadow-sm border-l-4 border-l-blue-500">
          <div className="flex space-x-1 justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveThinking;
