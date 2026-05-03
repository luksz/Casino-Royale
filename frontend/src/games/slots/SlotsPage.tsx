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

interface SlotResult { reels: string[]; won: boolean; multiplier: number; net_delta: number; new_balance: number }

const SYMBOLS = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"];
const PAYOUTS: Record<string, number> = { "🍒": 2, "🍋": 3, "🍇": 5, "⭐": 10, "💎": 25, "7️⃣": 100 };
const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];

function Reel({ symbol, spinning, delay }: { symbol: string; spinning: boolean; delay: number }) {
  return (
    <div className="w-24 h-24 bg-navy-900 rounded-xl border-2 border-royal-600/30 flex items-center justify-center overflow-hidden relative shadow-inner">
      {spinning ? (
        <motion.div
          animate={{ y: [0, -220, 40, -180, 20, -140, 0] }}
          transition={{ duration: 1.2, delay, ease: "easeInOut" }}
          className="text-5xl select-none"
        >
          {SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]}
        </motion.div>
      ) : (
        <motion.div
          key={symbol}
          initial={{ y: -80, opacity: 0, scale: 0.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18, delay }}
          className="text-5xl select-none"
        >
          {symbol}
        </motion.div>
      )}
    </div>
  );
}

export default function SlotsPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { win, lose, spin: spinSfx } = useSound();
  const [stake, setStake] = useState(0);
  const [lastStake, setLastStake] = useState(0);
  const [result, setResult] = useState<SlotResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState(["🎰", "🎰", "🎰"]);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;

  async function spin() {
    if (spinning || stake <= 0) return;
    setSpinning(true);
    setResult(null);
    spinSfx();
    setLastStake(stake);
    try {
      const res = await apiPost<SlotResult>("/slots/spin", { player_id: currentPlayerId, stake });
      await new Promise(r => setTimeout(r, 1800));
      setDisplayReels(res.reels);
      setResult(res);
      refetch();
      recordRound("Slots", res.net_delta);
      res.won ? win() : lose();
    } finally {
      setSpinning(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Slots</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        {/* Machine */}
        <div className="card-surface p-8 flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="flex gap-3">
            {displayReels.map((sym, i) => (
              <Reel key={i} symbol={sym} spinning={spinning} delay={i * 0.22} />
            ))}
          </div>
          <div className="w-full h-px bg-gold-500/30" />
          <AnimatePresence>
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.7, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="text-center"
              >
                {result.won ? (
                  <>
                    <motion.p
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="font-display text-2xl text-gold-400 font-bold"
                    >
                      {result.multiplier}× Win! 🎉
                    </motion.p>
                    <p className="text-green-400 font-semibold mt-1">+{result.net_delta.toLocaleString()} chips</p>
                  </>
                ) : (
                  <p className="text-ivory/40 text-sm">No match · Try again</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Paytable */}
        <div className="card-surface p-4 w-full max-w-sm">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3 text-center">Paytable · 3 of a kind</p>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(PAYOUTS).map(([sym, mult]) => (
              <div key={sym} className="text-center bg-navy-900/60 rounded-lg py-2">
                <span className="text-2xl">{sym}</span>
                <p className="text-gold-400 text-xs font-bold mt-0.5">{mult}×</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="card-surface p-6 w-full max-w-sm flex flex-col items-center gap-4">
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

          {/* Chip buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            {CHIP_VALUES.map(v => (
              <Chip key={v} value={v} size="sm" disabled={spinning || stake + v > balance} onClick={() => setStake(s => s + v)} />
            ))}
            {balance > 5000 && (
              <button
                onClick={() => setStake(balance)}
                disabled={spinning || stake >= balance}
                className={cn(
                  "px-3 h-8 rounded-full font-bold text-[10px] border-2 transition-all disabled:opacity-30",
                  "border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400 hover:border-gold-400/60"
                )}
              >
                All In
              </button>
            )}
          </div>

          {/* Re-bet row */}
          {lastStake > 0 && (
            <div className="flex gap-2 w-full">
              <button onClick={() => setStake(lastStake)} disabled={spinning || lastStake > balance}
                className="flex-1 py-1.5 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
              </button>
              <button onClick={() => setStake(Math.max(1, Math.floor(lastStake / 2)))} disabled={spinning}
                className="flex-1 py-1.5 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ½
              </button>
              <button onClick={() => setStake(lastStake * 2)} disabled={spinning || lastStake * 2 > balance}
                className="flex-1 py-1.5 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ×2
              </button>
            </div>
          )}

          {/* Clear + Spin */}
          <div className="flex gap-3 w-full">
            <button onClick={() => setStake(0)} disabled={stake === 0 || spinning} className="btn-ghost flex-1 text-sm py-2">
              Clear
            </button>
            <button onClick={spin} disabled={spinning || stake <= 0 || stake > balance} className="btn-primary flex-1 text-lg py-3">
              {spinning ? "Spinning…" : `🎰 Spin · ${stake.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
