import { useEffect, useState } from "react";

// The backend doesn't report real progress (OCR + LLM extraction time
// varies with image quality and network conditions), so this shows an
// indeterminate bar plus a message that advances on a timer — enough to
// signal "this is actively working," not a literal percentage.
const STEPS = ["Reading the image", "Extracting the text", "Understanding the details"];
const STEP_INTERVAL_MS = 2500;

export function ProcessingIndicator() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="absolute inset-y-0 rounded-full bg-[var(--color-teal)] animate-indeterminate" />
      </div>
      <p className="mt-3 text-sm text-[var(--color-ink-soft)]">{STEPS[stepIndex]}…</p>
    </div>
  );
}
