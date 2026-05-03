import { motion } from "framer-motion";

export const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
export const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const N = 37;
const SECTOR_DEG = 360 / N;
const CX = 150, CY = 150;
const R_OUTER = 132, R_INNER = 84, R_TEXT = 112;
const R_TRACK = 145; // ball orbit track

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

/** Returns the clockwise rotation to land winning number at the top pointer. */
export function calcWheelRotation(prev: number, winningNumber: number): number {
  const idx = WHEEL_ORDER.indexOf(winningNumber);
  const sectorCenter = (idx * SECTOR_DEG + SECTOR_DEG / 2) % 360;
  const offset = sectorCenter === 0 ? 0 : 360 - sectorCenter;
  const base = Math.ceil(prev / 360) * 360;
  return base + 5 * 360 + offset;
}

interface RouletteWheelProps {
  rotation: number;
  ballRotation: number;
  spinning: boolean;
  winningNumber: number | null;
}

export function RouletteWheel({ rotation, ballRotation, spinning, winningNumber }: RouletteWheelProps) {
  const ballX = CX + R_TRACK * Math.cos(toRad(-90)); // resting at top
  const ballY = CY + R_TRACK * Math.sin(toRad(-90));

  return (
    <div className="relative flex items-center justify-center select-none">
      <svg width="300" height="300" viewBox="0 0 300 300">
        {/* Outer decorative ring */}
        <circle cx={CX} cy={CY} r={R_OUTER + 10} fill="#0b1530" stroke="#a47d10" strokeWidth="3" />
        <circle cx={CX} cy={CY} r={R_OUTER + 6} fill="none" stroke="#f4c542" strokeWidth="1" strokeDasharray="4 3" />

        {/* Rotating wheel group */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          animate={{ rotate: rotation }}
          transition={spinning
            ? { duration: 4.5, ease: [0.12, 0.9, 0.38, 1] }
            : { duration: 0 }}
        >
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
          {/* Inner hub */}
          <circle cx={CX} cy={CY} r={R_INNER - 2} fill="#060d1f" stroke="#f4c542" strokeWidth="2" />
          <circle cx={CX} cy={CY} r={28} fill="#0b1530" stroke="#a47d10" strokeWidth="1.5" />
          {/* Hub spokes */}
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
        </motion.g>

        {/* Ball orbit (counter-rotates relative to wheel) */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          animate={{ rotate: ballRotation }}
          transition={spinning
            ? { duration: 4.5, ease: [0.08, 0.85, 0.3, 1] }
            : { duration: 0 }}
        >
          <circle cx={ballX} cy={ballY} r="5" fill="white" stroke="#d1d5db" strokeWidth="1" opacity="0.95" />
        </motion.g>

        {/* Fixed pointer at top */}
        <polygon
          points={`${CX},${CY - R_OUTER - 5} ${CX - 7},${CY - R_OUTER + 9} ${CX + 7},${CY - R_OUTER + 9}`}
          fill="#f4c542"
        />
      </svg>

      {/* Winning number badge */}
      {winningNumber !== null && !spinning && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center border-2 border-gold-400 shadow-xl text-white font-black text-xl
            ${winningNumber === 0 ? "bg-green-700" : RED_NUMS.has(winningNumber) ? "bg-red-600" : "bg-gray-900"}`}
        >
          {winningNumber}
        </motion.div>
      )}
    </div>
  );
}
