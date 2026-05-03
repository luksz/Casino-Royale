import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { HandState } from "@/types/api";
import { cn } from "@/lib/utils";

interface HandProps {
  hand: HandState;
  label?: string;
  isActive?: boolean;
  hideHole?: boolean;
  /** Show a brief action badge (HIT / STAND / DOUBLE) */
  actionBadge?: string | null;
}

export function Hand({ hand, label, isActive, hideHole, actionBadge }: HandProps) {
  const bust = hand.is_bust;
  const bj = hand.is_blackjack;

  return (
    <div className="flex flex-col items-center gap-2 relative">
      {label && (
        <p className="text-ivory/40 text-xs uppercase tracking-widest">{label}</p>
      )}

      {/* Cards row */}
      <motion.div
        className={cn(
          "flex gap-1 p-2 rounded-xl transition-all duration-300",
          isActive && "ring-2 ring-gold-400/70 bg-gold-400/5",
          bust && "ring-2 ring-red-500/60",
        )}
        animate={bust ? { x: [0, -6, 6, -4, 4, 0] } : {}}
        transition={bust ? { duration: 0.4, delay: 0.1 } : {}}
      >
        {hand.cards.map((code, i) => (
          <PlayingCard
            key={`${code}-${i}`}
            code={code}
            faceDown={hideHole && i === 1}
            dealIndex={i}
          />
        ))}
      </motion.div>

      {/* Value badge */}
      <motion.p
        layout
        className={cn(
          "text-sm font-semibold px-3 py-0.5 rounded-full",
          bust
            ? "text-red-400 bg-red-500/10"
            : bj
            ? "text-gold-400 bg-gold-400/10"
            : "text-ivory/80",
        )}
      >
        {bust ? "Bust!" : bj ? "Blackjack! 🎉" : hideHole ? `${hand.value}+?` : hand.value}
      </motion.p>

      {/* Action badge overlay */}
      <AnimatePresence>
        {actionBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.2, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
          >
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-navy-900 border border-royal-500/50 text-royal-400 shadow-lg">
              {actionBadge}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
