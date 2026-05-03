import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SUIT_SYMBOLS: Record<string, string> = {
  S: "♠", H: "♥", D: "♦", C: "♣",
};
const RED_SUITS = new Set(["H", "D"]);

interface PlayingCardProps {
  code: string;
  faceDown?: boolean;
  /** Index in the hand — drives the stagger delay */
  dealIndex?: number;
  className?: string;
}

function parseCode(code: string) {
  if (code === "??") return { rank: "?", suit: "?" };
  return { rank: code.slice(0, -1), suit: code[code.length - 1] };
}

export function PlayingCard({ code, faceDown = false, dealIndex = 0, className }: PlayingCardProps) {
  const { rank, suit } = parseCode(code);
  const isRed = RED_SUITS.has(suit);
  const sym = SUIT_SYMBOLS[suit] ?? suit;

  return (
    <motion.div
      key={code}
      initial={{ x: 140, y: -120, opacity: 0, rotate: 18, scale: 0.5 }}
      animate={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 22,
        delay: dealIndex * 0.12,
      }}
      className={cn(
        "relative w-14 h-20 rounded-lg shadow-xl select-none flex-shrink-0",
        faceDown
          ? "bg-navy-700 border-2 border-royal-600/60"
          : "bg-ivory border border-gray-200",
        className,
      )}
    >
      {faceDown ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
          {/* Card back pattern */}
          <div className="absolute inset-1 rounded border border-royal-400/20" />
          <span className="text-royal-400/30 text-2xl font-display">♦</span>
        </div>
      ) : (
        <>
          <span className={cn("absolute top-1 left-1.5 text-xs font-black leading-none", isRed ? "text-red-700" : "text-black")}>
            {rank}<br />{sym}
          </span>
          <span className={cn("absolute bottom-1 right-1.5 text-xs font-black leading-none rotate-180", isRed ? "text-red-700" : "text-black")}>
            {rank}<br />{sym}
          </span>
          <span className={cn("absolute inset-0 flex items-center justify-center text-3xl font-black", isRed ? "text-red-700" : "text-black")}>
            {sym}
          </span>
        </>
      )}
    </motion.div>
  );
}
