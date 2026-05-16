import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function BudgetScreen({ onNext, onBack }: Props) {
  const [budget, setBudget] = useState('₹2-5 Lakhs');

  const budgets = ['₹1-2 Lakhs', '₹2-5 Lakhs', '₹5-10 Lakhs', 'Just Exploring'];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen bg-[#F4F3EE] text-[#1C1917] p-8 flex flex-col"
    >
      <button onClick={onBack} className="self-start p-2 mb-4 hover:bg-gray-200 rounded-full transition-colors">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col items-center max-w-2xl mx-auto w-full pb-20">
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-8 text-center">Budget & Preferences</h1>
        
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm mb-8 space-y-8">
          
          <div>
            <h3 className="font-ui font-medium text-lg mb-4">Budget Range (per room)</h3>
            <div className="grid grid-cols-2 gap-4">
              {budgets.map(b => (
                <div 
                  key={b}
                  onClick={() => setBudget(b)}
                  className={`p-4 border rounded-xl cursor-pointer text-center transition-colors ${budget === b ? 'border-[#C8A96E] bg-orange-50 text-black font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  {b}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-ui font-medium text-sm mb-2 text-gray-600">Ownership</h3>
              <select className="w-full p-3 rounded-lg border border-gray-200 font-ui bg-gray-50 outline-none focus:border-[#C8A96E]">
                <option>Owned</option>
                <option>Rented</option>
              </select>
            </div>
            <div>
              <h3 className="font-ui font-medium text-sm mb-2 text-gray-600">City</h3>
              <select className="w-full p-3 rounded-lg border border-gray-200 font-ui bg-gray-50 outline-none focus:border-[#C8A96E]">
                <option>Mumbai</option>
                <option>Bengaluru</option>
                <option>Delhi NCR</option>
                <option>Pune</option>
              </select>
            </div>
          </div>

          <div>
            <h3 className="font-ui font-medium text-sm mb-2 text-gray-600">Vastu Preference</h3>
            <div className="flex gap-4">
              {['Strict', 'Loose', 'Ignore'].map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vastu" defaultChecked={v === 'Loose'} className="w-4 h-4 accent-[#C8A96E]" />
                  <span className="font-ui text-sm">{v}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        <button 
          onClick={onNext}
          className="px-12 py-4 bg-[#C8A96E] text-white rounded-full font-ui font-medium text-lg hover:bg-[#b0935d] transition-all shadow-lg"
        >
          Generate My Designs
        </button>
      </div>
    </motion.div>
  );
}
