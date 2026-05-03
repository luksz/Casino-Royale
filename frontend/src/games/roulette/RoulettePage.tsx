import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { apiPost } from "@/lib/api";
interface BetEntry { bet_type: string; amount: number; number?: number }
interface SpinResult { winning_number: number; is_red: boolean; is_black: boolean; net_delta: number; new_balance: number; payouts: { bet_type: string; won: boolean; delta: number }[] }

const OUTSIDE_BETS = [
  { label: "Red", key: "RED", color: "bg-red-600 hover:bg-red-500" },
  { label: "Black", key: "BLACK", color: "bg-gray-800 hover:bg-gray-700 border border-gray-600" },
  { label: "Odd", key: "ODD", color: "bg-navy-600 hover:bg-navy-500" },
  { label: "Even", key: "EVEN", color: "bg-navy-600 hover:bg-navy-500" },
  { label: "1–18", key: "LOW", color: "bg-navy-600 hover:bg-navy-500" },
  { label: "19–36", key: "HIGH", color: "bg-navy-600 hover:bg-navy-500" },
  { label: "1st 12", key: "DOZEN_FIRST", color: "bg-purple-700 hover:bg-purple-600" },
  { label: "2nd 12", key: "DOZEN_SECOND", color: "bg-purple-700 hover:bg-purple-600" },
  { label: "3rd 12", key: "DOZEN_THIRD", color: "bg-purple-700 hover:bg-purple-600" },
];

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const CHIP_VALUES = [1, 5, 25, 100];

export default function RoulettePage() {
  const navigate = useNavigate();
  const { currentPlayerId } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [ballAngle, setBallAngle] = useState(0);

  if (!currentPlayerId) { navigate("/"); return null; }

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  function addBet(type: string, num?: number) {
    setBets(prev => {
      const idx = prev.findIndex(b => b.bet_type === type && b.number === num);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], amount: next[idx].amount + selectedChip };
        return next;
      }
      return [...prev, { bet_type: type, amount: selectedChip, number: num }];
    });
  }

  async function spin() {
    if (bets.length === 0 || spinning) return;
    setSpinning(true);
    setResult(null);
    setBallAngle(prev => prev + 1440 + Math.random() * 360);
    try {
      const res = await apiPost<SpinResult>("/roulette/spin", { player_id: currentPlayerId, bets });
      await new Promise(r => setTimeout(r, 1800));
      setResult(res);
      setBets([]);
      refetch();
    } finally {
      setSpinning(false);
    }
  }

  const winColor = (n: number) => n === 0 ? "bg-green-700" : RED_NUMS.has(n) ? "bg-red-600" : "bg-gray-900";

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400">Roulette</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{(balanceData?.balance ?? 0).toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-6 px-4 max-w-3xl mx-auto w-full">
        {/* Wheel visual */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ rotate: ballAngle }}
            transition={{ duration: 1.8, ease: [0.2, 0.8, 0.4, 1] }}
            className="w-32 h-32 rounded-full border-4 border-gold-500/40 bg-navy-800 flex items-center justify-center text-5xl shadow-2xl"
          >
            🎡
          </motion.div>
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`absolute w-16 h-16 rounded-full ${winColor(result.winning_number)} flex items-center justify-center shadow-xl border-2 border-gold-400`}
              >
                <span className="text-white font-black text-xl">{result.winning_number}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Result banner */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="card-surface px-8 py-3 text-center w-full">
              <p className="text-ivory/60 text-sm">Number <span className={`font-black ${result.is_red ? "text-red-400" : result.winning_number === 0 ? "text-green-400" : "text-ivory"}`}>{result.winning_number}</span></p>
              <p className={`font-display text-2xl font-bold ${result.net_delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {result.net_delta >= 0 ? `+${result.net_delta}` : result.net_delta} chips
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Number grid */}
        <div className="card-surface p-4 w-full">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3 text-center">Click a number or outside bet · Chip: {selectedChip}</p>
          <div className="grid grid-cols-13 gap-0.5 mb-2" style={{ gridTemplateColumns: "repeat(13,1fr)" }}>
            {/* 0 */}
            <button onClick={() => addBet("STRAIGHT", 0)}
              className="bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded py-2 col-span-1 relative">
              0
              {bets.find(b => b.bet_type === "STRAIGHT" && b.number === 0) && (
                <span className="absolute top-0 right-0 bg-gold-400 text-navy-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-black leading-none">
                  {bets.find(b => b.bet_type === "STRAIGHT" && b.number === 0)!.amount}
                </span>
              )}
            </button>
            {Array.from({ length: 36 }, (_, i) => i + 1).map(n => {
              const bet = bets.find(b => b.bet_type === "STRAIGHT" && b.number === n);
              return (
                <button key={n} onClick={() => addBet("STRAIGHT", n)}
                  className={`${RED_NUMS.has(n) ? "bg-red-700 hover:bg-red-600" : "bg-gray-800 hover:bg-gray-700"} text-white text-xs font-bold rounded py-2 relative`}>
                  {n}
                  {bet && <span className="absolute top-0 right-0 bg-gold-400 text-navy-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-black leading-none">{bet.amount}</span>}
                </button>
              );
            })}
          </div>

          {/* Outside bets */}
          <div className="grid grid-cols-3 gap-1 mt-2">
            {OUTSIDE_BETS.map(b => {
              const placed = bets.find(bet => bet.bet_type === b.key);
              return (
                <button key={b.key} onClick={() => addBet(b.key)}
                  className={`${b.color} text-white text-xs font-bold py-2 rounded relative transition-colors`}>
                  {b.label}
                  {placed && <span className="ml-1 text-gold-400">({placed.amount})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chip selector + controls */}
        <div className="card-surface p-4 w-full flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {CHIP_VALUES.map(v => (
              <button key={v} onClick={() => setSelectedChip(v)}
                className={`w-12 h-12 rounded-full font-bold text-sm border-4 transition-all ${selectedChip === v ? "border-gold-400 bg-gold-500 text-navy-900 scale-110" : "border-gray-600 bg-gray-800 text-white"}`}>
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={() => setBets([])} disabled={bets.length === 0 || spinning} className="btn-ghost flex-1 text-sm py-2">Clear</button>
            <button onClick={spin} disabled={bets.length === 0 || spinning || totalBet > (balanceData?.balance ?? 0)}
              className="btn-primary flex-1 text-sm py-2">
              {spinning ? "Spinning…" : `Spin (${totalBet})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
