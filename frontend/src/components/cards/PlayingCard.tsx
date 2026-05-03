import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SUIT_SYMBOLS: Record<string, string> = {
  S: "♠", H: "♥", D: "♦", C: "♣",
};
const RED_SUITS = new Set(["H", "D"]);

interface PlayingCardProps {
  code: string;
  faceDown?: boolean;
  /** Index in the deal sequence — drives stagger delay (0.45 s per step) */
  dealIndex?: number;
  /** Skip the fly-in animation (already on table) */
  static?: boolean;
  className?: string;
}

function parseCode(code: string) {
  if (code === "??") return { rank: "?", suit: "?" };
  return { rank: code.slice(0, -1), suit: code[code.length - 1] };
}

export function PlayingCard({
  code,
  faceDown = false,
  dealIndex = 0,
  static: isStatic = false,
  className,
}: PlayingCardProps) {
  const { rank, suit } = parseCode(code);
  const isRed = RED_SUITS.has(suit);
  const sym = SUIT_SYMBOLS[suit] ?? suit;

  return (
    <motion.div
      key={code}
      initial={isStatic ? false : { x: 160, y: -130, opacity: 0, rotate: 20, scale: 0.45 }}
      animate={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      transition={
        isStatic
          ? {}
          : {
              type: "spring",
              stiffness: 180,
              damping: 20,
              delay: dealIndex * 0.45,
            }
      }
      className={cn(
        "relative w-12 h-[4.5rem] sm:w-16 sm:h-24 rounded-xl shadow-xl select-none flex-shrink-0",
        faceDown
          ? "bg-navy-700 border-2 border-royal-600/60"
          : "bg-white border border-gray-300",
        className,
      )}
    >
      {faceDown ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl">
          <div className="absolute inset-1.5 rounded-lg border border-royal-400/20" />
          <div className="absolute inset-2 rounded border border-royal-400/10" />
          <span className="text-royal-400/20 text-3xl font-display">♦</span>
        </div>
      ) : (
        <>
          <span className={cn("absolute top-1 left-1.5 text-[10px] sm:text-sm font-black leading-none", isRed ? "text-red-700" : "text-black")}>
            {rank}<br />{sym}
          </span>
          <span className={cn("absolute bottom-1 right-1.5 text-[10px] sm:text-sm font-black leading-none rotate-180", isRed ? "text-red-700" : "text-black")}>
            {rank}<br />{sym}
          </span>
          <span className={cn("absolute inset-0 flex items-center justify-center text-2xl sm:text-4xl font-black", isRed ? "text-red-600" : "text-gray-900")}>
            {sym}
          </span>
        </>
      )}
    </motion.div>
  );
}
