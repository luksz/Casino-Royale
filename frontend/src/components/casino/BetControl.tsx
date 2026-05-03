import { Chip } from "./Chip";

const DENOMINATIONS = [1, 5, 25, 100, 500];

interface BetControlProps {
  bet: number;
  onAdd: (amount: number) => void;
  onClear: () => void;
  disabled?: boolean;
  maxBet?: number;
}

export function BetControl({ bet, onAdd, onClear, disabled, maxBet }: BetControlProps) {
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
      <button onClick={onClear} disabled={disabled || bet === 0} className="btn-ghost text-sm py-1 px-4">
        Clear
      </button>
    </div>
  );
}
