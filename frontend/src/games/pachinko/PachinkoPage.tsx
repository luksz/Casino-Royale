import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { apiPost } from "@/lib/api";
import { Chip } from "@/components/casino/Chip";
import { ChipStack } from "@/components/casino/ChipStack";
import { cn } from "@/lib/utils";

interface BallResponse {
  path: boolean[];
  slot: number;
  multiplier: number;
  net_delta: number;
}
interface DropResponse {
  balls: BallResponse[];
  total_net_delta: number;
  stake_per_ball: number;
  num_balls: number;
  rows: number;
  risk: string;
  payouts: number[];
  new_balance: number;
}

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];
const BOARD_W = 380;
const PEG_R = 5;
const BALL_R = 9;
const SLOT_H = 44;
const TOP_PAD = 20;

const ROW_HEIGHTS: Record<number, number> = { 8: 44, 12: 36, 16: 28 };

function slotColor(mult: number): string {
  if (mult >= 50)  return "#22c55e";
  if (mult >= 10)  return "#4ade80";
  if (mult >= 3)   return "#a3e635";
  if (mult >= 1.5) return "#facc15";
  if (mult >= 1.0) return "#fb923c";
  return "#f87171";
}

function fmtMult(m: number): string {
  if (m >= 100) return `${Math.round(m)}×`;
  return `${m}×`;
}

function pegX(j: number, row: number, slotW: number): number {
  // row r has r pegs; peg j (0-indexed) in row r
  return BOARD_W / 2 + (2 * j - row + 1) * slotW / 2;
}

function ballPos(step: number, rights: number, slotW: number, rowH: number) {
  const x = BOARD_W / 2 + (2 * rights - step) * slotW / 2;
  const y = TOP_PAD + step * rowH + rowH / 2;
  return { x, y };
}

