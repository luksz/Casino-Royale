import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { Chip } from "@/components/casino/Chip";
import { ChipStack } from "@/components/casino/ChipStack";
import { cn } from "@/lib/utils";

interface KenoResult {
  draws: number[]; picks: number[]; matches: number[];
  num_matches: number; return_multiplier: number;
  net_delta: number; stake: number; new_balance: number;
}

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];
const ALL_NUMBERS = Array.from({ length: 80 }, (_, i) => i + 1);

// Return multiplier payouts (0=lose, 1=push, >1=win)
const PAYOUT_TABLE: Record<number, Record<number, number>> = {
  1:  {1: 3},
  2:  {2: 15, 1: 2},
  3:  {3: 46,  2: 3,   1: 1},
  4:  {4: 92,  3: 7,   2: 2,  1: 1},
  5:  {5: 700, 4: 23,  3: 4},
  6:  {6: 1400, 5: 76,  4: 11, 3: 2},
  7:  {7: 3500, 6: 180, 5: 26, 4: 6,  3: 2},
  8:  {8: 7000, 7: 700, 6: 90, 5: 18, 4: 4},
  9:  {9: 12000, 8: 2000, 7: 250, 6: 50, 5: 10, 4: 2},
  10: {10: 40000, 9: 4000, 8: 600, 7: 100, 6: 20, 5: 4, 4: 2},
};

function getPayoutLabel(mult: number): string {
  if (mult === 0) return "Lose";
  if (mult === 1) return "Push";
  return `${(mult - 1).toLocaleString()}:1`;
}

export default function KenoPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { win, lose } = useSound();

  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [stake, setStake] = useState(0);
  const [lastStake, setLastStake] = useState(0);
  const [result, setResult] = useState<KenoResult | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [revealedDraws, setRevealedDraws] = useState<Set<number>>(new Set());

  if (!currentPlayerId) { navigate("/"); return null; }
  const balance = balanceData?.balance ?? 0;

  function togglePick(n: number) {
    if (drawing) return;
    setPicks(prev => {
      const next = new Set(prev);
      if (next.has(n)) { next.delete(n); }
      else if (next.size < 10) { next.add(n); }
      return next;
    });
    setResult(null);
    setRevealedDraws(new Set());
  }

  async function draw() {
    if (picks.size === 0 || stake <= 0 || drawing) return;
    setDrawing(true);
    setResult(null);
    setRevealedDraws(new Set());
    setLastStake(stake);
    try {
      const res = await apiPost<KenoResult>("/keno/draw", {
        player_id: currentPlayerId,
        picks: [...picks],
        stake,
      });
      // Reveal drawn numbers one by one
      for (const num of res.draws) {
        await new Promise(r => setTimeout(r, 80));
        setRevealedDraws(prev => new Set([...prev, num]));
      }
      setResult(res);
      refetch();
      recordRound("Keno", res.net_delta);
      res.net_delta > 0 ? win() : lose();
    } finally {
      setDrawing(false);
    }
  }

  const numPicks = picks.size;
  const payoutRow = PAYOUT_TABLE[numPicks] ?? {};
  const matchesSet = new Set(result?.matches ?? []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Keno</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-6 px-4 max-w-3xl mx-auto w-full">

        {/* Number grid */}
        <div className="card-surface p-4 w-full">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3 text-center">
            Pick 1–10 numbers · <span className="text-gold-400 font-semibold">{numPicks}/10 selected</span>
          </p>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
            {ALL_NUMBERS.map(n => {
              const isPick = picks.has(n);
              const isDraw = revealedDraws.has(n);
              const isMatch = matchesSet.has(n);
              return (
                <button
                  key={n}
                  onClick={() => togglePick(n)}
                  disabled={drawing || (!isPick && picks.size >= 10)}
                  className={cn(
                    "aspect-square rounded-lg text-xs font-bold transition-all duration-150 disabled:cursor-not-allowed",
                    isMatch
                      ? "bg-gold-500 text-navy-900 scale-110 shadow-md shadow-gold-500/30"
                      : isDraw
                        ? "bg-green-700/50 text-green-300 border border-green-600/40"
                        : isPick
                          ? "bg-royal-600 text-white border-2 border-royal-400 scale-105 shadow-md"
                          : "bg-navy-800/60 text-ivory/50 hover:bg-navy-700 hover:text-ivory border border-transparent",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && !drawing && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="card-surface px-8 py-5 text-center w-full"
            >
              <p className={`font-display text-3xl font-bold ${result.net_delta > 0 ? "text-gold-400" : result.net_delta < 0 ? "text-red-400" : "text-ivory"}`}>
                {result.num_matches} match{result.num_matches !== 1 ? "es" : ""}
                {result.return_multiplier > 1 && ` · ${(result.return_multiplier - 1)}:1`}
              </p>
              <p className={`text-xl font-semibold mt-1 ${result.net_delta > 0 ? "text-green-400" : result.net_delta < 0 ? "text-red-400" : "text-ivory/60"}`}>
                {result.net_delta > 0 ? `+${result.net_delta.toLocaleString()}` : result.net_delta.toLocaleString()} chips
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payout table for current pick count */}
        {numPicks > 0 && (
          <div className="card-surface p-4 w-full">
            <p className="text-ivory/30 text-xs uppercase tracking-widest mb-2 text-center">
              Payouts for {numPicks} pick{numPicks !== 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {Object.entries(payoutRow).sort((a, b) => Number(b[0]) - Number(a[0])).map(([matches, mult]) => (
                <span key={matches}
                  className={cn(
                    "text-xs px-2 py-1 rounded-lg border font-semibold",
                    Number(mult) > 1
                      ? "border-gold-500/30 bg-gold-500/10 text-gold-400"
                      : "border-navy-600 text-ivory/40"
                  )}>
                  {matches} match → {getPayoutLabel(Number(mult))}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-4">
          {/* Stake display */}
          <div className="flex items-center gap-3 min-h-[40px]">
            {stake > 0 ? (
              <>
                <ChipStack amount={stake} size={36} />
                <span className="font-display text-3xl text-gold-400 font-bold tabular-nums">{stake.toLocaleString()}</span>
              </>
            ) : (
              <span className="font-display text-3xl text-ivory/20 font-bold">0</span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {CHIP_VALUES.map(v => (
              <Chip key={v} value={v} disabled={drawing || stake + v > balance} onClick={() => setStake(s => s + v)} />
            ))}
            {balance > 5000 && (
              <button onClick={() => setStake(balance)} disabled={drawing || stake >= balance}
                className="px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30 border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400">
                All In
              </button>
            )}
          </div>

          {lastStake > 0 && (
            <div className="flex gap-2 w-full">
              <button onClick={() => setStake(lastStake)} disabled={drawing || lastStake > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
              </button>
              <button onClick={() => setStake(Math.max(1, Math.floor(lastStake / 2)))} disabled={drawing}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ½ Bet
              </button>
              <button onClick={() => setStake(lastStake * 2)} disabled={drawing || lastStake * 2 > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ×2 Bet
              </button>
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button onClick={() => { setStake(0); }} disabled={stake === 0 || drawing} className="btn-ghost flex-1 text-sm py-2">
              Clear{stake > 0 ? ` (${stake.toLocaleString()})` : ""}
            </button>
            <button onClick={draw} disabled={picks.size === 0 || stake <= 0 || drawing || stake > balance}
              className="btn-primary flex-1 text-base py-3">
              {drawing ? "Drawing…" : `Draw · ${stake.toLocaleString()}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
