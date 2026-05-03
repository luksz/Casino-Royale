import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { apiPost } from "@/lib/api";

interface SlotResult { reels: string[]; won: boolean; multiplier: number; net_delta: number; new_balance: number }

const SYMBOLS = ["🍒", "🍋", "🍇", "⭐", "💎", "7"];
const PAYOUTS: Record<string, number> = { "🍒": 2, "🍋": 3, "🍇": 5, "⭐": 10, "💎": 25, "7": 100 };
const STAKES = [5, 10, 25, 50];

function Reel({ symbol, spinning, delay }: { symbol: string; spinning: boolean; delay: number }) {
  return (
    <div className="w-24 h-24 bg-navy-900 rounded-xl border-2 border-royal-600/30 flex items-center justify-center overflow-hidden relative shadow-inner">
      {spinning ? (
        <motion.div
          animate={{ y: [0, -200, 0, -200, 0] }}
          transition={{ duration: 0.6, delay, ease: "linear", repeat: 2 }}
          className="text-5xl"
        >
          {SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]}
        </motion.div>
      ) : (
        <motion.div
          key={symbol}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay }}
          className="text-5xl"
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

  async function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await apiPost<SlotResult>("/slots/spin", { player_id: currentPlayerId, stake });
      await new Promise(r => setTimeout(r, 1400));
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
        <h1 className="font-display text-2xl text-gold-400">Slots</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{(balanceData?.balance ?? 0).toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
        {/* Machine */}
        <div className="card-surface p-8 flex flex-col items-center gap-6">
          {/* Reels */}
          <div className="flex gap-3">
            {displayReels.map((sym, i) => (
              <Reel key={i} symbol={sym} spinning={spinning} delay={i * 0.15} />
            ))}
          </div>

          {/* Win line */}
          <div className="w-full h-0.5 bg-gold-500/20 relative">
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3/4 bg-gold-500/20 rounded-full" />
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center">
                {result.won ? (
                  <>
                    <motion.p animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.4 }}
                      className="font-display text-2xl text-gold-400 font-bold">
                      {result.multiplier}× Win! 🎉
                    </motion.p>
                    <p className="text-green-400 font-semibold">+{result.net_delta} chips</p>
                  </>
                ) : (
                  <p className="text-ivory/40 text-sm">No win · Try again</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Paytable */}
        <div className="card-surface p-4 w-full max-w-sm">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-2 text-center">Paytable (3 of a kind)</p>
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(PAYOUTS).map(([sym, mult]) => (
              <div key={sym} className="text-center bg-navy-900/50 rounded-lg py-2">
                <span className="text-2xl">{sym}</span>
                <p className="text-gold-400 text-xs font-bold">{mult}×</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="card-surface p-5 w-full max-w-sm flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {STAKES.map(s => (
              <button key={s} onClick={() => setStake(s)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${stake === s ? "border-gold-400 bg-gold-500/20 text-gold-400" : "border-navy-600 text-ivory/50"}`}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={spin} disabled={spinning || stake > (balanceData?.balance ?? 0)}
            className="btn-primary w-full text-lg py-4">
            {spinning ? "Spinning…" : "🎰 Spin"}
          </button>
        </div>
      </div>
    </div>
  );
}