function PachinkoBoard({
  rows,
  payouts,
  ballX,
  ballY,
  showBall,
  litSlot,
  dropping,
}: {
  rows: number;
  payouts: number[];
  ballX: number;
  ballY: number;
  showBall: boolean;
  litSlot: number | null;
  dropping: boolean;
}) {
  const rowH = ROW_HEIGHTS[rows];
  const slotW = BOARD_W / (rows + 1);
  const boardH = TOP_PAD + rows * rowH + rowH + SLOT_H + 8;

  return (
    <svg
      viewBox={`0 0 ${BOARD_W} ${boardH}`}
      width="100%"
      style={{ display: "block" }}
    >
      {/* Background */}
      <rect width={BOARD_W} height={boardH} fill="#0f172a" rx={8} />

      {/* Pegs */}
      {Array.from({ length: rows }, (_, ri) => {
        const r = ri + 1;
        return Array.from({ length: r }, (_, j) => (
          <circle
            key={`peg-${r}-${j}`}
            cx={pegX(j, r, slotW)}
            cy={TOP_PAD + r * rowH}
            r={PEG_R}
            fill="#475569"
          />
        ));
      })}

      {/* Drop guide line */}
      <line
        x1={BOARD_W / 2} y1={0}
        x2={BOARD_W / 2} y2={TOP_PAD + rowH / 2}
        stroke="#fbbf2440" strokeWidth={2} strokeDasharray="4 4"
      />

      {/* Slots */}
      {payouts.map((mult, k) => {
        const sx = k * slotW;
        const sy = TOP_PAD + rows * rowH + rowH * 0.6;
        const isLit = litSlot === k;
        const col = slotColor(mult);
        return (
          <g key={`slot-${k}`}>
            <rect
              x={sx + 1} y={sy}
              width={slotW - 2} height={SLOT_H}
              fill={col}
              fillOpacity={isLit ? 1 : 0.22}
              rx={3}
            />
            {isLit && (
              <rect
                x={sx + 1} y={sy}
                width={slotW - 2} height={SLOT_H}
                fill="white"
                fillOpacity={0.15}
                rx={3}
              />
            )}
            <text
              x={sx + slotW / 2}
              y={sy + SLOT_H * 0.62}
              textAnchor="middle"
              fontSize={slotW < 28 ? 7 : slotW < 36 ? 9 : 10}
              fill="white"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {fmtMult(mult)}
            </text>
          </g>
        );
      })}

      {/* Ball */}
      {showBall && (
        <motion.circle
          animate={{ cx: ballX, cy: ballY }}
          transition={{ duration: dropping ? 0.13 : 0, ease: "easeInOut" }}
          r={BALL_R}
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

export default function PachinkoPage() {
  const navigate = useNavigate();
  const { currentPlayerId, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { win, lose } = useSound();

  const [rows, setRows] = useState<8 | 12 | 16>(8);
  const [risk, setRisk] = useState<"low" | "medium" | "high">("low");
  const [numBalls, setNumBalls] = useState(1);
  const [stakePerBall, setStakePerBall] = useState(0);
  const [lastStake, setLastStake] = useState(0);

  const [result, setResult] = useState<DropResponse | null>(null);
  const [dropping, setDropping] = useState(false);

  // Animation state
  const [animBallIdx, setAnimBallIdx] = useState(-1);
  const [animStep, setAnimStep] = useState(0);
  const [litSlot, setLitSlot] = useState<number | null>(null);
  const [ballHistory, setBallHistory] = useState<{ mult: number; net: number }[]>([]);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!currentPlayerId) { navigate("/"); return null; }
  const balance = balanceData?.balance ?? 0;

  const rowH = ROW_HEIGHTS[rows];
  const slotW = BOARD_W / (rows + 1);
  const payouts = result?.payouts ?? [];

  // Compute current ball display position
  const currentBall = result?.balls[animBallIdx];
  const rightsAtStep = currentBall
    ? currentBall.path.slice(0, animStep).filter(Boolean).length
    : 0;
  const { x: ballX, y: ballY } = currentBall
    ? ballPos(animStep, rightsAtStep, slotW, rowH)
    : { x: BOARD_W / 2, y: TOP_PAD + rowH / 2 };
  const showBall = animBallIdx >= 0;

  // Drive animation frame by frame
  useEffect(() => {
    if (animBallIdx < 0 || !result) return;

    if (animStep <= rows) {
      animRef.current = setTimeout(() => {
        setAnimStep(s => s + 1);
        if (animStep === rows && currentBall) {
          setLitSlot(currentBall.slot);
        }
      }, 140);
    } else {
      // Ball settled — pause then advance or finish
      animRef.current = setTimeout(() => {
        if (animBallIdx + 1 < result.balls.length) {
          setLitSlot(null);
          setAnimBallIdx(i => i + 1);
          setAnimStep(0);
        } else {
          // All balls done
          setDropping(false);
          setLitSlot(null);
          refetch();
          recordRound("Pachinko", result.total_net_delta);
          result.total_net_delta > 0 ? win() : lose();
        }
      }, 400);
    }
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animStep, animBallIdx]);

  async function dropBalls() {
    if (stakePerBall <= 0 || dropping) return;
    setDropping(true);
    setResult(null);
    setLitSlot(null);
    setBallHistory([]);
    setAnimBallIdx(-1);
    setAnimStep(0);
    setLastStake(stakePerBall);

    try {
      const res = await apiPost<DropResponse>("/pachinko/drop", {
        player_id: currentPlayerId,
        stake_per_ball: stakePerBall,
        num_balls: numBalls,
        rows,
        risk,
      });
      setResult(res);
      setBallHistory(res.balls.map(b => ({ mult: b.multiplier, net: b.net_delta })));
      setAnimBallIdx(0);
      setAnimStep(0);
    } catch {
      setDropping(false);
    }
  }

  const totalStake = stakePerBall * numBalls;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">← Lobby</Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Pachinko</h1>
        <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
      </div>

      <div className="flex-1 flex flex-col items-center gap-4 py-5 px-4 max-w-2xl mx-auto w-full">

        {/* Settings row */}
        <div className="card-surface p-3 w-full flex flex-wrap gap-4 justify-center items-start">
          {/* Rows */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-ivory/30 text-xs uppercase tracking-widest">Rows</span>
            <div className="flex gap-1.5">
              {([8, 12, 16] as const).map(r => (
                <button key={r} onClick={() => { if (!dropping) setRows(r); }}
                  className={cn("px-3 py-1.5 rounded-lg text-sm font-bold border transition-all",
                    rows === r ? "bg-royal-600 border-royal-400 text-white" : "bg-navy-800/60 border-navy-600 text-ivory/50 hover:text-ivory")}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Risk */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-ivory/30 text-xs uppercase tracking-widest">Risk</span>
            <div className="flex gap-1.5">
              {(["low", "medium", "high"] as const).map(r => (
                <button key={r} onClick={() => { if (!dropping) setRisk(r); }}
                  className={cn("px-3 py-1.5 rounded-lg text-sm font-bold border transition-all capitalize",
                    risk === r
                      ? r === "high" ? "bg-red-700 border-red-500 text-white"
                        : r === "medium" ? "bg-yellow-700 border-yellow-500 text-white"
                        : "bg-green-800 border-green-600 text-white"
                      : "bg-navy-800/60 border-navy-600 text-ivory/50 hover:text-ivory")}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Balls */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-ivory/30 text-xs uppercase tracking-widest">Balls</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 5].map(n => (
                <button key={n} onClick={() => { if (!dropping) setNumBalls(n); }}
                  className={cn("w-9 py-1.5 rounded-lg text-sm font-bold border transition-all",
                    numBalls === n ? "bg-royal-600 border-royal-400 text-white" : "bg-navy-800/60 border-navy-600 text-ivory/50 hover:text-ivory")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="w-full rounded-xl overflow-hidden border border-navy-700/40">
          <PachinkoBoard
            rows={rows}
            payouts={result?.payouts ?? []}
            ballX={ballX}
            ballY={ballY}
            showBall={showBall}
            litSlot={litSlot}
            dropping={dropping}
          />
        </div>

        {/* Ball history */}
        <AnimatePresence>
          {result && !dropping && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card-surface px-6 py-4 text-center w-full"
            >
              <p className={cn(
                "font-display text-3xl font-bold",
                result.total_net_delta > 0 ? "text-gold-400" : result.total_net_delta < 0 ? "text-red-400" : "text-ivory"
              )}>
                {result.total_net_delta > 0 ? `+${result.total_net_delta.toLocaleString()}` : result.total_net_delta.toLocaleString()} chips
              </p>
              {result.balls.length > 1 && (
                <div className="flex gap-1.5 flex-wrap justify-center mt-2">
                  {result.balls.map((b, i) => (
                    <span key={i} className={cn(
                      "text-xs px-2 py-0.5 rounded-full border font-semibold tabular-nums",
                      b.net_delta > 0 ? "border-green-500/40 bg-green-500/10 text-green-400"
                        : b.net_delta < 0 ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : "border-navy-600 text-ivory/40"
                    )}>
                      {b.multiplier}× ({b.net_delta > 0 ? "+" : ""}{b.net_delta})
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="card-surface p-5 w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 min-h-[40px]">
            {stakePerBall > 0 ? (
              <>
                <ChipStack amount={stakePerBall} size={36} />
                <div className="text-center">
                  <span className="font-display text-3xl text-gold-400 font-bold tabular-nums">{stakePerBall.toLocaleString()}</span>
                  {numBalls > 1 && (
                    <p className="text-ivory/30 text-xs mt-0.5">× {numBalls} balls = {totalStake.toLocaleString()} total</p>
                  )}
                </div>
              </>
            ) : (
              <span className="font-display text-3xl text-ivory/20 font-bold">0</span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {CHIP_VALUES.map(v => (
              <Chip key={v} value={v} disabled={dropping || stakePerBall + v > balance} onClick={() => setStakePerBall(s => s + v)} />
            ))}
            {balance > 5000 && (
              <button onClick={() => setStakePerBall(Math.floor(balance / numBalls))} disabled={dropping}
                className="px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30 border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400">
                Max
              </button>
            )}
          </div>

          {lastStake > 0 && (
            <div className="flex gap-2 w-full">
              <button onClick={() => setStakePerBall(lastStake)} disabled={dropping || lastStake > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                Re-bet <span className="text-ivory/40">({lastStake.toLocaleString()})</span>
              </button>
              <button onClick={() => setStakePerBall(Math.max(1, Math.floor(lastStake / 2)))} disabled={dropping}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ½ Bet
              </button>
              <button onClick={() => setStakePerBall(lastStake * 2)} disabled={dropping || lastStake * 2 * numBalls > balance}
                className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory text-xs font-semibold transition-all disabled:opacity-30">
                ×2 Bet
              </button>
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button onClick={() => setStakePerBall(0)} disabled={stakePerBall === 0 || dropping} className="btn-ghost flex-1 text-sm py-2">
              Clear{stakePerBall > 0 ? ` (${stakePerBall.toLocaleString()})` : ""}
            </button>
            <button
              onClick={dropBalls}
              disabled={stakePerBall <= 0 || dropping || totalStake > balance}
              className="btn-primary flex-1 text-base py-3"
            >
              {dropping ? "Dropping…" : `Drop · ${totalStake.toLocaleString()}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
