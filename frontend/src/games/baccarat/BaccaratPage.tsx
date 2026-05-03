import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { apiPost } from "@/lib/api";
import { PlayingCard } from "@/components/cards/PlayingCard";

interface BaccaratResult { player_cards: string[]; banker_cards: string[]; player_score: number; banker_score: number; winner: string; bet: string; net_delta: number; new_balance: number }

const BETS = [
  { key: "PLAYER", label: "Player", odds: "1:1", color: "bg-royal-600 hover:bg-royal-500" },
  { key: "TIE",    label: "Tie",    odds: "8:1", color: "bg-purple-700 hover:bg-purple-600" },
  { key: "BANKER", label: "Banker", odds: "0.95:1", color: "bg-red-700 hover:bg-red-600" },
];

const STAKES = [10, 50, 100, 500];

export default function BaccaratPage() {
  const navigate = useNavigate();
  const { currentPlayerId } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const [selectedBet, setSelectedBet] = useState<string | null>(null);
  const [stake, setStake] = useState(50);
  const [result, setResult] = useState<BaccaratResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }

  async function play() {
    if (!selectedBet || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiPost<BaccaratResult>("/baccarat/play", { player_id: currentPlayerId, bet: selectedBet, stake });
      setResult(res);
      refetch();
    } finally {
      setLoading(false);
    }
  }

  const winnerColor = (side: string) => result?.winner === side ? "ring-2 ring-gold-400" : "";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400">Baccarat</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{(balanceData?.balance ?? 0).toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-8 px-4 max-w-2xl mx-auto w-full">
        {/* Hands */}
        <div className="grid grid-cols-2 gap-4 w-full">
          {["PLAYER", "BANKER"].map(side => (
            <div key={side} className={`table-zone p-5 flex flex-col items-center gap-3 ${winnerColor(side)}`}>
              <p className="text-ivory/40 text-xs uppercase tracking-widest">{side}</p>
              <div className="flex gap-1 min-h-[5rem] items-center">
                {result
                  ? (side === "PLAYER" ? result.player_cards : result.banker_cards).map((code, i) => (
                      <PlayingCard key={i} code={code} dealIndex={i} />
                    ))
                  : <span className="text-ivory/10 text-sm">—</span>
                }
              </div>
              {result && (
                <p className={`text-2xl font-black ${result.winner === side ? "text-gold-400" : "text-ivory/50"}`}>
                  {side === "PLAYER" ? result.player_score : result.banker_score}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="card-surface px-8 py-4 text-center w-full">
              <p className="font-display text-2xl text-gold-400 font-bold">{result.winner === "TIE" ? "Tie!" : `${result.winner} Wins`}</p>
              <p className={`text-lg font-semibold mt-1 ${result.net_delta > 0 ? "text-green-400" : result.net_delta < 0 ? "text-red-400" : "text-ivory"}`}>
                {result.net_delta > 0 ? `+${result.net_delta}` : result.net_delta} chips
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bet selection */}
        <div className="card-surface p-5 w-full">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3 text-center">Choose your bet</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {BETS.map(b => (
              <button key={b.key} onClick={() => setSelectedBet(b.key)}
                className={`${b.color} text-white font-semibold py-4 rounded-xl transition-all ${selectedBet === b.key ? "ring-2 ring-gold-400 scale-105" : ""}`}>
                <p>{b.label}</p>
                <p className="text-xs text-white/60 mt-1">{b.odds}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-2 justify-center mb-4">
            {STAKES.map(s => (
              <button key={s} onClick={() => setStake(s)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${stake === s ? "border-gold-400 bg-gold-500/20 text-gold-400" : "border-navy-600 text-ivory/50"}`}>
                {s}
              </button>
            ))}
          </div>

          <button onClick={play} disabled={!selectedBet || loading || stake > (balanceData?.balance ?? 0)}
            className="btn-primary w-full">
            {loading ? "Dealing…" : `Deal · ${stake} chips`}
          </button>
        </div>
      </div>
    </div>
  );
}
