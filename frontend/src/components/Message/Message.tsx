import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, ChevronDown, ChevronUp, Clock, Code, Cpu } from "lucide-react";
import { Message as MessageType } from "../../types";

interface MessageProps {
    message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
    const [showThinking, setShowThinking] = useState(false);
    const { text, isUser, thinking, type, timestamp } = message;

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const getMessageIcon = () => {
        if (isUser) return <User className="w-5 h-5" />;
        
        switch (type) {
            case 'verilog':
                return <Code className="w-5 h-5" />;
            case 'ucf_selection':
                return <Cpu className="w-5 h-5" />;
            case 'system':
                return <Clock className="w-5 h-5" />;
            default:
                return <Bot className="w-5 h-5" />;
        }
    };

    const getMessageTypeColor = () => {
        if (isUser) return 'bg-blue-500';
        
        switch (type) {
            case 'verilog':
                return 'bg-purple-500';
            case 'ucf_selection':
                return 'bg-green-500';
            case 'system':
                return 'bg-yellow-500';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
        >
            <div className={`max-w-xs sm:max-w-md lg:max-w-3xl ${isUser ? 'ml-4 sm:ml-8 lg:ml-12' : 'mr-4 sm:mr-8 lg:mr-12'}`}>
                {/* Message Header */}
                <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white ${getMessageTypeColor()}`}>
                        <div className="w-3 h-3 sm:w-5 sm:h-5">
                            {getMessageIcon()}
                        </div>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500">
                        {isUser ? 'You' : 'CELLM'}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:inline">
                        {formatTime(timestamp)}
                    </span>
                </div>

                {/* Thinking Section */}
                {thinking && !isUser && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-3"
                    >
                        <button
                            onClick={() => setShowThinking(!showThinking)}
                            className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Model Thinking</span>
                            {showThinking ? <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                        </button>
                        
                        <AnimatePresence>
                            {showThinking && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300"
                                >
                                    <div className="text-xs sm:text-sm text-gray-700 font-mono whitespace-pre-wrap">
                                        {thinking}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Main Message */}
                <div
                    className={`p-3 sm:p-4 rounded-2xl shadow-sm ${
                        isUser 
                            ? 'bg-blue-500 text-white rounded-br-md' 
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                    }`}
                >
                    {type === 'verilog' ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm opacity-75">
                                <Code className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Verilog Code</span>
                            </div>
                            <pre className="bg-gray-800 text-green-400 p-2 sm:p-3 rounded-lg overflow-x-auto text-xs sm:text-sm">
                                <code>{text}</code>
                            </pre>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap text-sm sm:text-base">
                            {text}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default Message;