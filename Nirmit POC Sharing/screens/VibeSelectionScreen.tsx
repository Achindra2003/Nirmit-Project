import { useState, useEffect } from 'react';

interface VibeSelectionScreenProps {
  selectedVibeId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
}

const QUIZ_ROUNDS = [
  {
    id: 'light_dark',
    option0: { label: 'Light and airy', bg: 'linear-gradient(160deg, #F5F0E8, #E8DFD0)', isLight: true },
    option1: { label: 'Dark and rich', bg: 'linear-gradient(160deg, #1C1410, #2E2018)', isLight: false }
  },
  {
    id: 'sparse_full',
    option0: { label: 'Sparse and minimal', bg: 'linear-gradient(160deg, #FAFAF8, #F0EDE6)', isLight: true },
    option1: { label: 'Full and layered', bg: 'linear-gradient(160deg, #1E1C1A, #332E28)', isLight: false }
  },
  {
    id: 'natural_geo',
    option0: { label: 'Natural organic', bg: 'linear-gradient(160deg, #EEE8DC, #D8CDB8)', isLight: true },
    option1: { label: 'Clean geometric', bg: 'linear-gradient(160deg, #E8E8E6, #D0CECC)', isLight: true }
  },
  {
    id: 'warm_white',
    option0: { label: 'Warm wood tones', bg: 'linear-gradient(160deg, #F0E4D0, #D4B896)', isLight: true },
    option1: { label: 'White and neutral', bg: 'linear-gradient(160deg, #FAFAF8, #EEECE8)', isLight: true }
  }
];

const VIBE_MAPPING: Record<number, string> = {
  0: 'minimalist-indian',
  1: 'scandinavian-desi',
  2: 'minimalist-indian',
  3: 'modern-bombay',
  4: 'coastal-kerala',
  5: 'coastal-kerala',
  6: 'modern-bombay',
  7: 'modern-bombay',
  8: 'industrial-delhi',
  9: 'industrial-delhi',
  10: 'chettinad-fusion',
  11: 'chettinad-fusion',
  12: 'royal-rajasthani',
  13: 'maximalist-mughal',
  14: 'royal-rajasthani',
  15: 'maximalist-mughal'
};

function renderIcon(roundId: string, choice: number) {
  if (roundId === 'light_dark' && choice === 0) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" stroke="currentColor" fill="none" strokeWidth="1.5">
        <path d="M16 4v6M16 22v6M4 16h6M22 16h6M7.5 7.5l4.2 4.2M20.3 20.3l4.2 4.2M24.5 7.5l-4.2 4.2M11.7 20.3l-4.2 4.2" />
      </svg>
    );
  }
  if (roundId === 'light_dark' && choice === 1) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
        <rect x="8" y="8" width="16" height="16" />
      </svg>
    );
  }
  if (roundId === 'sparse_full' && choice === 0) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" stroke="currentColor" fill="none" strokeWidth="1.5">
        <path d="M8 10h16M8 16h16M8 22h16" />
      </svg>
    );
  }
  if (roundId === 'sparse_full' && choice === 1) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" stroke="currentColor" fill="none" strokeWidth="1.5">
        <path d="M8 6h16M8 10h16M8 14h16M8 18h16M8 22h16M8 26h16" />
      </svg>
    );
  }
  if (roundId === 'natural_geo' && choice === 0) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" stroke="currentColor" fill="none" strokeWidth="1.5">
        <path d="M16 4C9 4 4 12 8 20c3 6 13 8 18 2 4-5 2-15-10-18z" />
      </svg>
    );
  }
  if (roundId === 'natural_geo' && choice === 1) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" stroke="currentColor" fill="none" strokeWidth="1.5">
        <rect x="8" y="8" width="6" height="6" />
        <rect x="18" y="8" width="6" height="6" />
        <rect x="8" y="18" width="6" height="6" />
        <rect x="18" y="18" width="6" height="6" />
      </svg>
    );
  }
  if (roundId === 'warm_white' && choice === 0) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" stroke="currentColor" fill="none" strokeWidth="1.5">
        <path d="M4 10c8 4 16-4 24 0M4 16c8 4 16-4 24 0M4 22c8 4 16-4 24 0" />
      </svg>
    );
  }
  if (roundId === 'warm_white' && choice === 1) {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32" stroke="currentColor" fill="none" strokeWidth="1.5">
        <circle cx="16" cy="16" r="10" />
      </svg>
    );
  }
  return null;
}

