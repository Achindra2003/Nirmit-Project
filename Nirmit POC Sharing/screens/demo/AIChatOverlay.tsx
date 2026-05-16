import React from 'react';
import { motion } from 'framer-motion';
import { X, Send, Sparkles } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function AIChatOverlay({ onClose }: Props) {
  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 z-30"
      />
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="absolute bottom-20 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden border border-gray-200"
      >
        <div className="p-4 border-b border-gray-200 bg-[#1C1917] text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C8A96E]" />
            <span className="font-ui font-medium">BHK-OS AI Designer</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-ui text-sm space-y-4 bg-gray-50">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C8A96E] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
              Hi! I'm your AI designer. How can we tweak this layout?
            </div>
          </div>

          <div className="flex gap-3 flex-row-reverse">
            <div className="bg-[#1C1917] text-white p-3 rounded-2xl rounded-tr-none shadow-sm">
              Can we replace the 3-seater sofa with an L-shaped one? And make it pet-friendly.
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C8A96E] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
              <p className="mb-2">Done! I've swapped it for the 'Kian L-Shape Sectional' in pet-friendly microfiber (Grey).</p>
              <p className="text-xs text-gray-500 bg-gray-100 p-2 rounded">Cost impact: +₹14,000</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
            <input 
              type="text" 
              placeholder="Ask AI to change materials, swap items..." 
              className="flex-1 bg-transparent font-ui text-sm outline-none"
              disabled
            />
            <button className="w-8 h-8 rounded-full bg-[#1C1917] flex items-center justify-center text-white flex-shrink-0 cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
