import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function BHKSelectionScreen({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = ['1 BHK', '2 BHK', '3 BHK'];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen bg-[#F4F3EE] text-[#1C1917] p-8 flex flex-col"
    >
      <button onClick={onBack} className="self-start p-2 mb-8 hover:bg-gray-200 rounded-full transition-colors">
        <ArrowLeft className="w-6 h-6" />
      </button>
      
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-12">Let's design your home.</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
          {options.map((opt) => (
            <div 
              key={opt}
              onClick={() => setSelected(opt)}
              className={`p-8 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-4 bg-white shadow-sm hover:shadow-md ${selected === opt ? 'border-[#C8A96E]' : 'border-transparent'}`}
            >
              <Home className={`w-12 h-12 ${selected === opt ? 'text-[#C8A96E]' : 'text-gray-400'}`} />
              <span className="font-ui text-xl font-medium">{opt}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={onNext}
          disabled={!selected}
          className={`px-12 py-4 rounded-full font-ui font-medium text-lg transition-all ${selected ? 'bg-[#1C1917] text-white hover:bg-black' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
