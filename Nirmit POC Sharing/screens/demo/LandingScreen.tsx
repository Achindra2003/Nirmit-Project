import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface Props {
  onNext: () => void;
}

export function LandingScreen({ onNext }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#1C1917] text-white flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* Subtle animated diagonal lines */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ffffff 10px, #ffffff 11px)' }}></div>
      
      <div className="z-10 text-center px-4 max-w-4xl">
        <h1 className="font-display text-5xl md:text-7xl font-semibold mb-6">
          Your home, before you build it.
        </h1>
        <p className="font-ui text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Design your BHK in 3D. Get a contractor-ready quotation. No minimum budget. No Livspace lock-in.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={onNext}
            className="px-8 py-4 bg-[#F4F3EE] text-[#1C1917] rounded-full font-ui font-medium text-lg hover:bg-white transition-colors"
          >
            Try Free — No Signup
          </button>
          <button 
            onClick={onNext}
            className="px-8 py-4 bg-transparent border border-gray-500 text-white rounded-full font-ui font-medium text-lg hover:bg-gray-800 transition-colors"
          >
            See How It Works
          </button>
        </div>
      </div>
      <motion.div 
        className="absolute bottom-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ArrowDown className="w-8 h-8 text-gray-400" />
      </motion.div>
    </motion.div>
  );
}
