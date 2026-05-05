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

interface StartResponse {
  round_id: string; current_card: string; stake: number;
  multiplier: number; potential_win: number;
}
interface PlayResponse {
  action: string; next_card: string | null; result: string;
  current_card: string | null; multiplier: number; potential_win: number;
  net_delta: number; round_over: boolean; new_balance: number | null;
}

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];

export default function HiLoPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { cardDeal, win, lose } = useSound();

  const [stake, setStake] = useState(0);
  const [lastStake, setLastStake] = useState(0);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<PlayResponse | null>(null);
  const [phase, setPhase] = useState<"betting" | "playing" | "done">("betting");

  if (!currentPlayerId) { navigate("/"); return null; }
  const balance = balanceData?.balance ?? 0;

  async function startRound() {
    if (stake <= 0 || loading) return;
    setLoading(true);
    setLastResult(null);
    cardDeal();
    setLastStake(stake);
    try {
      const res = await apiPost<StartResponse>("/hilo/rounds", { player_id: currentPlayerId, stake });
      setRoundId(res.round_id);
      setCurrentCard(res.current_card);
      setMultiplier(res.multiplier);
      setStreak(0);
      setPhase("playing");
      refetch();
    } finally {
      setLoading(false);
    }
  }

  async function play(action: string) {
    if (!roundId || loading) return;
    setLoading(true);
    try {
      const res = await apiPost<PlayResponse>(`/hilo/rounds/${roundId}/play`, { action });
      setLastResult(res);
      setMultiplier(res.multiplier);

      if (res.result === "WIN") {
        cardDeal();
        setCurrentCard(res.current_card);
        setStreak(s => s + 1);
      } else if (res.result === "TIE") {
        cardDeal();
        setCurrentCard(res.current_card);
      }

      if (res.round_over) {
        setPhase("done");
        setRoundId(null);
        recordRound("Hi-Lo", res.net_delta);
        refetch();
        res.net_delta > 0 ? win() : (res.net_delta < 0 ? lose() : undefined);
      }
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase("betting");
    setCurrentCard(null);
    setMultiplier(1);
    setStreak(0);
    setLastResult(null);
    setRoundId(null);
  }

  const potentialWin = Math.floor(stake * multiplier) - stake;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Hi-Lo</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-6 py-8 px-4 max-w-md mx-auto w-full">

        {/* Card display */}
        <div className="table-zone p-8 w-full flex flex-col items-center gap-4 min-h-[180px] justify-center">
          {currentCard ? (
            <>
              <PlayingCard code={currentCard} static />
              <div className="flex items-center gap-4 text-sm">
                <span className="text-ivory/40">Multiplier</span>
                <motion.span
                  key={multiplier}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-gold-400 font-black text-xl"
                >
                  {multiplier.toFixed(2)}×
                </motion.span>
                {streak > 0 && (
                  <span className="text-green-400 text-xs font-semibold">
                    🔥 {streak} in a row
                  </span>
                )}
              </div>
              {potentialWin > 0 && (
                <p className="text-ivory/30 text-xs">
                  Cash out now: <span className="text-green-400 font-semibold">+{potentialWin.toLocaleString()}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-ivory/20 text-sm uppercase tracking-widest">
              {phase === "done" ? "Round over" : "Deal a card to start"}
            </p>
          )}
        </div>

        {/* Last result flash */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              key={lastResult.result + lastResult.multiplier}
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className={cn(
                "card-surface px-8 py-4 text-center w-full",
              )}
            >
              {lastResult.result === "WIN" && (
                <>
                  <p className="text-green-400 font-display text-2xl font-bold">Correct! ✓</p>
                  <p className="text-ivory/50 text-sm mt-1">
                    Next card: <span className="text-ivory font-semibold">{lastResult.next_card}</span>
                    · multiplier now <span className="text-gold-400 font-bold">{lastResult.multiplier.toFixed(2)}×</span>
                  </p>
                </>
              )}
              {lastResult.result === "TIE" && (
                <>
                  <p className="text-ivory font-display text-2xl font-bold">Tie — free look</p>
                  <p className="text-ivory/50 text-sm mt-1">Same rank, no change</p>
                </>
              )}
              {lastResult.result === "CASHOUT" && (
                <>
                  <p className="text-gold-400 font-display text-2xl font-bold">Cashed Out</p>
                  <p className={`text-xl font-semibold mt-1 ${lastResult.net_delta >= 0 ? "text-green-400" : "text-ivory/50"}`}>
                    {lastResult.net_delta >= 0 ? `+${lastResult.net_delta.toLocaleString()}` : lastResult.net_delta.toLocaleString()} chips
                  </p>
                </>
              )}
              {lastResult.result === "LOSE" && (
                <>
                  <p className="text-red-400 font-display text-2xl font-bold">Wrong! ✗</p>
                  <p className="text-ivory/50 text-sm mt-1">
                    {lastResult.next_card && <>Card was <span className="text-ivory font-semibold">{lastResult.next_card}</span></>}
                  </p>
                  <p className="text-red-400 font-semibold mt-1">{lastResult.net_delta.toLocaleString()} chips</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-4">
          {phase === "betting" ? (
            <>
              <p className="text-ivory/50 text-xs uppercase tracking-widest">Place your stake</p>
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
                  <Chip key={v} value={v} disabled={loading || stake + v > balance} onClick={() => setStake(s => s + v)} />
                ))}
                {balance > 5000 && (
                  <button onClick={() => setStake(balance)} disabled={loading || stake >= balance}
                    className="px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30 border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400">
                    All In
                  </button>
                )}
              </div>
              {lastStake > 0 && (
                <div className="flex gap-2 w-full">
                  <button onClick={() => setStake(lastStake)} disabled={loading || lastStake > balance}
                    className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                    Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
                  </button>
                  <button onClick={() => setStake(Math.max(1, Math.floor(lastStake / 2)))} disabled={loading}
                    className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                    ½
                  </button>
                  <button onClick={() => setStake(lastStake * 2)} disabled={loading || lastStake * 2 > balance}
                    className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                    ×2
                  </button>
                </div>
              )}
              <div className="flex gap-3 w-full">
                <button onClick={() => setStake(0)} disabled={stake === 0 || loading} className="btn-ghost flex-1 text-sm py-2">Clear</button>
                <button onClick={startRound} disabled={stake <= 0 || loading || stake > balance} className="btn-primary flex-1 text-base py-3">
                  {loading ? "Dealing…" : `Deal · ${stake.toLocaleString()}`}
                </button>
              </div>
            </>
          ) : phase === "playing" ? (
            <>
              <p className="text-ivory/40 text-xs uppercase tracking-widest">Will the next card be…</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => play("HIGHER")}
                  disabled={loading}
                  className="py-4 rounded-xl bg-green-700 hover:bg-green-600 border-2 border-green-500 text-white font-black text-lg transition-all disabled:opacity-50 active:scale-95"
                >
                  ↑ Higher
                </button>
                <button
                  onClick={() => play("HIGHER_EQ")}
                  disabled={loading}
                  className="py-4 rounded-xl bg-green-900 hover:bg-green-800 border-2 border-green-700 text-green-300 font-black text-lg transition-all disabled:opacity-50 active:scale-95"
                >
                  ↑ Higher or Same
                </button>
                <button
                  onClick={() => play("LOWER")}
                  disabled={loading}
                  className="py-4 rounded-xl bg-red-700 hover:bg-red-600 border-2 border-red-500 text-white font-black text-lg transition-all disabled:opacity-50 active:scale-95"
                >
                  ↓ Lower
                </button>
                <button
                  onClick={() => play("LOWER_EQ")}
                  disabled={loading}
                  className="py-4 rounded-xl bg-red-900 hover:bg-red-800 border-2 border-red-700 text-red-300 font-black text-lg transition-all disabled:opacity-50 active:scale-95"
                >
                  ↓ Lower or Same
                </button>
              </div>
              {multiplier > 1 && (
                <button
                  onClick={() => play("CASHOUT")}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gold-600/20 hover:bg-gold-600/30 border-2 border-gold-500/50 text-gold-400 font-black text-base transition-all disabled:opacity-50"
                >
                  💰 Cash Out · +{potentialWin.toLocaleString()} chips
                </button>
              )}
            </>
          ) : (
            <button onClick={reset} className="btn-primary w-full text-base py-3">
              New Round
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
