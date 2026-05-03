import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { RouletteWheel, calcWheelRotation, RED_NUMS } from "@/components/roulette/RouletteWheel";

interface BetEntry { bet_type: string; amount: number; number?: number }
interface SpinResult {
  winning_number: number;
  is_red: boolean;
  is_black: boolean;
  net_delta: number;
  new_balance: number;
  payouts: { bet_type: string; won: boolean; delta: number }[];
}

const OUTSIDE_BETS = [
  { label: "Red",    key: "RED",          color: "bg-red-700 hover:bg-red-600" },
  { label: "Black",  key: "BLACK",        color: "bg-gray-800 hover:bg-gray-700 border border-gray-600" },
  { label: "Odd",    key: "ODD",          color: "bg-navy-700 hover:bg-navy-600" },
  { label: "Even",   key: "EVEN",         color: "bg-navy-700 hover:bg-navy-600" },
  { label: "1–18",   key: "LOW",          color: "bg-navy-700 hover:bg-navy-600" },
  { label: "19–36",  key: "HIGH",         color: "bg-navy-700 hover:bg-navy-600" },
  { label: "1st 12", key: "DOZEN_FIRST",  color: "bg-purple-800 hover:bg-purple-700" },
  { label: "2nd 12", key: "DOZEN_SECOND", color: "bg-purple-800 hover:bg-purple-700" },
  { label: "3rd 12", key: "DOZEN_THIRD",  color: "bg-purple-800 hover:bg-purple-700" },
];

const BASE_CHIPS = [1, 5, 25, 100, 500];

export default function RoulettePage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { chipClick, win, lose, spin: spinSfx } = useSound();
  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  // Include All In as a chip value only when balance is larger than the largest preset
  const chipValues = [...BASE_CHIPS.filter(c => c < balance)];

  function addBet(type: string, num?: number) {
    chipClick();
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

  async function spinWheel() {
    if (bets.length === 0 || spinning) return;
    setSpinning(true);
    setResult(null);
    spinSfx();
    try {
      const res = await apiPost<SpinResult>("/roulette/spin", { player_id: currentPlayerId, bets });
      const newWheel = calcWheelRotation(wheelRotation, res.winning_number);
      // Ball spins opposite direction and settles at top
      const newBall = ballRotation - (4 * 360 + Math.random() * 180);
      setWheelRotation(newWheel);
      setBallRotation(newBall);
      await new Promise(r => setTimeout(r, 4800));
      setResult(res);
      setBets([]);
      refetch();
      recordRound("Roulette", res.net_delta);
      res.net_delta > 0 ? win() : lose();
    } finally {
      setSpinning(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Roulette</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-6 px-4 max-w-3xl mx-auto w-full">

        {/* Wheel */}
        <RouletteWheel
          rotation={wheelRotation}
          ballRotation={ballRotation}
          spinning={spinning}
          winningNumber={result ? result.winning_number : null}
        />

        {/* Result banner */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card-surface px-8 py-4 text-center w-full"
            >
              <p className="text-ivory/50 text-sm">
                Number{" "}
                <span className={`font-black text-base ${result.is_red ? "text-red-400" : result.winning_number === 0 ? "text-green-400" : "text-ivory"}`}>
                  {result.winning_number}
                </span>
                {result.is_red ? " · Red" : result.winning_number === 0 ? " · Green" : " · Black"}
              </p>
              <p className={`font-display text-3xl font-bold mt-1 ${result.net_delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {result.net_delta >= 0 ? `+${result.net_delta}` : result.net_delta} chips
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {result.payouts.filter(p => p.won).map((p, i) => (
                  <span key={i} className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                    {p.bet_type.replace(/_/g, " ")} +{p.delta}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Number grid */}
        <div className="card-surface p-4 w-full">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3 text-center">
            Straight bets · chip: <span className="text-gold-400">{selectedChip.toLocaleString()}</span>
          </p>
          <div className="grid gap-0.5 mb-2" style={{ gridTemplateColumns: "repeat(13,1fr)" }}>
            <button onClick={() => addBet("STRAIGHT", 0)}
              className="bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded py-2 relative transition-colors">
              0
              {bets.find(b => b.bet_type === "STRAIGHT" && b.number === 0) && (
                <span className="absolute -top-1 -right-1 bg-gold-400 text-navy-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-black leading-none text-[9px]">
                  {bets.find(b => b.bet_type === "STRAIGHT" && b.number === 0)!.amount}
                </span>
              )}
            </button>
            {Array.from({ length: 36 }, (_, i) => i + 1).map(n => {
              const placed = bets.find(b => b.bet_type === "STRAIGHT" && b.number === n);
              return (
                <button key={n} onClick={() => addBet("STRAIGHT", n)}
                  className={`${RED_NUMS.has(n) ? "bg-red-700 hover:bg-red-600" : "bg-gray-800 hover:bg-gray-700"} text-white text-xs font-bold rounded py-2 relative transition-colors`}>
                  {n}
                  {placed && (
                    <span className="absolute -top-1 -right-1 bg-gold-400 text-navy-900 text-xs rounded-full w-4 h-4 flex items-center justify-center font-black leading-none text-[9px]">
                      {placed.amount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1 mt-3">
            {OUTSIDE_BETS.map(b => {
              const placed = bets.find(bet => bet.bet_type === b.key);
              return (
                <button key={b.key} onClick={() => addBet(b.key)}
                  className={`${b.color} text-white text-xs font-bold py-2 rounded relative transition-colors`}>
                  {b.label}
                  {placed && <span className="ml-1 text-gold-300">({placed.amount})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chip selector + controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {chipValues.map(v => (
              <button key={v} onClick={() => setSelectedChip(v)}
                className={`w-12 h-12 rounded-full font-bold text-sm border-4 transition-all ${selectedChip === v ? "border-gold-400 bg-gold-500 text-navy-900 scale-110 shadow-lg" : "border-gray-600 bg-gray-800 text-white hover:border-gray-400"}`}>
                {v >= 1000 ? `${v / 1000}k` : v}
              </button>
            ))}
            {/* All In chip */}
            {balance > 0 && (
              <button
                onClick={() => { setSelectedChip(balance); }}
                className={`px-3 h-12 rounded-full font-bold text-xs border-4 transition-all ${selectedChip === balance ? "border-gold-400 bg-gold-500 text-navy-900 scale-110 shadow-lg" : "border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400 hover:border-gold-400/60"}`}
              >
                All In
              </button>
            )}
          </div>

          <div className="flex gap-3 w-full max-w-sm">
            <button onClick={() => setBets([])} disabled={bets.length === 0 || spinning}
              className="btn-ghost flex-1 text-sm py-2">
              Clear {totalBet > 0 && `(${totalBet})`}
            </button>
            <button onClick={spinWheel} disabled={bets.length === 0 || spinning || totalBet > balance}
              className="btn-primary flex-1 text-sm py-3">
              {spinning ? "Spinning…" : `Spin · ${totalBet.toLocaleString()}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
