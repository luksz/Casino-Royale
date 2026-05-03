import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { apiPost } from "@/lib/api";
import { PlayingCard } from "@/components/cards/PlayingCard";

interface WarResult { player_card: string; dealer_card: string; result: string; war_player_card: string | null; war_dealer_card: string | null; net_delta: number; new_balance: number }

const STAKES = [10, 25, 100, 250];
const RESULT_MSGS: Record<string, { text: string; color: string }> = {
  WIN:      { text: "You Win! ✨", color: "text-green-400" },
  LOSE:     { text: "Dealer Wins", color: "text-red-400" },
  WAR_WIN:  { text: "War — You Win! ⚔️", color: "text-gold-400" },
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

  const msg = result ? RESULT_MSGS[result.result] : null;
  const isWar = result && (result.result === "WAR_WIN" || result.result === "WAR_LOSE");

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400">Casino War</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{(balanceData?.balance ?? 0).toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 max-w-md mx-auto w-full">
        <p className="text-ivory/30 text-sm text-center">Higher card wins. Ties go to War!</p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-8 w-full">
          {["YOU", "DEALER"].map((side, si) => (
            <div key={side} className="table-zone p-5 flex flex-col items-center gap-3">
              <p className="text-ivory/40 text-xs uppercase tracking-widest">{side}</p>
              <div className="flex flex-col items-center gap-2">
                {result ? (
                  <>
                    <PlayingCard code={si === 0 ? result.player_card : result.dealer_card} dealIndex={si} />
                    {isWar && (
                      <PlayingCard code={si === 0 ? (result.war_player_card ?? "??") : (result.war_dealer_card ?? "??")} dealIndex={si + 2} />
                    )}
                  </>
                ) : <div className="w-14 h-20 rounded-lg bg-navy-700 border-2 border-royal-600/30 flex items-center justify-center text-xl text-ivory/10">?</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && msg && (
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="card-surface px-8 py-4 text-center w-full">
              <p className={`font-display text-2xl font-bold ${msg.color}`}>{msg.text}</p>
              <p className={`text-lg font-semibold mt-1 ${result.net_delta > 0 ? "text-green-400" : result.net_delta < 0 ? "text-red-400" : "text-ivory"}`}>
                {result.net_delta > 0 ? `+${result.net_delta}` : result.net_delta} chips
              </p>
              {isWar && <p className="text-ivory/30 text-xs mt-2">Tie triggered War — second cards dealt</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {STAKES.map(s => (
              <button key={s} onClick={() => setStake(s)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all ${stake === s ? "border-gold-400 bg-gold-500/20 text-gold-400" : "border-navy-600 text-ivory/50"}`}>
                {s}
              </button>
            ))}
          </div>
          <button onClick={play} disabled={loading || stake > (balanceData?.balance ?? 0)} className="btn-primary w-full">
            {loading ? "Dealing…" : `⚔️ Go to War · ${stake} chips`}
          </button>
        </div>
      </div>
    </div>
  );
}
