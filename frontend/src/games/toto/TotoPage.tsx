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

interface TotoResult {
  main_draws: number[];
  bonus: number;
  picks: number[];
  main_matches: number[];
  bonus_hit: boolean;
  num_main_matches: number;
  prize_tier: string;
  return_multiplier: number;
  net_delta: number;
  stake: number;
  new_balance: number;
}

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];
const ALL_NUMBERS = Array.from({ length: 49 }, (_, i) => i + 1);

const PRIZE_TABLE = [
  { label: "Group 1 – Jackpot", desc: "6 numbers",            mult: 100_000 },
  { label: "Group 2",           desc: "5 numbers + bonus",    mult:  20_000 },
  { label: "Group 3",           desc: "5 numbers",            mult:   2_500 },
  { label: "Group 4",           desc: "4 numbers + bonus",    mult:     500 },
  { label: "Group 5",           desc: "4 numbers",            mult:     120 },
  { label: "Group 6",           desc: "3 numbers + bonus",    mult:      60 },
  { label: "Group 7",           desc: "3 numbers",            mult:      15 },
];

// Ball colours cycle through cheerful lottery colours
const BALL_COLOURS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-600",
  "bg-blue-500",
  "bg-purple-500",
];

function LotteryBall({
  number,
  colour,
  size = "md",
}: {
  number: number;
  colour: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={cn(
      "rounded-full flex items-center justify-center font-black text-white shadow-lg border-2 border-white/20",
      colour,
      sizeClass,
    )}>
      {number}
    </div>
  );
}

