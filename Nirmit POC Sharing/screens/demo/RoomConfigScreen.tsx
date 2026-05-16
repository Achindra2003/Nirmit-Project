import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Maximize, Square, SquareDashed } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function RoomConfigScreen({ onNext, onBack }: Props) {
  const [standardSize, setStandardSize] = useState(false);

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

      <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full">
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-8 text-center">Which room? Enter dimensions.</h1>
        
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm mb-8 space-y-6">
          <div>
            <label className="block font-ui text-sm font-medium text-gray-600 mb-2">Room Type</label>
            <select className="w-full p-4 rounded-lg border border-gray-200 font-ui text-lg bg-gray-50 outline-none focus:border-[#C8A96E]">
              <option>Living Room</option>
              <option>Master Bedroom</option>
              <option>Kids' Room</option>
              <option>Kitchen</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-ui text-sm font-medium text-gray-600 mb-2">Length (ft)</label>
              <input type="number" defaultValue={15} disabled={standardSize} className="w-full p-4 rounded-lg border border-gray-200 font-ui text-lg bg-gray-50 outline-none focus:border-[#C8A96E] disabled:opacity-50" />
            </div>
            <div className="flex-1">
              <label className="block font-ui text-sm font-medium text-gray-600 mb-2">Width (ft)</label>
              <input type="number" defaultValue={12} disabled={standardSize} className="w-full p-4 rounded-lg border border-gray-200 font-ui text-lg bg-gray-50 outline-none focus:border-[#C8A96E] disabled:opacity-50" />
            </div>
          </div>

          <div>
            <label className="block font-ui text-sm font-medium text-gray-600 mb-2">Shape</label>
            <div className="flex gap-4">
              <button className="flex-1 py-3 border-2 border-[#C8A96E] rounded-lg flex items-center justify-center gap-2 bg-[#F4F3EE]"><Square className="w-5 h-5"/> Rectangle</button>
              <button className="flex-1 py-3 border border-gray-200 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50"><SquareDashed className="w-5 h-5"/> L-Shape</button>
              <button className="flex-1 py-3 border border-gray-200 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50"><Maximize className="w-5 h-5"/> Draw it</button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer mt-4">
            <input type="checkbox" checked={standardSize} onChange={(e) => setStandardSize(e.target.checked)} className="w-5 h-5 accent-[#C8A96E]" />
            <span className="font-ui text-gray-700">I don't know — use standard size for Mumbai</span>
          </label>
        </div>

        <button 
          onClick={onNext}
          className="px-12 py-4 bg-[#1C1917] text-white rounded-full font-ui font-medium text-lg hover:bg-black transition-all"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
