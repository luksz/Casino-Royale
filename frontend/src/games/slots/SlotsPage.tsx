import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { apiPost } from "@/lib/api";
import { BetInput } from "@/components/casino/BetInput";

interface SlotResult { reels: string[]; won: boolean; multiplier: number; net_delta: number; new_balance: number }

const SYMBOLS = ["🍒", "🍋", "🍇", "⭐", "💎", "7️⃣"];
const PAYOUTS: Record<string, number> = { "🍒": 2, "🍋": 3, "🍇": 5, "⭐": 10, "💎": 25, "7️⃣": 100 };

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
  const { currentPlayerId } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const [stake, setStake] = useState(10);
  const [result, setResult] = useState<SlotResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState(["🎰", "🎰", "🎰"]);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await apiPost<SlotResult>("/slots/spin", { player_id: currentPlayerId, stake });
      // Wait for all three reels to finish animating (last reel stops at ~1.2 + 0.3 = 1.5s)
      await new Promise(r => setTimeout(r, 1800));
      setDisplayReels(res.reels);
      setResult(res);
      refetch();
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

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
        {/* Machine */}
        <div className="card-surface p-8 flex flex-col items-center gap-6 w-full max-w-sm">
          {/* Reels */}
          <div className="flex gap-3">
            {displayReels.map((sym, i) => (
              <Reel key={i} symbol={sym} spinning={spinning} delay={i * 0.22} />
            ))}
          </div>

          {/* Win line */}
          <div className="w-full h-px bg-gold-500/30" />

          {/* Result */}
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
          <BetInput value={stake} onChange={setStake} max={balance} disabled={spinning} label="Stake" />
          <button
            onClick={spin}
            disabled={spinning || stake > balance || stake < 1}
            className="btn-primary w-full text-lg py-4"
          >
            {spinning ? "Spinning…" : `🎰 Spin · ${stake.toLocaleString()} chips`}
          </button>
        </div>
      </div>
    </div>
  );
}
