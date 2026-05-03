import { Chip } from "./Chip";
import { cn } from "@/lib/utils";

const DENOMINATIONS = [1, 5, 25, 100, 500];

interface BetControlProps {
  bet: number;
  onAdd: (amount: number) => void;
  onClear: () => void;
  onAllIn?: () => void;
  disabled?: boolean;
  maxBet?: number;
}

export function BetControl({ bet, onAdd, onClear, onAllIn, disabled, maxBet }: BetControlProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-ivory/50 text-xs uppercase tracking-widest">Place your bet</p>
      <p className="font-display text-3xl text-gold-400 font-bold min-w-[4rem] text-center">
        {bet.toLocaleString()}
      </p>
      <div className="flex gap-2">
        {DENOMINATIONS.map((d) => (
          <Chip
            key={d}
            value={d}
            disabled={disabled || (maxBet !== undefined && bet + d > maxBet)}
            onClick={() => onAdd(d)}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onClear} disabled={disabled || bet === 0} className="btn-ghost text-sm py-1 px-4">
          Clear
        </button>
        {onAllIn && maxBet !== undefined && (
          <button
            onClick={onAllIn}
            disabled={disabled || bet === maxBet || maxBet === 0}
            className={cn(
              "text-sm py-1 px-4 rounded-lg border font-semibold transition-all",
              bet === maxBet
                ? "border-gold-400 bg-gold-500/20 text-gold-400"
                : "border-gold-600/40 text-gold-500/60 hover:text-gold-400 hover:border-gold-400/60",
            )}
          >
            All In
          </button>
        )}
      </div>
    </div>
  );
}
