import { useEffect } from 'react';

interface TransitionScreenProps {
  onFinish: () => void;
  onBack: () => void;
}

export default function TransitionScreen({ onFinish, onBack }: TransitionScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onFinish();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <section className="flex h-[calc(100vh-80px)] w-full items-center justify-center bg-[var(--brand)] text-[var(--n-50)] px-4">
      <article className="max-w-3xl w-full text-center relative">
        <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-14 h-44 w-44 rounded-full bg-white/5 blur-2xl" />

        <p className="font-ui text-[11px] uppercase tracking-[0.2em] text-[var(--n-400)] font-medium">Act 2 → Act 3 Transition</p>
        <h1 className="mt-3 font-display text-[3.5rem] leading-[1] font-normal">Bringing your layout to life</h1>
        <p className="mt-3 text-[14px] text-[var(--n-300)] font-ui max-w-lg mx-auto">
          Translating planner coordinates to 3D perspective, applying vibe defaults, and preparing material controls.
        </p>

        <div className="mx-auto mt-10 h-1 w-full max-w-lg overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full animate-[loading_1.8s_ease-in-out] rounded-full bg-[var(--n-50)]" />
        </div>

        <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-3 font-ui text-[12px] text-[var(--n-300)]">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex justify-center">Map geometry</div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex justify-center">Load materials</div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex justify-center">Init camera</div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-10 rounded-full border border-[var(--n-600)] px-6 py-2 text-sm text-[var(--n-300)] hover:bg-white/10 transition-colors font-ui"
        >
          Back to Plan
        </button>
      </article>
    </section>
  );
}
