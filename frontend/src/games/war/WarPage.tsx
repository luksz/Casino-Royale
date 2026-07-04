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

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];

export default function WarPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { cardDeal, win, lose } = useSound();
  const [stake, setStake] = useState(0);
  const [lastStake, setLastStake] = useState(0);
  const [result, setResult] = useState<WarResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const isWar = result && (result.result === "WAR_WIN" || result.result === "WAR_LOSE");
  const msg = result ? RESULT_MSGS[result.result] : null;

  const totalDealt = result ? (isWar ? 4 : 2) : 0;
  const resultDelay = totalDealt * 0.45 + 0.3;

  async function play() {
    if (loading || stake <= 0) return;
    setLoading(true);
    setResult(null);
    cardDeal();
    setLastStake(stake);
    try {
      const res = await apiPost<WarResult>("/war/play", { player_id: currentPlayerId, stake });
      setResult(res);
      refetch();
      recordRound("War", res.net_delta);
      res.net_delta > 0 ? win() : lose();
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
        <p className="text-ivory/30 text-sm text-center">Higher card wins. Ties go to War — an equal raise is at risk, so you need 2× your stake to play.</p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-6 w-full">
          {(["YOU", "DEALER"] as const).map((side, si) => {
            const firstCard = si === 0 ? result?.player_card     : result?.dealer_card;
            const warCard   = si === 0 ? result?.war_player_card  : result?.war_dealer_card;
            return (
              <div key={side} className="table-zone p-5 flex flex-col items-center gap-3">
                <p className="text-ivory/40 text-xs uppercase tracking-widest">{side}</p>
                <div className="flex flex-col items-center gap-2 min-h-[6rem] justify-center">
                  {firstCard
                    ? <>
                        <PlayingCard code={firstCard} dealIndex={si} />
                        {isWar && <PlayingCard code={warCard ?? "??"} dealIndex={si + 2} />}
                      </>
                    : <div className="w-16 h-24 rounded-xl border-2 border-dashed border-navy-600/50 flex items-center justify-center text-ivory/10 text-xs">?</div>
                  }
                </div>
              </div>
            );
          })}
        </div>

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
        <div className="card-surface p-6 w-full flex flex-col items-center gap-4">
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
              <Chip key={v} value={v} disabled={loading || (stake + v) * 2 > balance} onClick={() => setStake(s => s + v)} />
            ))}
            {balance > 5000 && (
              <button
                onClick={() => setStake(Math.floor(balance / 2))}
                disabled={loading || stake >= Math.floor(balance / 2)}
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
              <button onClick={() => setStake(lastStake)} disabled={loading || lastStake * 2 > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
              </button>
              <button onClick={() => setStake(Math.max(1, Math.floor(lastStake / 2)))} disabled={loading}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ½ Bet
              </button>
              <button onClick={() => setStake(lastStake * 2)} disabled={loading || lastStake * 4 > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ×2 Bet
              </button>
            </div>
          )}

          {/* Clear + Go */}
          <div className="flex gap-3 w-full">
            <button onClick={() => setStake(0)} disabled={stake === 0 || loading} className="btn-ghost flex-1 text-sm py-2">
              Clear{stake > 0 ? ` (${stake.toLocaleString()})` : ""}
            </button>
            <button onClick={play} disabled={loading || stake <= 0 || stake * 2 > balance} className="btn-primary flex-1 text-base py-3">
              {loading ? "Dealing…" : `⚔️ Go to War · ${stake.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
