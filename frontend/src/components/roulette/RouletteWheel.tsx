import { motion, AnimatePresence } from "framer-motion";

import { WHEEL_ORDER, RED_NUMS, SECTOR_DEG } from "./wheelMath";

const CX = 150, CY = 150;
const R_OUTER = 132, R_INNER = 84, R_TEXT = 112;
const R_TRACK = 145;

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function sectorPath(i: number): string {
  const a1 = toRad(i * SECTOR_DEG - 90);
  const a2 = toRad((i + 1) * SECTOR_DEG - 90);
  const x1o = CX + R_OUTER * Math.cos(a1), y1o = CY + R_OUTER * Math.sin(a1);
  const x2o = CX + R_OUTER * Math.cos(a2), y2o = CY + R_OUTER * Math.sin(a2);
  const x1i = CX + R_INNER * Math.cos(a1), y1i = CY + R_INNER * Math.sin(a1);
  const x2i = CX + R_INNER * Math.cos(a2), y2i = CY + R_INNER * Math.sin(a2);
  return `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${R_OUTER} ${R_OUTER} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${R_INNER} ${R_INNER} 0 0 0 ${x1i} ${y1i} Z`;
}

function numberPos(i: number) {
  const a = toRad(i * SECTOR_DEG + SECTOR_DEG / 2 - 90);
  return { x: CX + R_TEXT * Math.cos(a), y: CY + R_TEXT * Math.sin(a), angleDeg: i * SECTOR_DEG + SECTOR_DEG / 2 };
}

interface RouletteWheelProps {
  rotation: number;
  ballRotation: number;
  spinning: boolean;
  winningNumber: number | null;
}

const SPIN_TRANSITION = { duration: 4.5, ease: [0.12, 0.9, 0.38, 1] as [number, number, number, number] };
const BALL_TRANSITION = { duration: 4.5, ease: [0.08, 0.85, 0.3, 1] as [number, number, number, number] };
const INSTANT = { duration: 0 };

export function RouletteWheel({ rotation, ballRotation, spinning, winningNumber }: RouletteWheelProps) {
  const ballX = CX + R_TRACK * Math.cos(toRad(-90));
  const ballY = CY + R_TRACK * Math.sin(toRad(-90));

  return (
    // Layered divs: each rotates independently via motion.div (HTML transforms are reliable)
    <div className="relative select-none" style={{ width: 300, height: 300 }}>

      {/* Layer 1 — static background rings */}
      <svg width="300" height="300" viewBox="0 0 300 300" className="absolute inset-0">
        <circle cx={CX} cy={CY} r={R_OUTER + 10} fill="#0b1530" stroke="#a47d10" strokeWidth="3" />
        <circle cx={CX} cy={CY} r={R_OUTER + 6} fill="none" stroke="#f4c542" strokeWidth="1" strokeDasharray="4 3" />
      </svg>

      {/* Layer 2 — rotating wheel (motion.div guarantees correct pivot) */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "center" }}
        animate={{ rotate: rotation }}
        transition={spinning ? SPIN_TRANSITION : INSTANT}
      >
        <svg width="300" height="300" viewBox="0 0 300 300">
          {WHEEL_ORDER.map((n, i) => {
            const fill = n === 0 ? "#15803d" : RED_NUMS.has(n) ? "#b91c1c" : "#111118";
            const { x, y, angleDeg } = numberPos(i);
            return (
              <g key={n}>
                <path d={sectorPath(i)} fill={fill} stroke="#1e293b" strokeWidth="0.8" />
                <text
                  x={x} y={y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="7.5" fontWeight="bold" fontFamily="monospace"
                  transform={`rotate(${angleDeg}, ${x}, ${y})`}
                >
                  {n}
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={R_INNER - 2} fill="#060d1f" stroke="#f4c542" strokeWidth="2" />
          <circle cx={CX} cy={CY} r={28} fill="#0b1530" stroke="#a47d10" strokeWidth="1.5" />
          {[0, 60, 120, 180, 240, 300].map(a => {
            const ra = toRad(a);
            return (
              <line key={a}
                x1={CX + 30 * Math.cos(ra)} y1={CY + 30 * Math.sin(ra)}
                x2={CX + (R_INNER - 4) * Math.cos(ra)} y2={CY + (R_INNER - 4) * Math.sin(ra)}
                stroke="#a47d10" strokeWidth="1.5" opacity="0.6"
              />
            );
          })}
          <circle cx={CX} cy={CY} r={8} fill="#f4c542" />
        </svg>
      </motion.div>

      {/* Layer 3 — ball orbiting counter-clockwise */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "center" }}
        animate={{ rotate: ballRotation }}
        transition={spinning ? BALL_TRANSITION : INSTANT}
      >
        <svg width="300" height="300" viewBox="0 0 300 300">
          <circle cx={ballX} cy={ballY} r="5.5" fill="white" stroke="#9ca3af" strokeWidth="1" />
        </svg>
      </motion.div>

      {/* Layer 4 — static pointer (always on top) */}
      <svg width="300" height="300" viewBox="0 0 300 300" className="absolute inset-0 pointer-events-none">
        <polygon
          points={`${CX},${CY - R_OUTER - 5} ${CX - 7},${CY - R_OUTER + 9} ${CX + 7},${CY - R_OUTER + 9}`}
          fill="#f4c542"
        />
      </svg>

      {/* Winning number badge */}
      <AnimatePresence>
        {winningNumber !== null && !spinning && (
          <motion.div
            key={winningNumber}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center border-2 border-gold-400 shadow-xl text-white font-black text-xl pointer-events-none
              ${winningNumber === 0 ? "bg-green-700" : RED_NUMS.has(winningNumber) ? "bg-red-600" : "bg-gray-900"}`}
          >
            {winningNumber}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
