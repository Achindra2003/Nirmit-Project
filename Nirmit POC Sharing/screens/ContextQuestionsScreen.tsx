import { useState } from 'react';
import { CONTEXT_CITIES, MUST_HAVE_OPTIONS, type BudgetType, type ContextAnswers } from '../types/journey';
import Button from '../components/ui/Button';

interface ContextQuestionsScreenProps {
  value: ContextAnswers;
  onChange: (next: ContextAnswers) => void;
  onBack: () => void;
  onContinue: () => void;
}

const TOTAL_QUESTIONS = 4;

export default function ContextQuestionsScreen({ value, onChange, onBack, onContinue }: ContextQuestionsScreenProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animationKey, setAnimationKey] = useState(0); // to force re-render for animation

  const canMoveNext =
    (questionIndex === 0 && value.homeType !== null) ||
    (questionIndex === 1 && Boolean(value.city)) ||
    (questionIndex === 2 && Boolean(value.budget)) ||
    questionIndex === 3;

  const handleNext = () => {
    if (!canMoveNext) return;

    if (questionIndex < TOTAL_QUESTIONS - 1) {
      setDirection('forward');
      setQuestionIndex((current) => current + 1);
      setAnimationKey((k) => k + 1);
      return;
    }

    onContinue();
  };

  const handlePrev = () => {
    if (questionIndex === 0) {
      onBack();
      return;
    }

    setDirection('backward');
    setQuestionIndex((current) => current - 1);
    setAnimationKey((k) => k + 1);
  };

  const renderQuestion = () => {
    switch (questionIndex) {
      case 0:
        return (
          <div className="flex flex-col gap-6">
            <h2 className="font-display text-[1.5rem] italic font-normal text-[var(--brand)]">
              Is this room rented or owned?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => onChange({ ...value, homeType: 'renting' })}
                className={`flex flex-col items-start justify-center h-[120px] w-full sm:w-[200px] border-[2px] rounded-[16px] px-5 transition-colors duration-[var(--dur-fast)] cursor-pointer
                  ${value.homeType === 'renting' ? 'border-[var(--brand)] bg-[var(--n-50)]' : 'border-[var(--n-200)] bg-transparent hover:bg-[var(--n-50)]'}`}
              >
                <span className="font-ui text-[14px] font-medium text-[var(--brand)]">Renting</span>
                <span className="font-ui text-[11px] text-[var(--n-500)] mt-1 text-left">No permanent changes</span>
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...value, homeType: 'owning' })}
                className={`flex flex-col items-start justify-center h-[120px] w-full sm:w-[200px] border-[2px] rounded-[16px] px-5 transition-colors duration-[var(--dur-fast)] cursor-pointer
                  ${value.homeType === 'owning' ? 'border-[var(--brand)] bg-[var(--n-50)]' : 'border-[var(--n-200)] bg-transparent hover:bg-[var(--n-50)]'}`}
              >
                <span className="font-ui text-[14px] font-medium text-[var(--brand)]">I own it</span>
                <span className="font-ui text-[11px] text-[var(--n-500)] mt-1 text-left">Structural options available</span>
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col gap-6">
            <h2 className="font-display text-[1.5rem] italic font-normal text-[var(--brand)]">
              Which city?
            </h2>
            <div className="flex flex-wrap gap-3">
              {CONTEXT_CITIES.map((city) => {
                const selected = value.city === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => onChange({ ...value, city })}
                    className={`rounded-full border px-4 py-2 font-ui text-[13px] font-medium transition-colors duration-[var(--dur-fast)] cursor-pointer
                      ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--n-50)]' : 'border-[var(--n-200)] bg-transparent text-[var(--n-600)] hover:border-[var(--brand)]'}`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col gap-6">
            <h2 className="font-display text-[1.5rem] italic font-normal text-[var(--brand)]">
              What is your target budget?
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              {(['economical', 'mid-range', 'premium'] as BudgetType[]).map((budgetTier) => {
                const selected = value.budget === budgetTier;
                const info = {
                  'economical': { range: '₹1.5L – ₹3L', desc: 'Strict constraints. Smart modulars.' },
                  'mid-range': { range: '₹3L – ₹6L', desc: 'Balanced finishes. Good longevity.' },
                  'premium': { range: '₹6L+', desc: 'Bespoke materials. High luxury.' }
                }[budgetTier];
                return (
                  <button
                    key={budgetTier}
                    type="button"
                    onClick={() => onChange({ ...value, budget: budgetTier })}
                    className={`flex flex-col justify-center h-[120px] w-full border-[2px] rounded-[16px] px-5 transition-colors duration-[var(--dur-fast)] cursor-pointer text-left
                      ${selected ? 'border-[var(--brand)] bg-[var(--n-50)]' : 'border-[var(--n-200)] bg-transparent hover:bg-[var(--n-50)]'}`}
                  >
                    <span className="font-display text-[1.25rem] text-[var(--brand)] font-normal">{info.range}</span>
                    <span className="font-ui text-[11px] text-[var(--n-500)] mt-1">{info.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col gap-6">
            <h2 className="font-display text-[1.5rem] italic font-normal text-[var(--brand)]">
              Any non-negotiables?
            </h2>
            <p className="font-ui text-[11px] text-[var(--n-500)] -mt-4">
              Pick any. These pre-load into your layout.
            </p>
            <div className="flex flex-wrap gap-3">
              {MUST_HAVE_OPTIONS.map((item) => {
                const selected = value.mustHaves.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      const newMustHaves = selected
                        ? value.mustHaves.filter((h) => h !== item)
                        : [...value.mustHaves, item];
                      onChange({ ...value, mustHaves: newMustHaves });
                    }}
                    className={`rounded-full border px-4 py-2 font-ui text-[13px] font-medium transition-colors duration-[var(--dur-fast)] cursor-pointer
                      ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--n-50)]' : 'border-[var(--n-200)] bg-transparent text-[var(--n-600)] hover:border-[var(--brand)]'}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center pt-[10vh] px-4">
      <div className="w-full max-w-[560px]">
        {/* Persistent Header */}
        <header className="mb-10 text-center md:text-left">
          <h1 className="font-display text-[2rem] font-normal text-[var(--brand)]">
            Tell us about your space
          </h1>
          <p className="mt-2 font-ui text-[12px] text-[var(--n-400)]">
            Question {questionIndex + 1} of {TOTAL_QUESTIONS}
          </p>
        </header>

        {/* Animated Question Container */}
        <div className="relative min-h-[280px]">
          <div
            key={animationKey}
            style={{
              animation: direction === 'forward'
                ? 'slideInForward 300ms var(--ease-out) 0ms both'
                : 'slideInBackward 300ms var(--ease-out) 0ms both'
            }}
          >
            {renderQuestion()}
          </div>
          
          <style>
            {`
              @keyframes slideInForward {
                from { opacity: 0; transform: translateX(24px); }
                to { opacity: 1; transform: translateX(0); }
              }
              @keyframes slideInBackward {
                from { opacity: 0; transform: translateX(-24px); }
                to { opacity: 1; transform: translateX(0); }
              }
            `}
          </style>
        </div>

        {/* Footer Controls */}
        <footer className="mt-8 flex flex-col gap-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!canMoveNext}
            onClick={handleNext}
          >
            Continue →
          </Button>
          
          {questionIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="font-ui text-[13px] text-[var(--n-500)] hover:text-[var(--brand)] transition-colors self-center md:self-start"
            >
              ← Back to previous
            </button>
          )}
        </footer>
      </div>
    </section>
  );
}
