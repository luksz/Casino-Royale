import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { apiPost } from "@/lib/api";
import { PlayingCard } from "@/components/cards/PlayingCard";

interface PokerState { round_id: string; phase: string; player_hand: string[]; bot_hand: string[]; stake: number; player_eval: string; bot_eval: string; winner: string; net_delta: number; new_balance: number | null }

const STAKES = [25, 50, 100, 250];
const WINNER_MSG: Record<string, { text: string; color: string }> = {
  PLAYER: { text: "You Win! 🃏", color: "text-green-400" },
  BOT:    { text: "Bot Wins",   color: "text-red-400" },
  TIE:    { text: "Tie — Push", color: "text-ivory" },
};

export default function PokerPage() {
  const navigate = useNavigate();
  const { currentPlayerId } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const [stake, setStake] = useState(50);
  const [state, setState] = useState<PokerState | null>(null);
  const [discards, setDiscards] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }

  const phase = state?.phase;
  const settled = phase === "SETTLED";

  async function deal() {
    setLoading(true);
    setState(null);
    setDiscards(new Set());
    try {
      const res = await apiPost<PokerState>("/poker/rounds", { player_id: currentPlayerId, stake });
      setState(res);
      refetch();
    } finally {
      setLoading(false);
    }
  }

  async function draw() {
    if (!state || loading) return;
    setLoading(true);
    try {
      const res = await apiPost<PokerState>(`/poker/rounds/${state.round_id}/draw`, { discard_indices: [...discards] });
      setState(res);
      setDiscards(new Set());
      refetch();
    } finally {
      setLoading(false);
    }
  }

  function toggleDiscard(i: number) {
    setDiscards(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const msg = settled && state?.winner ? WINNER_MSG[state.winner] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400">Five Card Draw</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{(balanceData?.balance ?? 0).toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-8 px-4 max-w-2xl mx-auto w-full">
        {/* Bot hand */}
        <div className="table-zone p-5 w-full flex flex-col items-center gap-3">
          <p className="text-ivory/40 text-xs uppercase tracking-widest">Opponent</p>
          <div className="flex gap-1">
            {state
              ? state.bot_hand.map((code, i) => <PlayingCard key={i} code={code} dealIndex={i} />)
              : <span className="text-ivory/10 text-sm">—</span>}
          </div>
          {settled && state?.bot_eval && <p className="text-ivory/50 text-sm">{state.bot_eval}</p>}
        </div>

        {/* Result */}
        <AnimatePresence>
          {settled && msg && (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="card-surface px-8 py-4 text-center w-full">
              <p className={`font-display text-2xl font-bold ${msg.color}`}>{msg.text}</p>
              <div className="flex justify-center gap-4 mt-1 text-sm text-ivory/50">
                <span>You: {state?.player_eval}</span>
                <span>·</span>
                <span>Bot: {state?.bot_eval}</span>
              </div>
              {state?.net_delta !== undefined && (
                <p className={`text-lg font-semibold mt-1 ${state.net_delta > 0 ? "text-green-400" : state.net_delta < 0 ? "text-red-400" : "text-ivory"}`}>
                  {state.net_delta > 0 ? `+${state.net_delta}` : state.net_delta} chips
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player hand */}
        <div className="table-zone p-5 w-full flex flex-col items-center gap-3">
          <p className="text-ivory/40 text-xs uppercase tracking-widest">
            {phase === "DRAW" ? "Click cards to discard, then draw" : "Your hand"}
          </p>
          <div className="flex gap-2">
            {state
              ? state.player_hand.map((code, i) => (
                  <motion.button
                    key={`${code}-${i}`}
                    onClick={() => phase === "DRAW" && toggleDiscard(i)}
                    animate={{ y: discards.has(i) ? 12 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative rounded-lg transition-all ${discards.has(i) ? "opacity-60" : ""}`}
                    disabled={phase !== "DRAW"}
                  >
                    <PlayingCard code={code} dealIndex={i} />
                    {discards.has(i) && (
                      <div className="absolute inset-0 bg-red-500/30 rounded-lg flex items-center justify-center">
                        <span className="text-red-300 font-black text-xs">DISCARD</span>
                      </div>
                    )}
                  </motion.button>
                ))
              : <span className="text-ivory/10 text-sm">—</span>}
          </div>
          {settled && state?.player_eval && <p className="text-ivory/50 text-sm">{state.player_eval}</p>}
        </div>

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-3">
          {!state || settled ? (
            <>
              <div className="flex gap-2">
                {STAKES.map(s => (
                  <button key={s} onClick={() => setStake(s)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${stake === s ? "border-gold-400 bg-gold-500/20 text-gold-400" : "border-navy-600 text-ivory/50"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={deal} disabled={loading || stake > (balanceData?.balance ?? 0)} className="btn-primary w-full">
                {loading ? "Dealing…" : `Deal · ${stake} chips`}
              </button>
            </>
          ) : (
            <button onClick={draw} disabled={loading} className="btn-primary w-full">
              {loading ? "Drawing…" : discards.size === 0 ? "Stand Pat (keep all)" : `Draw ${discards.size} card${discards.size > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
