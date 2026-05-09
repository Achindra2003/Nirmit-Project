import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

interface LandingScreenProps {
  onStart: () => void;
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const duration = 1800;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(ease * target);
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);
  return <>{prefix}{Math.round(value).toLocaleString('en-IN')}{suffix}</>;
}

export default function LandingScreen({ onStart }: LandingScreenProps) {
  return (
    <div className="relative min-h-screen bg-[var(--n-50)] text-[var(--brand)] overflow-x-hidden overflow-y-auto flex flex-col">
      {/* Background decorative elements */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 75% 40%, rgba(122,92,56,0.05) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-25 line-grid"
        style={{ backgroundSize: '48px 48px' }}
      />

      {/* CSS-only Mandala decorative pattern */}
      <div className="mandala-pattern z-0" />

      {/* Decorative floating shapes */}
      <div className="absolute top-[15%] right-[8%] w-[280px] h-[280px] rounded-full opacity-[0.03] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, var(--brand), transparent)', animation: 'floatSoft 8s ease-in-out infinite' }} />
      <div className="absolute bottom-[20%] left-[5%] w-[200px] h-[200px] rounded-full opacity-[0.04] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, var(--brand), transparent)', animation: 'floatSoft 6s ease-in-out infinite reverse' }} />

      {/* Main Content */}
      <section className="relative z-10 flex-1 flex items-center">
        <div className="mx-auto w-full max-w-[1360px] px-6 py-12 lg:px-12">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
            {/* Left — Hero Copy */}
            <div className="max-w-[600px]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="h-[1px] w-8 bg-[var(--n-300)]" />
                <p className="font-ui text-[11px] uppercase tracking-[0.22em] text-[var(--n-400)]">
                  Nirmit — Interior Design for India
                </p>
              </motion.div>

              {/* Warm tagline */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-6 font-display text-[clamp(1.1rem,2vw,1.4rem)] italic text-warm"
              >
                Your home, imagined.
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="mt-3 font-display text-[clamp(2.5rem,5vw,4.2rem)] font-light leading-[1.06]"
              >
                See your home designed<br />
                <span className="italic text-[var(--n-500)]">before you spend a rupee.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="mt-8 max-w-[48ch] font-ui text-[18px] leading-[1.75] text-[var(--n-600)]"
              >
                Tell us about your room and your life. We'll generate complete, furnished design visions
                with real Indian furniture and real prices. Tweak them until they're perfect.
                Hand the plan to your carpenter. Done.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 }}
                className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7"
              >
                <div className="breathe-cta">
                    <Button variant="primary" size="lg" onClick={onStart}>
                    Design My Room →
                  </Button>
                </div>
                <p className="font-ui text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--n-600)]">
                  Free · 15 minutes · No login
                </p>
              </motion.div>

              {/* Trust stats */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="mt-14 grid grid-cols-3 gap-8 border-t border-[var(--n-200)] pt-8"
              >
                {[
                  { value: 600, suffix: '+', label: 'Indian furniture pieces' },
                  { value: 8, suffix: '', label: 'Cities with local pricing' },
                  { value: 15, suffix: ' min', label: 'From start to blueprint' },
                ].map(({ value, suffix, label }) => (
                  <div key={label}>
                    <div className="font-display text-[2rem] font-light text-[var(--brand)] leading-none">
                      <AnimatedCounter target={value} suffix={suffix} />
                    </div>
                    <div className="mt-2 font-ui text-[11px] text-[var(--n-500)] leading-[1.4]">{label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[24px] border border-[var(--n-200)] bg-white shadow-[var(--sh-lg)] overflow-hidden"
            >
              {/* Mini room preview */}
              <div className="relative bg-gradient-to-br from-[var(--n-100)] to-[var(--n-50)] p-6 border-b border-[var(--n-200)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                    <span className="font-ui text-[10px] uppercase tracking-[0.14em] text-[var(--n-400)]">Preview · Living Room</span>
                  </div>
                  <span className="font-ui text-[10px] text-[var(--n-400)]">12 × 14 ft</span>
                </div>

                {/* SVG Isometric Room */}
                <div className="h-[200px] flex items-center justify-center">
                  <svg viewBox="0 0 420 280" className="w-full h-full" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.08))' }}>
                    <g transform="translate(210, 145) scale(1.15)">
                      {/* Floor */}
                      <path d="M 0 10 L 100 -35 L 0 -80 L -100 -35 Z" fill="var(--n-200)" stroke="var(--n-300)" strokeWidth="0.8" />
                      {/* Left Wall */}
                      <path d="M -100 -35 L 0 -80 L 0 -165 L -100 -120 Z" fill="var(--n-100)" stroke="var(--n-200)" strokeWidth="0.8" />
                      {/* Right Wall */}
                      <path d="M 0 -80 L 100 -35 L 100 -120 L 0 -165 Z" fill="var(--n-50)" stroke="var(--n-200)" strokeWidth="0.8" />

                      {/* Sofa */}
                      <g transform="translate(-35, -5)">
                        <path d="M 0 0 L 50 -25 L 10 -45 L -40 -20 Z" fill="#9B8F80" stroke="#7A6F62" strokeWidth="0.8" />
                        <path d="M -40 -20 L 0 0 L 0 8 L -40 -12 Z" fill="#8A7F72" stroke="#7A6F62" strokeWidth="0.5" />
                        <path d="M -40 -20 L 10 -45 L 10 -52 L -40 -27 Z" fill="#A89B8E" stroke="#7A6F62" strokeWidth="0.5" />
                      </g>

                      {/* Coffee Table */}
                      <g transform="translate(5, -25)">
                        <path d="M 0 0 L 20 -10 L 0 -20 L -20 -10 Z" fill="#B5A590" stroke="#9A8E7A" strokeWidth="0.6" />
                        <path d="M -20 -10 L 0 0 L 0 4 L -20 -6 Z" fill="#A89880" stroke="#9A8E7A" strokeWidth="0.4" />
                      </g>

                      {/* TV Unit */}
                      <g transform="translate(20, -55)">
                        <path d="M 0 0 L 40 -20 L 35 -25 L -5 -5 Z" fill="#6B5D4F" stroke="#5A4D40" strokeWidth="0.6" />
                        <path d="M -5 -5 L 0 0 L 0 6 L -5 1 Z" fill="#5A4D40" stroke="#4A4038" strokeWidth="0.4" />
                        {/* Screen */}
                        <path d="M 8 -7 L 30 -18 L 28 -22 L 6 -11 Z" fill="#2E2A27" stroke="#1C1917" strokeWidth="0.3" opacity="0.7" />
                      </g>

                      {/* Pooja Unit (northeast) */}
                      <g transform="translate(52, -62)">
                        <path d="M 0 0 L 12 -6 L 6 -12 L -6 -6 Z" fill="#C8A96E" stroke="#A88E50" strokeWidth="0.5" />
                        <path d="M -6 -6 L 6 -12 L 6 -20 L -6 -14 Z" fill="#D4B87A" stroke="#A88E50" strokeWidth="0.4" />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Cost preview */}
              <div className="bg-[var(--brand)] p-5 text-[var(--n-50)]">
                <p className="font-ui text-[10px] uppercase tracking-[0.14em] text-[rgba(250,250,248,0.45)]">
                  Estimated Range
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[2.5rem] font-light leading-none">
                    ₹<AnimatedCounter target={2.8} suffix="" />L
                  </span>
                  <span className="font-display text-[1.5rem] font-light text-[rgba(250,250,248,0.5)]">
                    – ₹<AnimatedCounter target={4.2} suffix="" />L
                  </span>
                </div>
                <p className="mt-1 font-ui text-[11px] text-[rgba(250,250,248,0.4)]">
                  Narrows as you design · Mumbai rates
                </p>
              </div>

              {/* Material spec preview */}
              <div className="p-5 flex flex-col font-ui text-[12px]">
                {[
                  { product: 'CenturyPly BWP 19mm', price: '₹45,200' },
                  { product: 'Asian Paints Cane Beige', price: '₹8,500' },
                  { product: 'Hettich Quadro V6 Hardware', price: '₹12,800' },
                ].map(({ product, price }, i) => (
                  <div key={product} className={`flex items-center justify-between py-4 ${i < 2 ? 'border-b border-[var(--n-100)]' : ''}`}>
                    <span className="text-[var(--n-700)]">{product}</span>
                    <span className="font-medium text-[var(--brand)]">{price}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bottom bar */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="relative z-10 border-t border-[var(--n-200)] py-4 px-6"
      >
        <div className="max-w-[1360px] mx-auto flex items-center justify-between">
          <p className="font-ui text-[11px] text-[var(--n-400)]">
            Not Livspace. Not a blank canvas. The middle path.
          </p>
          <div className="flex items-center gap-6">
            {['No minimum budget', 'No lock-in', 'Your carpenter, your choice'].map(text => (
              <span key={text} className="font-ui text-[11px] text-[var(--n-400)] flex items-center gap-1.5">
                <span className="text-[#22c55e]">✓</span> {text}
              </span>
            ))}
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
