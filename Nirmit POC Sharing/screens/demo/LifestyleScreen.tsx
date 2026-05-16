import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function LifestyleScreen({ onNext, onBack }: Props) {
  const [storage, setStorage] = useState('Moderate');

  const occupants = ['Couple', 'Kids', 'Elderly Parents', 'Single Professional', 'Pets'];
  const activities = ['Watching TV', 'Working from Home', 'Entertaining', 'Prayer/Meditation', 'Kids\' Study', 'Exercise'];
  const mustHaves = ['Mandir/Pooja Space', 'WFH Desk', 'Bookshelf', 'Dresser', 'Shoe Rack', 'Toy Storage', 'Pet Corner'];

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

      <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto w-full pb-20">
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-8 text-center">Who lives here? What do you need?</h1>
        
        <div className="w-full bg-white p-8 rounded-2xl shadow-sm mb-8 space-y-8">
          
          <div>
            <h3 className="font-ui font-medium text-lg mb-4">Occupants</h3>
            <div className="flex flex-wrap gap-3">
              {occupants.map(item => (
                <label key={item} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full cursor-pointer hover:bg-gray-50 has-[:checked]:border-[#C8A96E] has-[:checked]:bg-orange-50">
                  <input type="checkbox" className="hidden" />
                  <span className="font-ui text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-ui font-medium text-lg mb-4">Primary Activities</h3>
            <div className="flex flex-wrap gap-3">
              {activities.map(item => (
                <label key={item} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full cursor-pointer hover:bg-gray-50 has-[:checked]:border-[#C8A96E] has-[:checked]:bg-orange-50">
                  <input type="checkbox" className="hidden" />
                  <span className="font-ui text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-ui font-medium text-lg mb-4">Storage Needs</h3>
            <div className="flex gap-4">
              {['Light', 'Moderate', 'Heavy'].map(level => (
                <button 
                  key={level}
                  onClick={() => setStorage(level)}
                  className={`flex-1 py-3 rounded-lg border transition-colors ${storage === level ? 'border-[#C8A96E] bg-orange-50 text-[#C8A96E] font-medium' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-ui font-medium text-lg mb-4">Must-Haves</h3>
            <div className="flex flex-wrap gap-3">
              {mustHaves.map(item => (
                <label key={item} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full cursor-pointer hover:bg-gray-50 has-[:checked]:border-[#C8A96E] has-[:checked]:bg-orange-50">
                  <input type="checkbox" className="hidden" />
                  <span className="font-ui text-sm">{item}</span>
                </label>
              ))}
            </div>
          </div>

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
