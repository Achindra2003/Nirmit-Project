import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  onRestart: () => void;
}

export function QuotationScreen({ onRestart }: Props) {
  const items = [
    { name: 'Kian L-Shape Sectional (Microfiber)', qty: 1, price: 42000 },
    { name: 'Solid Teak Center Table', qty: 1, price: 18500 },
    { name: 'Wall-Mounted TV Unit (White Laminate)', qty: 1, price: 24000 },
    { name: 'Custom Corner Mandir', qty: 1, price: 32000 },
    { name: 'Hand-tufted Wool Rug', qty: 1, price: 12000 },
    { name: 'Installation & Labor (Mumbai Rates)', qty: 1, price: 15000 },
  ];

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const contingency = total * 0.1;
  const finalTotal = total + contingency;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#F4F3EE] text-[#1C1917] p-8 md:p-12"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12">
        
        {/* Document Preview */}
        <div className="flex-1">
          <h1 className="font-display text-4xl font-semibold mb-8">Your contractor-ready quotation</h1>
          
          <div className="bg-white p-8 md:p-10 rounded-xl shadow-lg border border-gray-200">
            <div className="border-b-2 border-gray-800 pb-6 mb-6 flex justify-between items-end">
              <div>
                <h2 className="font-display text-2xl font-bold">2BHK Living Room</h2>
                <p className="font-ui text-gray-500">Mumbai • Vastu-Compliant • Pet-Friendly</p>
              </div>
              <div className="text-right">
                <p className="font-ui text-sm font-bold text-gray-500 uppercase tracking-widest">BHK-OS</p>
                <p className="font-ui text-xs text-gray-400">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <table className="w-full font-ui text-sm text-left mb-8">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-3 font-medium">Item Description</th>
                  <th className="py-3 font-medium text-right">Qty</th>
                  <th className="py-3 font-medium text-right">Price (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3">{item.name}</td>
                    <td className="py-3 text-right">{item.qty}</td>
                    <td className="py-3 text-right">{item.price.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end font-ui text-sm">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>10% Contingency</span>
                  <span>₹{contingency.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-gray-800 pt-2 mt-2">
                  <span>Total Est.</span>
                  <span>₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Actions & Value Prop */}
        <div className="w-full md:w-80 flex flex-col gap-8">
          <div className="space-y-4">
            <button className="w-full py-4 bg-[#1C1917] text-white rounded-xl font-ui font-medium flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-md">
              <Download className="w-5 h-5" /> Download PDF
            </button>
            <button className="w-full py-4 bg-white border border-gray-300 text-gray-800 rounded-xl font-ui font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
              <Share2 className="w-5 h-5" /> Share Link
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-ui font-bold mb-4">Why BHK-OS?</h3>
            <ul className="space-y-3 font-ui text-sm text-gray-600">
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> Real product names & SKUs</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> Localized city labor rates</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> Hand it to any local contractor</li>
              <li className="flex gap-2"><CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> Zero agency lock-in</li>
            </ul>
          </div>

          <div className="bg-orange-50 p-6 rounded-xl border border-[#C8A96E]/30 text-center">
            <p className="font-ui font-medium text-[#1C1917] mb-2">Ready to build another room?</p>
            <button onClick={onRestart} className="text-[#C8A96E] font-bold font-ui hover:underline flex items-center justify-center gap-1 mx-auto">
              Start New Design <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
