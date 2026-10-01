// FR-22: how much of the PRD the interview has covered so far.
import { READY_AT } from "@/lib/ai/scorer";

export function CompletenessMeter({ score }: { score: number }) {
  const ready = score >= READY_AT;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold">כיסוי ה-PRD</span>
        <span className={ready ? "font-bold text-status-good" : "text-ink-muted"}>{score}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="כיסוי ה-PRD"
        className="h-2 overflow-hidden rounded-full bg-ink-wash"
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${ready ? "bg-status-good" : "bg-mark-half"}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-muted">{ready ? "מספיק כדי להפיק PRD טוב." : `מומלץ להגיע ל-${READY_AT}% לפני הפקה.`}</p>
    </div>
  );
}
