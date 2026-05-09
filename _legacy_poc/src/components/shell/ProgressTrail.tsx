const STEP_LABELS = ['Discover', 'Visions', 'Design', 'Style', 'The Brief'];

interface ProgressTrailProps {
  currentStep: number;
}

export default function ProgressTrail({ currentStep }: ProgressTrailProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {STEP_LABELS.map((label, index) => {
          const stepIndex = index + 1;
          const isCompleted = currentStep > stepIndex;
          const isCurrent = currentStep === stepIndex;

          let dotClass = 'bg-[var(--n-100)] border-[1px] border-[var(--n-200)] text-[var(--n-400)]';
          let labelClass = 'text-[var(--n-400)]';
          
          if (isCompleted) {
            dotClass = 'bg-[var(--brand)] border-[2px] border-[var(--brand)] text-[var(--n-50)]';
          } else if (isCurrent) {
            dotClass = 'bg-white border-[2px] border-[var(--brand)] text-[var(--brand)]';
            labelClass = 'text-[var(--brand)]';
          }

          return (
            <div key={label} className="flex items-center gap-2 md:gap-4">
              <div className="flex flex-col items-center gap-1 md:gap-2">
                <div
                  className={`flex h-7 w-7 md:h-[28px] md:w-[28px] items-center justify-center rounded-full font-ui text-[11px] font-semibold transition-all duration-[var(--dur-slow)] ease-[var(--ease-out)] relative ${dotClass}`}
                >
                  <span className="relative z-10 transition-opacity duration-200">
                    {isCompleted ? '' : stepIndex}
                  </span>
                  {isCompleted && (
                    <span 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ animation: 'scaleUp var(--dur-base) var(--ease-spring) forwards' }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <span className={`font-ui text-[10px] uppercase tracking-[0.04em] font-medium transition-colors duration-[var(--dur-slow)] ${labelClass}`}>
                  {label}
                </span>
              </div>

              {index < STEP_LABELS.length - 1 && (
                <div className="relative h-[1px] w-8 bg-[var(--n-200)] md:w-[48px]">
                  <div
                    className="absolute left-0 top-0 h-[1px] bg-[var(--brand)]"
                    style={{ 
                      width: currentStep > stepIndex ? '100%' : '0%',
                      transition: 'width var(--dur-slow) var(--ease-out)'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
