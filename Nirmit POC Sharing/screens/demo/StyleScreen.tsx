import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function StyleScreen({ onNext, onBack }: Props) {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const styles = [
    { name: "Warm Minimal", bg: "bg-orange-100" },
    { name: "Indian Contemporary", bg: "bg-stone-200" },
    { name: "Traditional Teak", bg: "bg-amber-800" },
    { name: "Modern Compact", bg: "bg-slate-200" },
    { name: "Colorful Bohemian", bg: "bg-rose-200" },
    { name: "Sleek Industrial", bg: "bg-zinc-800" }
  ];

  const colors = [
    { name: "Earthy", hex: "#d4a373" },
    { name: "Neutral", hex: "#e5e5e5" },
    { name: "Monochrome", hex: "#4a4e69" },
    { name: "Pastel", hex: "#b5e2fa" },
    { name: "Jewel", hex: "#0f4c5c" },
    { name: "Vibrant", hex: "#e07a5f" }
  ];

  const toggleStyle = (name: string) => {
    if (selectedStyles.includes(name)) {
      setSelectedStyles(selectedStyles.filter(s => s !== name));
    } else if (selectedStyles.length < 4) {
      setSelectedStyles([...selectedStyles, name]);
    }
  };

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

      <div className="flex-1 flex flex-col items-center max-w-4xl mx-auto w-full pb-20">
        <h1 className="font-display text-4xl md:text-5xl font-semibold mb-8 text-center">What's your style?</h1>
        
        <p className="font-ui text-gray-500 mb-4 self-start">Select up to 4</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mb-10">
          {styles.map((style) => (
            <div 
              key={style.name} 
              onClick={() => toggleStyle(style.name)}
              className={`relative h-32 rounded-xl cursor-pointer overflow-hidden group ${style.bg} ${selectedStyles.includes(style.name) ? 'ring-4 ring-[#C8A96E] ring-offset-2' : ''}`}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              <div className="absolute bottom-3 left-3 text-white font-ui font-medium drop-shadow-md">
                {style.name}
              </div>
              {selectedStyles.includes(style.name) && (
                <div className="absolute top-3 right-3 bg-[#C8A96E] rounded-full p-1 text-white">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="font-ui text-gray-500 mb-4 self-start">Choose a color palette</p>
        <div className="flex flex-wrap gap-4 w-full mb-10">
          {colors.map(color => (
            <div key={color.name} className="flex flex-col items-center gap-2">
              <div 
                onClick={() => setSelectedColor(color.name)}
                className={`w-12 h-12 rounded-full cursor-pointer transition-transform hover:scale-110 ${selectedColor === color.name ? 'ring-4 ring-offset-2 ring-gray-400' : ''}`}
                style={{ backgroundColor: color.hex }}
              />
              <span className="font-ui text-xs text-gray-600">{color.name}</span>
            </div>
          ))}
        </div>

        <textarea 
          placeholder="Tell us about your dream room... (optional)"
          className="w-full p-4 rounded-xl border border-gray-200 font-ui bg-white outline-none focus:border-[#C8A96E] mb-8 h-32 resize-none"
        ></textarea>

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
