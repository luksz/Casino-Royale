import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { BetInput } from "@/components/casino/BetInput";

interface PokerState {
  round_id: string;
  phase: string;
  player_hand: string[];
  bot_hand: string[];
  stake: number;
  player_eval: string;
  bot_eval: string;
  winner: string;
  net_delta: number;
  new_balance: number | null;
}

const WINNER_MSG: Record<string, { text: string; color: string }> = {
  PLAYER: { text: "You Win! 🃏", color: "text-green-400" },
  BOT:    { text: "Bot Wins",   color: "text-red-400" },
  TIE:    { text: "Tie — Push", color: "text-ivory" },
};

export default function PokerPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { cardDeal, win, lose } = useSound();
  const [stake, setStake] = useState(50);
  const [state, setState] = useState<PokerState | null>(null);
  const [discards, setDiscards] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const phase = state?.phase;
  const settled = phase === "SETTLED";
  const msg = settled && state?.winner ? WINNER_MSG[state.winner] : null;

  async function deal() {
    setLoading(true);
    setState(null);
    setDiscards(new Set());
    cardDeal();
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
    cardDeal();
    try {
      const res = await apiPost<PokerState>(`/poker/rounds/${state.round_id}/draw`, { discard_indices: [...discards] });
      setState(res);
      setDiscards(new Set());
      refetch();
      if (res.phase === "SETTLED") {
        recordRound("Poker", res.net_delta);
        res.net_delta > 0 ? win() : lose();
      }
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Five Card Draw</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-8 px-4 max-w-2xl mx-auto w-full">

        {/* Bot hand */}
        <div className="table-zone p-5 w-full flex flex-col items-center gap-3">
          <p className="text-ivory/40 text-xs uppercase tracking-widest">Opponent</p>
          <div className="flex gap-2 min-h-[6rem] items-center justify-center">
            {state
              ? state.bot_hand.map((code, i) => (
                  <PlayingCard
                    key={i}
                    code={settled ? code : "??"}
                    faceDown={!settled}
                    dealIndex={i}
                  />
                ))
              : <span className="text-ivory/10 text-sm">—</span>}
          </div>
          <AnimatePresence>
            {settled && state?.bot_eval && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 5 * 0.45 + 0.2 }}
                className="text-ivory/50 text-sm"
              >
                {state.bot_eval}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Result */}
        <AnimatePresence>
          {settled && msg && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 5 * 0.45 + 0.4, type: "spring", stiffness: 260, damping: 22 }}
              className="card-surface px-8 py-5 text-center w-full"
            >
              <p className={`font-display text-3xl font-bold ${msg.color}`}>{msg.text}</p>
              <div className="flex justify-center gap-4 mt-1 text-sm text-ivory/50">
                <span>You: {state?.player_eval}</span>
                <span>·</span>
                <span>Bot: {state?.bot_eval}</span>
              </div>
              {state?.net_delta !== undefined && (
                <p className={`text-xl font-semibold mt-2 ${state.net_delta > 0 ? "text-green-400" : state.net_delta < 0 ? "text-red-400" : "text-ivory/60"}`}>
                  {state.net_delta > 0 ? `+${state.net_delta}` : state.net_delta} chips
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player hand */}
        <div className="table-zone p-5 w-full flex flex-col items-center gap-3">
          <p className="text-ivory/40 text-xs uppercase tracking-widest">
            {phase === "DRAW" ? "Tap cards to discard, then draw" : "Your hand"}
          </p>
          <div className="flex gap-2 min-h-[6rem] items-center justify-center flex-wrap">
            {state
              ? state.player_hand.map((code, i) => (
                  <motion.button
                    key={`${code}-${i}`}
                    onClick={() => phase === "DRAW" && toggleDiscard(i)}
                    animate={{ y: discards.has(i) ? 16 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative rounded-xl transition-all ${phase !== "DRAW" ? "cursor-default" : "cursor-pointer"}`}
                    disabled={phase !== "DRAW"}
                  >
                    <PlayingCard code={code} dealIndex={i} />
                    <AnimatePresence>
                      {discards.has(i) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-red-500/40 rounded-xl flex items-center justify-center"
                        >
                          <span className="text-red-200 font-black text-xs tracking-widest">DISCARD</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))
              : <span className="text-ivory/10 text-sm">—</span>}
          </div>
          {settled && state?.player_eval && (
            <p className="text-ivory/50 text-sm">{state.player_eval}</p>
          )}
        </div>

        {/* Controls */}
        <div className="card-surface p-6 w-full flex flex-col items-center gap-5">
          {!state || settled ? (
            <>
              <BetInput value={stake} onChange={setStake} max={balance} disabled={loading} label="Ante" />
              <button
                onClick={deal}
                disabled={loading || stake > balance || stake < 1}
                className="btn-primary w-full text-base py-4"
              >
                {loading ? "Dealing…" : `Deal · ${stake.toLocaleString()} chips`}
              </button>
            </>
          ) : (
            <button onClick={draw} disabled={loading} className="btn-primary w-full text-base py-4">
              {loading
                ? "Drawing…"
                : discards.size === 0
                  ? "Stand Pat · Keep all"
                  : `Draw ${discards.size} card${discards.size > 1 ? "s" : ""}`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
