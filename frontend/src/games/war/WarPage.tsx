import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { apiPost } from "@/lib/api";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { BetInput } from "@/components/casino/BetInput";

interface WarResult {
  player_card: string;
  dealer_card: string;
  result: string;
  war_player_card: string | null;
  war_dealer_card: string | null;
  net_delta: number;
  new_balance: number;
}

const RESULT_MSGS: Record<string, { text: string; color: string }> = {
  WIN:      { text: "You Win! ✨",          color: "text-green-400" },
  LOSE:     { text: "Dealer Wins",          color: "text-red-400" },
  WAR_WIN:  { text: "War — You Win! ⚔️",   color: "text-gold-400" },
  WAR_LOSE: { text: "War — Dealer Wins ⚔️", color: "text-red-400" },
};

export default function WarPage() {
  const navigate = useNavigate();
  const { currentPlayerId } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const [stake, setStake] = useState(25);
  const [result, setResult] = useState<WarResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const isWar = result && (result.result === "WAR_WIN" || result.result === "WAR_LOSE");
  const msg = result ? RESULT_MSGS[result.result] : null;

  // Result delay: base cards dealt at index 0/1, war cards at 2/3
  const totalDealt = result ? (isWar ? 4 : 2) : 0;
  const resultDelay = totalDealt * 0.45 + 0.3;

  async function play() {
    setLoading(true);
    setResult(null);
    try {
      const res = await apiPost<WarResult>("/war/play", { player_id: currentPlayerId, stake });
      setResult(res);
      refetch();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Casino War</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-6 py-8 px-4 max-w-lg mx-auto w-full">
        <p className="text-ivory/30 text-sm text-center">Higher card wins. Ties go to War!</p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-6 w-full">
          {(["YOU", "DEALER"] as const).map((side, si) => {
            const firstCard  = si === 0 ? result?.player_card     : result?.dealer_card;
            const warCard    = si === 0 ? result?.war_player_card  : result?.war_dealer_card;
            return (
              <div key={side} className="table-zone p-5 flex flex-col items-center gap-3">
                <p className="text-ivory/40 text-xs uppercase tracking-widest">{side}</p>
                <div className="flex flex-col items-center gap-2 min-h-[6rem] justify-center">
                  {firstCard
                    ? <>
                        <PlayingCard code={firstCard} dealIndex={si} />
                        {isWar && (
                          <PlayingCard code={warCard ?? "??"} dealIndex={si + 2} />
                        )}
                      </>
                    : <div className="w-16 h-24 rounded-xl border-2 border-dashed border-navy-600/50 flex items-center justify-center text-ivory/10 text-xs">?</div>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* War banner */}
        <AnimatePresence>
          {isWar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 * 2 + 0.15, type: "spring", stiffness: 300, damping: 20 }}
              className="text-center"
            >
              <p className="font-display text-xl text-gold-400 font-bold tracking-widest">⚔️ WAR ⚔️</p>
              <p className="text-ivory/30 text-xs mt-1">Tie — burn three, deal again</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && msg && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: resultDelay, type: "spring", stiffness: 260, damping: 22 }}
              className="card-surface px-8 py-5 text-center w-full"
            >
              <p className={`font-display text-3xl font-bold ${msg.color}`}>{msg.text}</p>
              <p className={`text-xl font-semibold mt-1 ${result.net_delta > 0 ? "text-green-400" : result.net_delta < 0 ? "text-red-400" : "text-ivory/60"}`}>
                {result.net_delta > 0 ? `+${result.net_delta}` : result.net_delta} chips
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="card-surface p-6 w-full flex flex-col items-center gap-5">
          <BetInput value={stake} onChange={setStake} max={balance} disabled={loading} label="Stake" />
          <button
            onClick={play}
            disabled={loading || stake > balance || stake < 1}
            className="btn-primary w-full text-base py-4"
          >
            {loading ? "Dealing…" : `⚔️ Go to War · ${stake.toLocaleString()} chips`}
          </button>
        </div>
      </div>
    </div>
  );
}
