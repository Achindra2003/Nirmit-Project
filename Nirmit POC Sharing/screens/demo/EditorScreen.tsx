import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare, Plus, Check } from 'lucide-react';
import { AIChatOverlay } from './AIChatOverlay';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function EditorScreen({ onNext, onBack }: Props) {
  const [chatOpen, setChatOpen] = useState(false);

  const catalog = [
    { name: '3-Seater Sofa', icon: '🛋️' },
    { name: 'Center Table', icon: '🪑' },
    { name: 'TV Unit', icon: '📺' },
    { name: 'Mandir', icon: '🕉️' },
    { name: 'Rug', icon: '🧶' },
  ];

  const materials = [
    { name: 'Teak', color: '#8b5a2b' },
    { name: 'Walnut', color: '#5c4033' },
    { name: 'White Laminate', color: '#f5f5f5' },
    { name: 'Grey', color: '#808080' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-[#F4F3EE] flex flex-col overflow-hidden text-[#1C1917]"
    >
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-semibold text-xl">BHK-OS Editor</span>
        </div>
        <button 
          onClick={onNext}
          className="px-6 py-2 bg-[#1C1917] text-white rounded-full font-ui text-sm font-medium hover:bg-black transition-colors"
        >
          Continue to Quotation
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Catalog */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-ui font-semibold text-sm text-gray-500 uppercase tracking-wider">Furniture Catalog</h2>
          </div>
          <div className="flex p-2 gap-2 border-b border-gray-200 text-sm font-ui">
            <button className="flex-1 bg-gray-100 py-1 rounded font-medium">Seating</button>
            <button className="flex-1 text-gray-500 hover:bg-gray-50 py-1 rounded">Storage</button>
            <button className="flex-1 text-gray-500 hover:bg-gray-50 py-1 rounded">Decor</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {catalog.map(item => (
              <div key={item.name} className="p-3 border border-gray-200 rounded-lg flex items-center gap-3 cursor-pointer hover:border-[#C8A96E] hover:bg-orange-50 transition-colors">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xl">{item.icon}</div>
                <span className="font-ui text-sm font-medium">{item.name}</span>
                <Plus className="w-4 h-4 ml-auto text-gray-400" />
              </div>
            ))}
          </div>
        </aside>

        {/* Center - 3D Viewer Placeholder */}
        <main className="flex-1 bg-gray-100 relative flex items-center justify-center overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          <motion.div 
            animate={{ rotateY: [0, 5, 0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
            className="w-[600px] h-[400px] bg-gray-800 rounded-xl shadow-2xl relative border border-gray-700 flex items-center justify-center"
            style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
          >
             <span className="absolute top-4 left-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full font-ui backdrop-blur-sm">3D Preview Active</span>
             
             {/* Fake Room Elements */}
             <div className="absolute bottom-10 left-10 w-40 h-20 bg-blue-900/50 border border-blue-400 rounded flex items-center justify-center text-blue-200 text-xs font-ui">Sofa</div>
             <div className="absolute bottom-20 left-60 w-30 h-16 bg-amber-900/50 border border-amber-400 rounded flex items-center justify-center text-amber-200 text-xs font-ui">Center Table</div>
             <div className="absolute top-10 right-10 w-48 h-12 bg-gray-900/50 border border-gray-400 rounded flex items-center justify-center text-gray-200 text-xs font-ui">TV Unit</div>
          </motion.div>
        </main>

        {/* Right Sidebar - Properties */}
        <aside className="w-72 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-ui font-semibold text-sm text-gray-500 uppercase tracking-wider">Properties</h2>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <h3 className="font-display text-2xl font-semibold mb-1">3-Seater Sofa</h3>
              <p className="font-ui text-sm text-gray-500">Dimensions: 84" x 36" x 34"</p>
            </div>
            
            <div className="mb-6">
              <h4 className="font-ui text-sm font-medium mb-3">Material & Finish</h4>
              <div className="flex gap-3">
                {materials.map((m, i) => (
                  <div key={m.name} className="flex flex-col items-center gap-1">
                    <button 
                      className={`w-8 h-8 rounded-full border-2 ${i === 0 ? 'border-black' : 'border-transparent ring-1 ring-gray-200'}`}
                      style={{ backgroundColor: m.color }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full py-2 bg-gray-100 text-gray-800 rounded font-ui text-sm font-medium hover:bg-gray-200 transition-colors">
              Replace Item
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom Bar */}
      <footer className="h-16 bg-white border-t border-gray-200 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <span className="font-ui text-sm font-medium text-gray-600">Cost Confidence</span>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="w-[85%] h-full bg-green-500"></div>
          </div>
          <span className="font-ui text-xs text-green-600 font-bold">85%</span>
        </div>
        <div className="font-ui font-semibold text-lg">
          ₹1,82,000 <span className="text-sm font-normal text-gray-500">of ₹3,00,000 budget</span>
        </div>
      </footer>

      {/* Floating Chat Button */}
      <button 
        onClick={() => setChatOpen(true)}
        className="absolute bottom-20 right-6 w-14 h-14 bg-[#C8A96E] rounded-full shadow-lg flex items-center justify-center text-white hover:bg-[#b0935d] transition-transform hover:scale-105 z-20"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* AI Chat Overlay */}
      <AnimatePresence>
        {chatOpen && <AIChatOverlay onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