export default function VibeSelectionScreen({ onSelect, onContinue }: VibeSelectionScreenProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [justClicked, setJustClicked] = useState<number | null>(null);

  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!analyzing) return;
    
    const timers = [
      setTimeout(() => setLoadingStep(1), 800),
      setTimeout(() => setLoadingStep(2), 1600)
    ];
    
    return () => timers.forEach(clearTimeout);
  }, [analyzing]);

  const handleSelection = (choice: number) => {
    if (justClicked !== null || analyzing) return;
    
    setJustClicked(choice);
    const newAnswers = [...answers, choice];
    
    setTimeout(() => {
      setJustClicked(null);
      if (newAnswers.length === 4) {
        setAnswers(newAnswers);
        finishQuiz(newAnswers);
      } else {
        setAnswers(newAnswers);
        setStep((s) => s + 1);
      }
    }, 450);
  };

  const finishQuiz = (finalAnswers: number[]) => {
    setAnalyzing(true);
    const score = (finalAnswers[0] * 8) + (finalAnswers[1] * 4) + (finalAnswers[2] * 2) + (finalAnswers[3] * 1);
    const resolvedVibeId = VIBE_MAPPING[score] || 'minimalist-indian';
    
    setTimeout(() => {
      onSelect(resolvedVibeId);
      onContinue();
    }, 2400);
  };

  if (analyzing) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-8">
          <div className="relative h-[2.5rem] flex items-center justify-center">
            {loadingStep === 0 && (
              <p className="font-display text-[2.5rem] font-light text-[var(--brand)] absolute text-nowrap" style={{ animation: 'slideUpFade 400ms var(--ease-out)' }}>
                Reading your instincts
              </p>
            )}
            {loadingStep === 1 && (
              <p className="font-display text-[2.5rem] font-light text-[var(--n-400)] absolute text-nowrap" style={{ animation: 'slideUpFade 400ms var(--ease-out)' }}>
                Mapping the space
              </p>
            )}
            {loadingStep === 2 && (
              <p className="font-display text-[2.5rem] font-light text-[var(--n-300)] absolute text-nowrap" style={{ animation: 'slideUpFade 400ms var(--ease-out)' }}>
                Preparing your vibe
              </p>
            )}
          </div>
          
          <div className="h-[2px] w-[240px] rounded-[1px] bg-[var(--n-200)] overflow-hidden">
            <div 
              className="h-full bg-[var(--brand)]" 
              style={{ transition: 'width 2400ms linear', width: '100%', animation: 'widthFill 2400ms linear forwards' }}
            />
          </div>
          <style>
            {`
              @keyframes widthFill {
                from { width: 0%; }
                to { width: 100%; }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  const currentRound = QUIZ_ROUNDS[step];

  return (
    <section className="flex h-[calc(100vh-80px)] w-full max-w-[1440px] mx-auto flex-col px-4 py-4 md:px-8 md:py-6">
      <header className="flex shrink-0 flex-col items-center pb-4 text-center md:pb-6">
        <div className="mb-4 flex gap-2">
          {[0, 1, 2, 3].map((dot) => {
            let bgClass = 'bg-[var(--n-200)]';
            if (dot < step) bgClass = 'bg-[var(--brand)]';
            if (dot === step) bgClass = 'bg-[var(--brand)] opacity-40';
            
            return (
              <div
                key={dot}
                className={`h-1.5 w-7 rounded-full transition-colors duration-[var(--dur-slow)] ease-[var(--ease-out)] ${bgClass}`}
              />
            );
          })}
        </div>
        <h1 className="font-display text-[clamp(2.5rem,4vw,3.5rem)] font-light text-[var(--brand)]">
          Which feels more like <span className="italic text-[var(--n-500)]">you?</span>
        </h1>
        <p className="mt-2 font-ui text-[14px] text-[var(--n-500)]">
          Go with your first instinct.
        </p>
      </header>

      <div className="flex-1 min-h-[55vh] flex gap-4 md:gap-6 w-full max-w-4xl mx-auto pb-4">
        {[0, 1].map((choice) => {
          const option = choice === 0 ? currentRound.option0 : currentRound.option1;
          const isClicked = justClicked === choice;
          const isOtherClicked = justClicked !== null && justClicked !== choice;

          const textColor = option.isLight ? 'text-[var(--brand)]' : 'text-[var(--n-50)]';
          const borderColor = isClicked ? 'border-[var(--brand)]' : 'border-transparent';

          let transformClass = '';
          let opacityClass = 'opacity-100';
          let filterClass = '';
          
          if (isClicked) {
            transformClass = 'scale-[0.97]';
          } else if (isOtherClicked) {
            transformClass = 'scale-[0.91]';
            opacityClass = 'opacity-0';
            filterClass = 'blur-[4px] pointer-events-none';
          }

          return (
            <button
              key={choice}
              type="button"
              onClick={() => handleSelection(choice)}
              className={`relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 transition-all duration-[var(--dur-slow)] ease-out cursor-pointer ${borderColor} ${transformClass} ${opacityClass} ${filterClass} ${textColor}`}
              style={{ background: option.bg }}
            >
              <span className="font-display text-[1.75rem] font-normal mb-4">
                {option.label}
              </span>
              <div className="flex items-center justify-center">
                {renderIcon(currentRound.id, choice)}
              </div>
              
              {isClicked && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none"
                >
                  <div 
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--brand)]"
                    style={{ animation: 'scaleUp var(--dur-base) var(--ease-spring)' }}
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
