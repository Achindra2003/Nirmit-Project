import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function OptionsGalleryScreen({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const options = [
    { id: 1, title: "Open Flow Layout", desc: "Maximizes floor space, perfect for entertaining.", cost: "₹1.8L – ₹2.3L", tags: ["Vastu Compliant"], isRecommended: true },
    { id: 2, title: "Storage Maximizer", desc: "Hidden storage everywhere. Minimal clutter.", cost: "₹2.1L – ₹2.6L", tags: ["Storage Heavy"], isRecommended: false },
    { id: 3, title: "Vastu-Perfect Arrangement", desc: "100% aligned with strict Vastu principles.", cost: "₹1.9L – ₹2.4L", tags: ["Vastu Compliant"], isRecommended: false },
    { id: 4, title: "Family Hub", desc: "Kid-friendly furniture with soft edges.", cost: "₹1.7L – ₹2.1L", tags: ["Family-Friendly"], isRecommended: false },
    { id: 5, title: "Minimal Calm", desc: "Only the essentials. Zen-like atmosphere.", cost: "₹1.4L – ₹1.8L", tags: ["Minimalist"], isRecommended: false }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#1C1917] text-white p-8 flex flex-col"
    >
      <div className="flex justify-between items-center mb-12">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">← Back</button>
        <button onClick={onNext} className="text-[#C8A96E] hover:text-white transition-colors underline underline-offset-4">Start from scratch</button>
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-semibold mb-8 text-center">Here are 5 designs for your 2BHK living room, Mumbai</h1>

      <div className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory hide-scrollbar max-w-7xl mx-auto w-full px-4">
        {options.map((opt) => (
          <div 
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={`min-w-[320px] md:min-w-[400px] flex-shrink-0 bg-gray-800 rounded-2xl overflow-hidden cursor-pointer snap-center transition-all border-2 ${selected === opt.id ? 'border-[#C8A96E] transform scale-[1.02]' : 'border-transparent hover:border-gray-600'}`}
          >
            <div className="h-48 bg-gradient-to-br from-gray-700 to-gray-900 relative">
              {opt.isRecommended && (
                <div className="absolute top-4 left-4 bg-[#C8A96E] text-black text-xs font-bold px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}
              {/* Placeholder room outline */}
              <div className="absolute inset-8 border border-gray-600/50 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 font-ui text-sm">3D Layout Preview</span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-ui text-xl font-bold mb-2">{opt.title}</h3>
              <p className="font-ui text-gray-400 text-sm mb-4 h-10">{opt.desc}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {opt.tags.map(tag => (
                  <span key={tag} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="font-ui text-lg font-medium text-[#C8A96E]">{opt.cost}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex justify-center pt-8">
        <button 
          onClick={onNext}
          disabled={!selected}
          className={`px-12 py-4 rounded-full font-ui font-medium text-lg transition-all ${selected ? 'bg-[#C8A96E] text-black hover:bg-[#b0935d]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
        >
          Choose This Design
        </button>
      </div>

    </motion.div>
  );
}
