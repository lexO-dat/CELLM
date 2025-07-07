import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Settings, Zap, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { UCFOption } from '../../types';

interface MessageInputProps {
  inputValue: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  isLoading?: boolean;
  ucfMode: 'auto' | 'manual';
  onUcfModeChange: (mode: 'auto' | 'manual') => void;
  selectedUcf?: UCFOption;
  onUcfSelect: (ucf: UCFOption) => void;
  ucfOptions: UCFOption[];
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  inputValue, 
  onChange, 
  onSend, 
  isLoading = false,
  ucfMode,
  onUcfModeChange,
  selectedUcf,
  onUcfSelect,
  ucfOptions
}) => {
  const [showUcfSettings, setShowUcfSettings] = useState(false);
  const [showUcfOptions, setShowUcfOptions] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* UCF Configuration Panel */}
      <AnimatePresence>
        {showUcfSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-200 p-3 md:p-4 bg-gray-50"
          >
            <div className="max-w-4xl mx-auto">
              <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                <Target className="w-4 md:w-5 h-4 md:h-5" />
                UCF Selection Configuration
              </h3>
              
              {/* Mode Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selection Mode
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => onUcfModeChange('auto')}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border transition-colors text-sm ${
                      ucfMode === 'auto' 
                        ? 'bg-blue-50 border-blue-200 text-blue-800' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Automatic
                  </button>
                  <button
                    onClick={() => onUcfModeChange('manual')}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border transition-colors text-sm ${
                      ucfMode === 'manual' 
                        ? 'bg-blue-50 border-blue-200 text-blue-800' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Manual
                  </button>
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-2">
                  {ucfMode === 'auto' 
                    ? 'CELLM will automatically select the best UCF based on your design requirements.'
                    : 'You can manually select which UCF file to use for your genetic circuit design.'
                  }
                </p>
              </div>

              {/* Manual UCF Selection */}
              {ucfMode === 'manual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select UCF File
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowUcfOptions(!showUcfOptions)}
                      className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getComplexityColor(selectedUcf?.complexity)}`}>
                          {selectedUcf?.complexity || 'N/A'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-left text-sm md:text-base truncate">{selectedUcf?.name || 'Select UCF'}</p>
                          <p className="text-xs md:text-sm text-gray-500 text-left truncate">{selectedUcf?.description || 'No UCF selected'}</p>
                        </div>
                      </div>
                      {showUcfOptions ? <ChevronUp className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0" /> : <ChevronDown className="w-4 md:w-5 h-4 md:h-5 flex-shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {showUcfOptions && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 md:max-h-60 overflow-y-auto"
                        >
                          {ucfOptions.map((ucf) => (
                            <button
                              key={ucf.id}
                              onClick={() => {
                                onUcfSelect(ucf);
                                setShowUcfOptions(false);
                              }}
                              className="w-full px-3 md:px-4 py-2 md:py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex items-center gap-2 md:gap-3">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${getComplexityColor(ucf.complexity)}`}>
                                  {ucf.complexity}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm md:text-base truncate">{ucf.name}</p>
                                  <p className="text-xs md:text-sm text-gray-500 truncate">{ucf.description}</p>
                                  <p className="text-xs text-gray-400">
                                    {ucf.organism} • {ucf.gates} gates
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-end gap-2 md:gap-3">
            <div className="flex-1 w-full">
              <textarea
                value={inputValue}
                onChange={(e) => onChange(e as any)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your genetic circuit design..."
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none text-sm md:text-base"
                rows={Math.min(Math.max(inputValue.split('\n').length, 1), 4)}
                maxLength={1000}
                disabled={isLoading}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {inputValue.length}/1000
                </span>
                <div className="flex items-center gap-2">
                  {ucfMode === 'manual' && selectedUcf && (
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      Using: {selectedUcf.name}
                    </span>
                  )}
                  {ucfMode === 'auto' && (
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      Auto UCF selection
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowUcfSettings(!showUcfSettings)}
                className={`flex-1 sm:flex-none p-2 md:p-3 rounded-lg border transition-colors ${
                  showUcfSettings 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
                title="UCF Settings"
              >
                <Settings className="w-4 md:w-5 h-4 md:h-5 mx-auto" />
                <span className="sr-only">UCF Settings</span>
              </button>
              
              <button
                onClick={onSend}
                disabled={isLoading || !inputValue.trim()}
                className="flex-1 sm:flex-none p-2 md:p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center justify-center"
                title="Send Message"
              >
                {isLoading ? (
                  <div className="w-4 md:w-5 h-4 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 md:w-5 h-4 md:h-5" />
                )}
                <span className="sr-only">Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
