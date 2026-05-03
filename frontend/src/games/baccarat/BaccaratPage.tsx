import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { PlayingCard } from "@/components/cards/PlayingCard";
import { BetInput } from "@/components/casino/BetInput";

type BaccaratResult = {
  player_cards: string[];
  banker_cards: string[];
  player_score: number;
  banker_score: number;
  winner: string;
  bet: string;
  stake: number;
  net_delta: number;
  new_balance: number;
};

const BETS = [
  { key: "PLAYER", label: "Player", odds: "1 : 1",    color: "bg-royal-700 hover:bg-royal-600 border-royal-500" },
  { key: "TIE",    label: "Tie",    odds: "8 : 1",    color: "bg-purple-800 hover:bg-purple-700 border-purple-600" },
  { key: "BANKER", label: "Banker", odds: "0.95 : 1", color: "bg-red-800 hover:bg-red-700 border-red-600" },
];

// Real baccarat deal order: P1 B1 P2 B2 [P3] [B3]
function playerDealIndex(i: number) { return i * 2; }
function bankerDealIndex(i: number) { return i * 2 + 1; }

export default function BaccaratPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { cardDeal, win, lose } = useSound();
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const [stake, setStake] = useState(50);
  const [result, setResult] = useState<BaccaratResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;

  async function play() {
    if (!selectedBet || loading) return;
    setLoading(true);
    setResult(null);
    cardDeal();
    try {
      const res = await apiPost<BaccaratResult>("/baccarat/play", {
        player_id: currentPlayerId,
        bet: selectedBet,
        stake,
      });
      setResult(res);
      refetch();
      recordRound("Baccarat", res.net_delta);
      res.net_delta > 0 ? win() : lose();
    } finally {
      setLoading(false);
    }
  }

  const winnerRing = (side: string) =>
    result?.winner === side ? "ring-2 ring-gold-400 shadow-gold-400/20 shadow-lg" : "";

  const totalCards = result ? result.player_cards.length + result.banker_cards.length : 0;
  const resultDelay = totalCards * 0.45 + 0.3;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Baccarat</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-8 px-4 max-w-2xl mx-auto w-full">

        <div className="grid grid-cols-2 gap-4 w-full">
          {(["PLAYER", "BANKER"] as const).map((side) => {
            const cards = side === "PLAYER" ? (result?.player_cards ?? []) : (result?.banker_cards ?? []);
            const score = side === "PLAYER" ? result?.player_score : result?.banker_score;
            const idxFn = side === "PLAYER" ? playerDealIndex : bankerDealIndex;
            return (
              <div key={side} className={`table-zone p-5 flex flex-col items-center gap-3 transition-all duration-500 ${winnerRing(side)}`}>
                <p className="text-ivory/40 text-xs uppercase tracking-widest">{side}</p>
                <div className="flex gap-2 min-h-[6rem] items-center justify-center flex-wrap">
                  {cards.length > 0
                    ? cards.map((code, i) => <PlayingCard key={code + i} code={code} dealIndex={idxFn(i)} />)
                    : <div className="w-16 h-24 rounded-xl border-2 border-dashed border-navy-600/50 flex items-center justify-center text-ivory/10 text-xs">?</div>
                  }
                </div>
                <AnimatePresence>
                  {score !== undefined && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: resultDelay }}
                      className={`text-3xl font-black ${result?.winner === side ? "text-gold-400" : "text-ivory/40"}`}
                    >
                      {score}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: resultDelay + 0.2, type: "spring", stiffness: 260, damping: 22 }}
              className="card-surface px-8 py-5 text-center w-full"
            >
              <p className="font-display text-3xl font-bold text-gold-400">
                {result.winner === "TIE" ? "Tie!" : `${result.winner} Wins`}
              </p>
              <p className={`text-xl font-semibold mt-1 ${result.net_delta > 0 ? "text-green-400" : result.net_delta < 0 ? "text-red-400" : "text-ivory/60"}`}>
                {result.net_delta > 0 ? `+${result.net_delta}` : result.net_delta} chips
              </p>
              <p className="text-ivory/30 text-xs mt-2">
                You bet <span className="text-ivory/50">{result.stake.toLocaleString()}</span> on <span className="text-ivory/50">{result.bet}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="card-surface p-6 w-full flex flex-col items-center gap-5">
          <div className="grid grid-cols-3 gap-3 w-full">
            {BETS.map(b => (
              <button key={b.key} onClick={() => setSelectedBet(b.key)} disabled={loading}
                className={`border-2 rounded-xl py-4 text-white font-semibold transition-all duration-150
                            ${b.color} ${selectedBet === b.key ? "ring-2 ring-gold-400 scale-105 shadow-lg" : "opacity-70 hover:opacity-100"}`}>
                <p className="text-base">{b.label}</p>
                <p className="text-xs text-white/50 mt-0.5">{b.odds}</p>
              </button>
            ))}
          </div>

          <BetInput value={stake} onChange={setStake} max={balance} disabled={loading} label="Stake" />

          <button onClick={play} disabled={!selectedBet || loading || stake > balance || stake < 1}
            className="btn-primary w-full text-base py-4">
            {loading ? "Dealing…" : `Deal · ${stake.toLocaleString()} chips`}
          </button>
        </div>
      </div>
    </div>
  );
}
