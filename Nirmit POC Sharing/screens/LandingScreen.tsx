import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  return (
    <div
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-[var(--n-50)] text-[var(--brand)] overflow-x-hidden overflow-y-auto flex flex-col"
    >
      {/* Background decorative elements */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 75% 40%, rgba(122,92,56,0.05) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(87,73,59,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(87,73,59,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Parallax floating shapes */}
      <div
        className="absolute top-[15%] right-[8%] w-[280px] h-[280px] rounded-full opacity-[0.04] pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, var(--brand), transparent)',
          transform: `translate(${mousePos.x * 24}px, ${mousePos.y * 18}px)`,
          transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
      <div
        className="absolute bottom-[20%] left-[5%] w-[200px] h-[200px] rounded-full opacity-[0.05] pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, var(--brand), transparent)',
          transform: `translate(${-mousePos.x * 16}px, ${-mousePos.y * 12}px)`,
          transition: 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

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
                className="flex items-center gap-4 mb-3"
              >
                <img src="/nirmit-logo.svg.svg" alt="Nirmit" className="h-24 w-auto" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-7 font-display text-[clamp(2.5rem,5vw,4.2rem)] font-light leading-[1.06]"
              >
                See your home designed<br />
                <span className="italic text-[var(--n-500)]">before you spend a rupee.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-8 max-w-[48ch] font-ui text-[18px] leading-[1.75] text-[var(--n-600)]"
              >
                Tell us about your room and your life. We'll generate complete, furnished design visions
                with real Indian furniture and real prices. Tweak them until they're perfect.
                Hand the plan to your carpenter. Done.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7"
              >
                <Button variant="primary" size="lg" onClick={onStart}>
                  Design My Room →
                </Button>
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

            {/* Right — Interactive Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{
                borderRadius: 24,
                border: '1px solid var(--n-200)',
                background: 'white',
                boxShadow: 'var(--sh-lg)',
                overflow: 'hidden',
                transform: `perspective(1200px) rotateX(${-mousePos.y * 3}deg) rotateY(${mousePos.x * 6}deg) translateZ(0)`,
                transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Mini room preview */}
              <div className="relative bg-gradient-to-br from-[var(--n-100)] to-[var(--n-50)] p-6 border-b border-[var(--n-200)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22c55e]" style={{ animation: 'pulse 2s infinite' }} />
                    <span className="font-ui text-[10px] uppercase tracking-[0.14em] text-[var(--n-400)]">Preview · Living Room</span>
                  </div>
                  <span className="font-ui text-[10px] text-[var(--n-400)]">12 × 14 ft</span>
                </div>

                {/* High-End Realistic Room Preview */}
                <div className="h-[220px] relative flex items-end justify-start overflow-hidden rounded-md mt-2 bg-[var(--n-200)] group cursor-pointer">
                  {/* Seamless Image Reveal */}
                  <motion.img 
                    src="/premium_living_room.png"
                    alt="Premium Living Room"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                    initial={{ scale: 1.05, filter: 'blur(4px)', opacity: 0 }}
                    animate={{ scale: 1, filter: 'blur(0px)', opacity: 1 }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    onError={(e) => {
                      // Fallback if the local image is missing
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=800";
                    }}
                  />
                  
                  {/* Soft Cinematic Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] via-transparent to-transparent pointer-events-none" />
                  
                  {/* Contextual UI Overlays mimicking Nirmit's intelligence */}
                  <motion.div 
                    className="relative z-10 p-4 w-full"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-ui font-medium text-[13px] tracking-wide drop-shadow-md">
                          The Gathering
                        </div>
                        <div className="text-[rgba(255,255,255,0.7)] font-ui text-[10px] tracking-wider uppercase mt-1">
                          Vastu-Compliant · Max Storage
                        </div>
                      </div>
                      
                      {/* Generative AI Sparkle Badge */}
                      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full">
                        <Sparkles size={10} className="text-[#D4B87A]" />
                        <span className="text-white font-ui text-[9px] font-medium tracking-wide">AI Generated</span>
                      </div>
                    </div>
                  </motion.div>
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
