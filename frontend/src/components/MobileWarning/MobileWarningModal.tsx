import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, X, AlertTriangle } from 'lucide-react';

interface MobileWarningModalProps {
  isVisible: boolean;
  onDismiss: () => void;
}

const MobileWarningModal: React.FC<MobileWarningModalProps> = ({ isVisible, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 mt-20">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Mobile Device Detected</h2>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-8 py-4">
              <div className="text-center">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Mobile</p>
                <p className="text-xs text-red-500">Not Optimized</p>
              </div>
              <div className="text-center">
                <Monitor className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-700">Desktop</p>
                <p className="text-xs text-green-600">Recommended</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-medium text-orange-900 mb-2">⚠️ Not Optimized for Mobile</h3>
              <p className="text-sm text-orange-800 mb-3">
                CELLM is designed for desktop use with complex interfaces and file handling. 
                For the best experience, please access this application from a desktop or laptop computer.
              </p>
              <ul className="text-xs text-orange-700 space-y-1">
                <li>• Complex Verilog code editing</li>
                <li>• Multiple file downloads</li>
                <li>• Advanced circuit design tools</li>
                <li>• Large screen required for optimal viewing</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onDismiss}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              Continue Anyway
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-3">
            This warning can be dismissed, but functionality may be limited on mobile devices.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileWarningModal;
