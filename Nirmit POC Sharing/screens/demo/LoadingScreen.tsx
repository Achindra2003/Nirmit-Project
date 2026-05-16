import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Package, Grid3X3, Compass, Sun } from 'lucide-react';

interface Props {
  onNext: () => void;
}

export function LoadingScreen({ onNext }: Props) {
  const [step, setStep] = useState(0);

  const steps = [
    { text: "Measuring your 12×15 living room...", icon: Loader2 },
    { text: "Selecting furniture from 600+ Indian designs...", icon: Package },
    { text: "Arranging 18 pieces for your family...", icon: Grid3X3 },
    { text: "Applying Vastu — mandir facing east...", icon: Compass },
    { text: "Finding the best natural light in Mumbai...", icon: Sun },
  ];

  useEffect(() => {
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      setStep(currentStep);
      if (currentStep === steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          onNext();
        }, 2000);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#1C1917] text-white flex flex-col items-center justify-center p-8"
    >
      <div className="max-w-md w-full space-y-6">
        <AnimatePresence>
          {steps.map((s, idx) => {
            if (idx > step) return null;
            const Icon = s.icon;
            const isLastVisible = idx === step || (step >= steps.length && idx === steps.length - 1);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-4 ${isLastVisible ? 'text-[#C8A96E]' : 'text-gray-400'}`}
              >
                <div className={`p-2 rounded-full flex-shrink-0 ${isLastVisible ? 'bg-[#C8A96E]/20' : 'bg-gray-800'}`}>
                  <Icon className={`w-6 h-6 ${isLastVisible && idx === 0 ? 'animate-spin' : ''}`} />
                </div>
                <span className="font-ui text-lg">{s.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
