import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { Chip } from "@/components/casino/Chip";
import { ChipStack } from "@/components/casino/ChipStack";
import { cn } from "@/lib/utils";

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

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];

export default function PokerPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { cardDeal, win, lose } = useSound();
  const [stake, setStake] = useState(0);
  const [lastStake, setLastStake] = useState(0);
  const [state, setState] = useState<PokerState | null>(null);
  const [discards, setDiscards] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const phase = state?.phase;
  const settled = phase === "SETTLED";
  const msg = settled && state?.winner ? WINNER_MSG[state.winner] : null;

  async function deal() {
    if (stake <= 0) return;
    setLoading(true);
    setState(null);
    setDiscards(new Set());
    cardDeal();
    setLastStake(stake);
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
                  <PlayingCard key={i} code={settled ? code : "??"} faceDown={!settled} dealIndex={i} />
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
        <div className="card-surface p-6 w-full flex flex-col items-center gap-4">
          {!state || settled ? (
            <>
              {/* Stake display */}
              <div className="flex items-center gap-3 min-h-[40px]">
                {stake > 0 ? (
                  <>
                    <ChipStack amount={stake} size={36} />
                    <span className="font-display text-3xl text-gold-400 font-bold tabular-nums">{stake.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="font-display text-3xl text-ivory/20 font-bold">Ante</span>
                )}
              </div>

              {/* Chip buttons */}
              <div className="flex gap-2 flex-wrap justify-center">
                {CHIP_VALUES.map(v => (
                  <Chip key={v} value={v} disabled={loading || stake + v > balance} onClick={() => setStake(s => s + v)} />
                ))}
                {balance > 5000 && (
                  <button
                    onClick={() => setStake(balance)}
                    disabled={loading || stake >= balance}
                    className={cn(
                      "px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30",
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
                  <button onClick={() => setStake(lastStake)} disabled={loading || lastStake > balance}
                    className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                    Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
                  </button>
                  <button onClick={() => setStake(Math.max(1, Math.floor(lastStake / 2)))} disabled={loading}
                    className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                    ½ Bet
                  </button>
                  <button onClick={() => setStake(lastStake * 2)} disabled={loading || lastStake * 2 > balance}
                    className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                    ×2 Bet
                  </button>
                </div>
              )}

              {/* Clear + Deal */}
              <div className="flex gap-3 w-full">
                <button onClick={() => setStake(0)} disabled={stake === 0 || loading} className="btn-ghost flex-1 text-sm py-2">
                  Clear{stake > 0 ? ` (${stake.toLocaleString()})` : ""}
                </button>
                <button onClick={deal} disabled={loading || stake <= 0 || stake > balance} className="btn-primary flex-1 text-base py-4">
                  {loading ? "Dealing…" : `Deal · ${stake.toLocaleString()}`}
                </button>
              </div>
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
