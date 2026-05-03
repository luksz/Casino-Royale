import { motion } from "framer-motion";
import type { PlayerAction } from "@/types/api";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<PlayerAction, string> = {
  HIT: "Hit",
  STAND: "Stand",
  DOUBLE: "Double",
  SPLIT: "Split",
  SURRENDER: "Surrender",
};

const ACTION_STYLES: Record<PlayerAction, string> = {
  HIT:       "bg-royal-600 hover:bg-royal-500 text-white shadow-royal-700/40",
  STAND:     "bg-red-700 hover:bg-red-600 text-white shadow-red-900/40",
  DOUBLE:    "bg-gold-500 hover:bg-gold-400 text-navy-900 shadow-gold-600/40",
  SPLIT:     "bg-purple-700 hover:bg-purple-600 text-white shadow-purple-900/40",
  SURRENDER: "bg-navy-600 hover:bg-navy-500 text-ivory/70 shadow-none border border-navy-500",
};

interface ActionBarProps {
  legalActions: PlayerAction[];
  onAction: (action: PlayerAction) => void;
  disabled?: boolean;
}

export function ActionBar({ legalActions, onAction, disabled }: ActionBarProps) {
  if (legalActions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 justify-center flex-wrap"
    >
      {legalActions.map((action, i) => (
        <motion.button
          key={action}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onAction(action)}
          disabled={disabled}
          className={cn(
            "px-7 py-3 rounded-xl font-semibold text-sm tracking-wide shadow-lg",
            "transition-colors duration-150",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            ACTION_STYLES[action],
          )}
        >
          {ACTION_LABELS[action]}
        </motion.button>
      ))}
    </motion.div>
  );
}
