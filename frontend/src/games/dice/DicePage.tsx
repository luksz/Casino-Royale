import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { Chip } from "@/components/casino/Chip";
import { ChipStack } from "@/components/casino/ChipStack";
import { cn } from "@/lib/utils";

interface DiceResult {
  die1: number; die2: number; total: number; is_double: boolean;
  bet_type: string; won: boolean; push: boolean; net_delta: number; new_balance: number;
}

const BET_TYPES = [
  { key: "LOW",        label: "Low",    sub: "2 – 6",    odds: "1:1",  color: "bg-blue-700 hover:bg-blue-600 border-blue-500" },
  { key: "SEVEN",      label: "Seven",  sub: "Exactly 7", odds: "4:1", color: "bg-gold-600 hover:bg-gold-500 border-gold-400" },
  { key: "HIGH",       label: "High",   sub: "8 – 12",   odds: "1:1",  color: "bg-red-700 hover:bg-red-600 border-red-500" },
  { key: "ODD",        label: "Odd",    sub: "7 pushes",  odds: "1:1", color: "bg-purple-700 hover:bg-purple-600 border-purple-500" },
  { key: "EVEN",       label: "Even",   sub: "7 pushes · doubles lose", odds: "1:1", color: "bg-teal-700 hover:bg-teal-600 border-teal-500" },
  { key: "ANY_DOUBLE", label: "Double", sub: "Same face", odds: "4:1", color: "bg-orange-700 hover:bg-orange-600 border-orange-500" },
];

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const dots = [
    [],
    [[50, 50]],
    [[25, 25], [75, 75]],
    [[25, 25], [50, 50], [75, 75]],
    [[25, 25], [75, 25], [25, 75], [75, 75]],
    [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75], [50, 50]],
  ];
  const face = rolling ? Math.ceil(Math.random() * 6) : (value || 1);
  const positions = dots[face] || dots[1];

  return (
    <motion.div
      animate={rolling ? { rotate: [0, 180, 360, 540], scale: [1, 0.8, 1, 0.9, 1] } : { rotate: 0, scale: 1 }}
      transition={rolling ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { type: "spring", stiffness: 200, damping: 15 }}
      className="w-20 h-20 bg-white rounded-2xl shadow-2xl relative border-2 border-gray-200"
    >
      {positions.map(([cx, cy], i) => (
        <div
          key={i}
          className="absolute w-3.5 h-3.5 bg-gray-900 rounded-full -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${cx}%`, top: `${cy}%` }}
        />
      ))}
    </motion.div>
  );
}

export default function DicePage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { win, lose } = useSound();
  const [betType, setBetType] = useState<string | null>(null);
  const [stake, setStake] = useState(0);
  const [lastStake, setLastStake] = useState(0);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [rolling, setRolling] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }
  const balance = balanceData?.balance ?? 0;

  async function roll() {
    if (!betType || stake <= 0 || rolling) return;
    setRolling(true);
    setResult(null);
    setLastStake(stake);
    try {
      await new Promise(r => setTimeout(r, 900));
      const res = await apiPost<DiceResult>("/dice/roll", {
        player_id: currentPlayerId, bet_type: betType, stake,
      });
      setResult(res);
      refetch();
      recordRound("Dice", res.net_delta);
      if (res.won) win(); else if (!res.push) lose();
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Dice</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-6 py-8 px-4 max-w-lg mx-auto w-full">

        {/* Dice display */}
        <div className="table-zone p-8 w-full flex flex-col items-center gap-6">
          <div className="flex gap-8 items-center justify-center min-h-[5rem]">
            {result || rolling ? (
              <>
                <Die value={result?.die1 ?? 1} rolling={rolling} />
                <Die value={result?.die2 ?? 1} rolling={rolling} />
              </>
            ) : (
              <p className="text-ivory/20 text-sm uppercase tracking-widest">Place a bet to roll</p>
            )}
          </div>
          {result && !rolling && (
            <motion.p
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl font-black text-gold-400"
            >
              {result.total}
              {result.is_double && <span className="text-lg font-semibold text-orange-400 ml-2">Double!</span>}
            </motion.p>
          )}
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && !rolling && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="card-surface px-8 py-5 text-center w-full"
            >
              <p className={`font-display text-3xl font-bold ${result.won ? "text-green-400" : result.push ? "text-ivory" : "text-red-400"}`}>
                {result.won ? "Winner!" : result.push ? "Push" : "No luck"}
              </p>
              <p className={`text-xl font-semibold mt-1 ${result.net_delta > 0 ? "text-green-400" : result.net_delta === 0 ? "text-ivory/60" : "text-red-400"}`}>
                {result.net_delta > 0 ? `+${result.net_delta.toLocaleString()}` : result.net_delta.toLocaleString()} chips
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-4">
          {/* Bet type */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {BET_TYPES.map(b => (
              <button
                key={b.key}
                onClick={() => setBetType(b.key)}
                disabled={rolling}
                className={cn(
                  "border-2 rounded-xl py-3 text-white font-semibold transition-all duration-150 text-sm",
                  b.color,
                  betType === b.key ? "ring-2 ring-gold-400 scale-105 shadow-lg" : "opacity-70 hover:opacity-100"
                )}
              >
                <p>{b.label}</p>
                <p className="text-white/50 text-xs">{b.sub}</p>
                <p className="text-gold-300 text-xs font-bold">{b.odds}</p>
              </button>
            ))}
          </div>

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

          {/* Chips */}
          <div className="flex gap-2 flex-wrap justify-center">
            {CHIP_VALUES.map(v => (
              <Chip key={v} value={v} disabled={rolling || stake + v > balance} onClick={() => setStake(s => s + v)} />
            ))}
            {balance > 5000 && (
              <button onClick={() => setStake(balance)} disabled={rolling || stake >= balance}
                className="px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30 border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400 hover:border-gold-400/60">
                All In
              </button>
            )}
          </div>

          {/* Re-bet row */}
          {lastStake > 0 && (
            <div className="flex gap-2 w-full">
              <button onClick={() => setStake(lastStake)} disabled={rolling || lastStake > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
              </button>
              <button onClick={() => setStake(Math.max(1, Math.floor(lastStake / 2)))} disabled={rolling}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ½ Bet
              </button>
              <button onClick={() => setStake(lastStake * 2)} disabled={rolling || lastStake * 2 > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ×2 Bet
              </button>
            </div>
          )}

          {/* Clear + Roll */}
          <div className="flex gap-3 w-full">
            <button onClick={() => setStake(0)} disabled={stake === 0 || rolling} className="btn-ghost flex-1 text-sm py-2">
              Clear{stake > 0 ? ` (${stake.toLocaleString()})` : ""}
            </button>
            <button onClick={roll} disabled={!betType || stake <= 0 || rolling || stake > balance}
              className="btn-primary flex-1 text-base py-3">
              {rolling ? "Rolling…" : `🎲 Roll · ${stake.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
