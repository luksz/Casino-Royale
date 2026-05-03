import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { RouletteWheel, calcWheelRotation, RED_NUMS } from "@/components/roulette/RouletteWheel";
import { ChipStack } from "@/components/casino/ChipStack";
import { cn } from "@/lib/utils";

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

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];

export default function RoulettePage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { chipClick, win, lose, spin: spinSfx } = useSound();

  const [selectedChip, setSelectedChip] = useState(25);
  const [bets, setBets] = useState<BetEntry[]>([]);
  const [lastBets, setLastBets] = useState<BetEntry[]>([]);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  const lastTotal = lastBets.reduce((s, b) => s + b.amount, 0);

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

  function applyLastBets(transform?: (b: BetEntry) => BetEntry) {
    const next = transform ? lastBets.map(transform) : lastBets;
    setBets(next);
  }

  async function spinWheel() {
    if (bets.length === 0 || spinning) return;
    setSpinning(true);
    setResult(null);
    setLastBets(bets); // save before clearing so re-bet works
    spinSfx();
    try {
      const res = await apiPost<SpinResult>("/roulette/spin", { player_id: currentPlayerId, bets });
      const newWheel = calcWheelRotation(wheelRotation, res.winning_number);
      const newBall = ballRotation - (4 * 360 + 120 + Math.random() * 180);
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
              {result.payouts.some(p => p.won) && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {result.payouts.filter(p => p.won).map((p, i) => (
                    <span key={i} className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                      {p.bet_type.replace(/_/g, " ")} +{p.delta}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Number grid */}
        <div className="card-surface p-4 w-full">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3 text-center">
            Click to place · chip: <span className="text-gold-400 font-semibold">{selectedChip.toLocaleString()}</span>
          </p>
          <div className="grid gap-0.5 mb-2" style={{ gridTemplateColumns: "repeat(13,1fr)" }}>
            <button
              onClick={() => addBet("STRAIGHT", 0)}
              disabled={spinning}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold rounded py-2 relative transition-colors"
            >
              0
              {(() => { const b = bets.find(b => b.bet_type === "STRAIGHT" && b.number === 0); return b ? <BetBadge amount={b.amount} /> : null; })()}
            </button>
            {Array.from({ length: 36 }, (_, i) => i + 1).map(n => {
              const placed = bets.find(b => b.bet_type === "STRAIGHT" && b.number === n);
              return (
                <button key={n} onClick={() => addBet("STRAIGHT", n)} disabled={spinning}
                  className={`${RED_NUMS.has(n) ? "bg-red-700 hover:bg-red-600" : "bg-gray-800 hover:bg-gray-700"} disabled:opacity-50 text-white text-xs font-bold rounded py-2 relative transition-colors`}>
                  {n}
                  {placed && <BetBadge amount={placed.amount} />}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1 mt-3">
            {OUTSIDE_BETS.map(b => {
              const placed = bets.find(bet => bet.bet_type === b.key);
              return (
                <button key={b.key} onClick={() => addBet(b.key)} disabled={spinning}
                  className={`${b.color} disabled:opacity-50 text-white text-xs font-bold py-2 rounded relative transition-colors`}>
                  {b.label}
                  {placed && <span className="ml-1 text-gold-300">({placed.amount})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-4">
          {/* Total bet + chip stack display */}
          {totalBet > 0 && (
            <div className="flex items-center gap-3">
              <ChipStack amount={totalBet} size={34} />
              <span className="text-gold-400 font-black text-xl tabular-nums">{totalBet.toLocaleString()}</span>
            </div>
          )}

          {/* Chip selector */}
          <div className="flex gap-2 flex-wrap justify-center">
            {CHIP_VALUES.map(v => (
              <ChipButton
                key={v}
                value={v}
                selected={selectedChip === v}
                disabled={spinning || v > balance}
                onClick={() => setSelectedChip(v)}
              />
            ))}
            {balance > 5000 && (
              <button
                onClick={() => setSelectedChip(balance)}
                disabled={spinning}
                className={cn(
                  "px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30",
                  selectedChip === balance
                    ? "border-gold-400 bg-gold-500 text-navy-900 scale-110 shadow-lg"
                    : "border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400 hover:border-gold-400/60"
                )}
              >
                All In
              </button>
            )}
          </div>

          {/* Re-bet / 1÷2 / ×2 row */}
          {lastBets.length > 0 && (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => applyLastBets()}
                disabled={spinning || lastTotal > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory hover:border-royal-400/70 text-sm font-semibold transition-all disabled:opacity-30"
              >
                Re-bet <span className="text-ivory/40 text-xs">({lastTotal})</span>
              </button>
              <button
                onClick={() => applyLastBets(b => ({ ...b, amount: Math.max(1, Math.floor(b.amount / 2)) }))}
                disabled={spinning}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory hover:border-royal-400/70 text-sm font-semibold transition-all disabled:opacity-30"
              >
                ½ Bet
              </button>
              <button
                onClick={() => applyLastBets(b => ({ ...b, amount: b.amount * 2 }))}
                disabled={spinning || lastTotal * 2 > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory hover:border-royal-400/70 text-sm font-semibold transition-all disabled:opacity-30"
              >
                ×2 Bet
              </button>
            </div>
          )}

          {/* Clear + Spin */}
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setBets([])}
              disabled={bets.length === 0 || spinning}
              className="btn-ghost flex-1 text-sm py-2"
            >
              Clear{totalBet > 0 ? ` (${totalBet.toLocaleString()})` : ""}
            </button>
            <button
              onClick={spinWheel}
              disabled={bets.length === 0 || spinning || totalBet > balance}
              className="btn-primary flex-1 text-sm py-3"
            >
              {spinning ? "Spinning…" : `Spin · ${totalBet.toLocaleString()}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function BetBadge({ amount }: { amount: number }) {
  return (
    <span className="absolute -top-1 -right-1 bg-gold-400 text-navy-900 rounded-full w-4 h-4 flex items-center justify-center font-black leading-none text-[9px] pointer-events-none">
      {amount >= 1000 ? `${Math.floor(amount / 1000)}k` : amount}
    </span>
  );
}

const CHIP_STYLES_MAP: Record<number, { bg: string; border: string; text: string }> = {
  1:    { bg: "#d1d5db", border: "#6b7280", text: "#1f2937" },
  5:    { bg: "#dc2626", border: "#7f1d1d", text: "#ffffff" },
  25:   { bg: "#16a34a", border: "#14532d", text: "#ffffff" },
  100:  { bg: "#2563eb", border: "#1e3a8a", text: "#ffffff" },
  500:  { bg: "#7c3aed", border: "#3b0764", text: "#ffffff" },
  1000: { bg: "#ca8a04", border: "#713f12", text: "#ffffff" },
  5000: { bg: "#ea580c", border: "#7c2d12", text: "#ffffff" },
};

function ChipButton({ value, selected, disabled, onClick }: {
  value: number; selected: boolean; disabled: boolean; onClick: () => void;
}) {
  const s = CHIP_STYLES_MAP[value] ?? { bg: "#4b5563", border: "#374151", text: "#fff" };
  const label = value >= 1000 ? `${value / 1000}K` : String(value);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-12 h-12 rounded-full font-black text-sm border-[3px] transition-all shadow-md",
        "disabled:opacity-30 active:scale-95",
        selected ? "scale-110 shadow-lg ring-2 ring-gold-400 ring-offset-1 ring-offset-navy-900" : "hover:scale-105",
      )}
      style={{ backgroundColor: s.bg, borderColor: s.border, color: s.text }}
    >
      {label}
    </button>
  );
}