export default function TotoPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { win, lose } = useSound();

  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [stake, setStake] = useState(0);
  const [lastStake, setLastStake] = useState(0);
  const [result, setResult] = useState<TotoResult | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [revealedMain, setRevealedMain] = useState<number[]>([]);
  const [revealedBonus, setRevealedBonus] = useState(false);

  if (!currentPlayerId) { navigate("/"); return null; }
  const balance = balanceData?.balance ?? 0;

  function togglePick(n: number) {
    if (drawing) return;
    setPicks(prev => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else if (next.size < 6) {
        next.add(n);
      }
      return next;
    });
    setResult(null);
    setRevealedMain([]);
    setRevealedBonus(false);
  }

  function quickPick() {
    if (drawing) return;
    const pool = Array.from({ length: 49 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setPicks(new Set(pool.slice(0, 6)));
    setResult(null);
    setRevealedMain([]);
    setRevealedBonus(false);
  }

  async function draw() {
    if (picks.size !== 6 || stake <= 0 || drawing) return;
    setDrawing(true);
    setResult(null);
    setRevealedMain([]);
    setRevealedBonus(false);
    setLastStake(stake);
    try {
      const res = await apiPost<TotoResult>("/toto/draw", {
        player_id: currentPlayerId,
        picks: [...picks],
        stake,
      });

      // Reveal main draws one by one
      for (let i = 0; i < res.main_draws.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        setRevealedMain(prev => [...prev, res.main_draws[i]]);
      }
      // Pause then reveal bonus
      await new Promise(r => setTimeout(r, 600));
      setRevealedBonus(true);

      setResult(res);
      refetch();
      recordRound("Toto", res.net_delta);
      res.net_delta > 0 ? win() : lose();
    } finally {
      setDrawing(false);
    }
  }

  const mainMatchSet = new Set(result?.main_matches ?? []);
  const bonusIsMatch = result?.bonus_hit ?? false;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Toto</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 py-6 px-4 max-w-3xl mx-auto w-full">

        {/* Number selection grid */}
        <div className="card-surface p-4 w-full">
          <div className="flex items-center justify-between mb-3">
            <p className="text-ivory/30 text-xs uppercase tracking-widest">
              Pick exactly 6 · <span className="text-gold-400 font-semibold">{picks.size}/6 selected</span>
            </p>
            <button
              onClick={quickPick}
              disabled={drawing}
              className="text-xs px-3 py-1.5 rounded-lg border border-royal-500/50 text-royal-300 hover:text-white hover:border-royal-400 transition-all disabled:opacity-40 font-semibold"
            >
              Quick Pick
            </button>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {ALL_NUMBERS.map(n => {
              const isPick = picks.has(n);
              const isMainDraw = revealedMain.includes(n);
              const isMainMatch = mainMatchSet.has(n);
              const isBonusDraw = revealedBonus && result?.bonus === n;
              const isBonusMatch = isBonusDraw && bonusIsMatch && isPick;
              return (
                <button
                  key={n}
                  onClick={() => togglePick(n)}
                  disabled={drawing || (!isPick && picks.size >= 6)}
                  className={cn(
                    "aspect-square rounded-xl text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed border",
                    isMainMatch
                      ? "bg-gold-500 text-navy-900 scale-110 shadow-md shadow-gold-500/40 border-gold-300"
                      : isBonusMatch
                        ? "bg-purple-500 text-white scale-110 shadow-md shadow-purple-500/40 border-purple-300"
                        : isMainDraw
                          ? "bg-green-700/50 text-green-300 border-green-600/40"
                          : isBonusDraw
                            ? "bg-purple-700/50 text-purple-300 border-purple-600/40"
                            : isPick
                              ? "bg-royal-600 text-white border-royal-400 scale-105 shadow-md"
                              : "bg-navy-800/60 text-ivory/50 hover:bg-navy-700 hover:text-ivory border-transparent",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live draw display */}
        {(revealedMain.length > 0 || revealedBonus) && (
          <div className="card-surface p-4 w-full">
            <div className="flex flex-col items-center gap-3">
              <p className="text-ivory/30 text-xs uppercase tracking-widest">Draw Results</p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {revealedMain.map((n, i) => (
                  <motion.div
                    key={n}
                    initial={{ scale: 0, rotate: -180, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  >
                    <LotteryBall
                      number={n}
                      colour={mainMatchSet.has(n) ? "bg-gold-500" : BALL_COLOURS[i % BALL_COLOURS.length]}
                      size="lg"
                    />
                  </motion.div>
                ))}
                {revealedMain.length === 6 && (
                  <span className="text-ivory/30 font-bold text-lg mx-1">+</span>
                )}
                {revealedBonus && result && (
                  <motion.div
                    initial={{ scale: 0, rotate: 180, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <LotteryBall
                      number={result.bonus}
                      colour={bonusIsMatch ? "bg-purple-500" : "bg-slate-600"}
                      size="lg"
                    />
                    <span className="text-xs text-ivory/30 font-semibold">Bonus</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Result banner */}
        <AnimatePresence>
          {result && !drawing && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="card-surface px-8 py-5 text-center w-full"
            >
              {result.return_multiplier > 0 ? (
                <>
                  <p className="font-display text-3xl font-bold text-gold-400">
                    {result.prize_tier}
                  </p>
                  <p className="text-ivory/50 text-sm mt-1">
                    {result.num_main_matches} main match{result.num_main_matches !== 1 ? "es" : ""}
                    {result.bonus_hit && " + bonus"}
                    {" · "}{result.return_multiplier >= 1000 ? `${(result.return_multiplier / 1000).toLocaleString()}k×` : `${result.return_multiplier}×`}
                  </p>
                  <p className="text-green-400 text-xl font-semibold mt-1">
                    +{result.net_delta.toLocaleString()} chips
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-3xl font-bold text-red-400">No Prize</p>
                  <p className="text-ivory/40 text-sm mt-1">
                    {result.num_main_matches} match{result.num_main_matches !== 1 ? "es" : ""}
                    {result.bonus_hit ? " + bonus" : ""}
                    {" — need at least 3"}
                  </p>
                  <p className="text-red-400 text-xl font-semibold mt-1">
                    {result.net_delta.toLocaleString()} chips
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prize table */}
        <div className="card-surface p-4 w-full">
          <p className="text-ivory/30 text-xs uppercase tracking-widest mb-3 text-center">Prize Tiers</p>
          <div className="divide-y divide-navy-700/50">
            {PRIZE_TABLE.map(({ label, desc, mult }) => (
              <div key={label} className="flex items-center justify-between py-1.5 px-1">
                <div>
                  <span className="text-xs font-semibold text-ivory/70">{label}</span>
                  <span className="text-xs text-ivory/30 ml-2">{desc}</span>
                </div>
                <span className="text-xs font-bold text-gold-400 tabular-nums">
                  {mult >= 1000 ? `${(mult / 1000).toLocaleString()}k×` : `${mult}×`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-4">
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
              <Chip key={v} value={v} disabled={drawing || stake + v > balance} onClick={() => setStake(s => s + v)} />
            ))}
            {balance > 5000 && (
              <button onClick={() => setStake(balance)} disabled={drawing || stake >= balance}
                className="px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30 border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400">
                All In
              </button>
            )}
          </div>

          {lastStake > 0 && (
            <div className="flex gap-2 w-full">
              <button onClick={() => setStake(lastStake)} disabled={drawing || lastStake > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
              </button>
              <button onClick={() => setStake(Math.max(1, Math.floor(lastStake / 2)))} disabled={drawing}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ½ Bet
              </button>
              <button onClick={() => setStake(lastStake * 2)} disabled={drawing || lastStake * 2 > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ×2 Bet
              </button>
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button onClick={() => setStake(0)} disabled={stake === 0 || drawing} className="btn-ghost flex-1 text-sm py-2">
              Clear{stake > 0 ? ` (${stake.toLocaleString()})` : ""}
            </button>
            <button
              onClick={draw}
              disabled={picks.size !== 6 || stake <= 0 || drawing || stake > balance}
              className="btn-primary flex-1 text-base py-3"
            >
              {drawing
                ? "Drawing…"
                : picks.size !== 6
                  ? `Pick ${6 - picks.size} more`
                  : `Draw · ${stake.toLocaleString()}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
