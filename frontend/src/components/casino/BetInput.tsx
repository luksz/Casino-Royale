import { useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS = [10, 50, 100, 500, 1000];

interface BetInputProps {
  value: number;
  onChange: (v: number) => void;
  max: number;
  disabled?: boolean;
  label?: string;
}

export function BetInput({ value, onChange, max, disabled, label = "Bet" }: BetInputProps) {
  const [raw, setRaw] = useState(String(value));

  function commit(n: number) {
    const clamped = Math.max(1, Math.min(max, Math.floor(n)));
    onChange(clamped);
    setRaw(String(clamped));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value);
    const n = parseInt(e.target.value);
    if (!isNaN(n)) commit(n);
  }

  const visiblePresets = PRESETS.filter(p => p <= max);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <p className="text-ivory/30 text-xs uppercase tracking-widest">{label}</p>

      {/* Amount display + input */}
      <div className="flex items-center gap-2">
        <button onClick={() => commit(value - 10)} disabled={disabled || value <= 1}
          className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 text-ivory/60 hover:text-ivory font-bold text-lg leading-none disabled:opacity-30 transition-colors">
          −
        </button>
        <input
          type="number"
          value={raw}
          onChange={handleInput}
          onBlur={() => commit(parseInt(raw) || 1)}
          disabled={disabled}
          min={1}
          max={max}
          className="w-32 text-center bg-navy-900 border border-royal-600/30 rounded-lg px-3 py-2
                     text-gold-400 font-black text-xl focus:outline-none focus:border-royal-400
                     disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button onClick={() => commit(value + 10)} disabled={disabled || value >= max}
          className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 text-ivory/60 hover:text-ivory font-bold text-lg leading-none disabled:opacity-30 transition-colors">
          +
        </button>
      </div>

      {/* Presets + Max */}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {visiblePresets.map(p => (
          <button key={p} onClick={() => commit(p)} disabled={disabled}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold border transition-all",
              value === p
                ? "border-gold-400 bg-gold-500/20 text-gold-400"
                : "border-navy-600 text-ivory/40 hover:text-ivory/70",
            )}>
            {p.toLocaleString()}
          </button>
        ))}
        <button onClick={() => commit(max)} disabled={disabled || value === max}
          className={cn(
            "px-3 py-1 rounded-lg text-xs font-bold border transition-all",
            value === max
              ? "border-gold-400 bg-gold-500/20 text-gold-400"
              : "border-gold-600/40 text-gold-500/60 hover:text-gold-400 hover:border-gold-400/60",
          )}>
          All In
        </button>
      </div>
    </div>
  );
}
