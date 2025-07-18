import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, ChevronDown, ChevronUp, Clock, Code, Cpu, MessageSquare, CheckCircle, XCircle, Lightbulb, Copy, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message as MessageType } from "../../types";

interface MessageProps {
    message: MessageType;
    onApproval?: (approved: boolean) => void;
}

const Message: React.FC<MessageProps> = ({ message, onApproval }) => {
    const [showThinking, setShowThinking] = useState(false);
    const [copied, setCopied] = useState(false);
    const { text, isUser, thinking, type, timestamp, recommendations } = message;

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
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
            case 'conversation':
            case 'approval_request':
                return <MessageSquare className="w-5 h-5" />;
            case 'approval_buttons':
                return <CheckCircle className="w-5 h-5" />;
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
            case 'conversation':
            case 'approval_request':
                return 'bg-indigo-500';
            case 'approval_buttons':
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    };

    // Custom components for ReactMarkdown
    const components = {
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg"
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={`${className} bg-gray-200 px-1 py-0.5 rounded text-sm`} {...props}>
                    {children}
                </code>
            );
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
                    
                    {/* Copy Button */}
                    <button
                        onClick={copyToClipboard}
                        className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy message"
                    >
                        {copied ? (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                        ) : (
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                    </button>
                </div>

                {/* Model Thinking Section */}
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
                                    className="mt-2 p-2 sm:p-3 bg-gray-50 rounded-lg border-l-4 border-purple-300"
                                >
                                    <div className="text-xs sm:text-sm text-gray-700 font-mono whitespace-pre-wrap">
                                        {thinking}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Recommendations Section */}
                {recommendations && recommendations.length > 0 && !isUser && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-3"
                    >
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-2">
                            <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Design Recommendations</span>
                        </div>
                        
                        <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-300">
                            <ul className="text-xs sm:text-sm text-gray-700 space-y-1">
                                {recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <span className="text-yellow-600 mt-0.5">•</span>
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
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
                    {type === 'approval_buttons' && !isUser && onApproval ? (
                        <div className="space-y-3">
                            <div className="text-sm sm:text-base">{text}</div>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => onApproval(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Approve & Process</span>
                                </button>
                                <button
                                    onClick={() => onApproval(false)}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span>Refine Design</span>
                                </button>
                            </div>
                        </div>
                    ) : type === 'verilog' && !isUser ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm opacity-75">
                                <Code className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Generated Verilog Code</span>
                            </div>
                            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                                <pre className="text-green-400 text-xs sm:text-sm font-mono whitespace-pre-wrap">
                                    {text}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown components={components}>
                                {text}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default Message;