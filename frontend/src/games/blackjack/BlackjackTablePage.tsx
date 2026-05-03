import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { useBlackjack } from "@/hooks/useBlackjack";
import { BetControl } from "@/components/casino/BetControl";
import { Hand } from "@/components/cards/Hand";
import { ActionBar } from "./ActionBar";
import type { PlayerAction } from "@/types/api";

const OUTCOME_MESSAGES: Record<string, { text: string; color: string }> = {
  PLAYER_BLACKJACK: { text: "Blackjack! 🎉", color: "text-gold-400" },
  PLAYER_WIN:       { text: "You Win! ✨",   color: "text-green-400" },
  PUSH:             { text: "Push",           color: "text-ivory" },
  DEALER_WIN:       { text: "Dealer Wins",    color: "text-red-400" },
  PLAYER_BUST:      { text: "Bust!",          color: "text-red-400" },
  SURRENDER:        { text: "Surrendered",    color: "text-ivory/60" },
};

export default function BlackjackTablePage() {
  const navigate = useNavigate();
  const { currentPlayerId, currentPlayerName, recordRound } = useSessionStore();
  const { data: balanceData } = usePlayerBalance(currentPlayerId);
  const { cardDeal, win, lose } = useSound();
  const [bet, setBet] = useState(0);
  const [actionBadge, setActionBadge] = useState<string | null>(null);
  const badgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { state, startRound, sendAction, isLoading } = useBlackjack(currentPlayerId ?? "");

  useEffect(() => {
    if (state?.phase === "SETTLED" && state.net_delta != null) {
      recordRound("Blackjack", state.net_delta);
      state.net_delta > 0 ? win() : lose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const isSettled = state?.phase === "SETTLED";
  const isPlayerTurn = state?.phase === "PLAYER_TURN";
  const isDealerTurn = state?.phase === "DEALER_TURN";
  const isBetting = !state || isSettled;

  const showBadge = useCallback((label: string) => {
    setActionBadge(label);
    if (badgeTimer.current) clearTimeout(badgeTimer.current);
    badgeTimer.current = setTimeout(() => setActionBadge(null), 900);
  }, []);

  function handleAction(action: PlayerAction) {
    showBadge(action === "HIT" ? "Hit" : action === "STAND" ? "Stand" : action === "DOUBLE" ? "Double!" : action === "SPLIT" ? "Split" : "Surrender");
    sendAction.mutate(action);
  }

  function handleDeal() {
    if (bet <= 0) return;
    cardDeal();
    startRound.mutate(bet);
    setBet(0);
  }

  const outcomeKey = state?.outcomes ? Object.values(state.outcomes)[0] : null;
  const outcome = outcomeKey ? OUTCOME_MESSAGES[outcomeKey] : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-royal-700/20 bg-navy-900/60 backdrop-blur-sm">
        <Link to="/lobby" className="text-ivory/30 hover:text-ivory/70 text-sm transition-colors">
          ← Lobby
        </Link>
        <h1 className="font-display text-2xl text-gold-400 tracking-wide">Blackjack</h1>
        <div className="text-right">
          <p className="text-ivory/30 text-xs">{currentPlayerName}</p>
          <p className="text-gold-400 font-semibold tabular-nums">{balance.toLocaleString()} chips</p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col items-center justify-between py-8 px-4 gap-4 max-w-2xl mx-auto w-full">

        {/* Dealer zone */}
        <div className="w-full table-zone p-6 flex flex-col items-center gap-2 min-h-[160px] justify-center">
          {state ? (
            <>
              <Hand
                hand={state.dealer_hand}
                label="Dealer"
                hideHole={isPlayerTurn}
              />
              {isDealerTurn && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-xs text-royal-400 mt-1"
                >
                  Dealer drawing…
                </motion.p>
              )}
            </>
          ) : (
            <p className="text-ivory/10 text-sm uppercase tracking-widest">Dealer</p>
          )}
        </div>

        {/* Result banner */}
        <AnimatePresence>
          {isSettled && outcome && (
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="card-surface px-10 py-4 text-center w-full"
            >
              <p className={`font-display text-3xl font-bold ${outcome.color}`}>
                {outcome.text}
              </p>
              {state?.net_delta != null && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`text-lg font-semibold mt-1 ${
                    state.net_delta > 0 ? "text-green-400" : state.net_delta < 0 ? "text-red-400" : "text-ivory/50"
                  }`}
                >
                  {state.net_delta > 0 ? `+${state.net_delta}` : state.net_delta} chips
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player hands zone */}
        <div className="w-full table-zone p-6 flex justify-center gap-8 flex-wrap min-h-[160px] items-center">
          {state ? (
            state.player_hands.map((hand, i) => (
              <Hand
                key={i}
                hand={hand}
                label={state.player_hands.length > 1 ? `Hand ${i + 1}` : "You"}
                isActive={isPlayerTurn && i === state.current_hand_index}
                actionBadge={i === state.current_hand_index ? actionBadge : null}
              />
            ))
          ) : (
            <p className="text-ivory/10 text-sm uppercase tracking-widest">Your hand</p>
          )}
        </div>

        {/* Controls zone */}
        <div className="w-full card-surface p-6">
          <AnimatePresence mode="wait">
            {isBetting ? (
              <motion.div
                key="betting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4"
              >
                <BetControl
                  bet={bet}
                  onAdd={(v) => setBet((b) => b + v)}
                  onClear={() => setBet(0)}
                  onAllIn={() => setBet(balance)}
                  disabled={isLoading}
                  maxBet={balance}
                />
                <button
                  onClick={handleDeal}
                  disabled={bet <= 0 || isLoading || bet > balance}
                  className="btn-primary w-full max-w-xs text-base"
                >
                  {isLoading ? "Dealing…" : "Deal"}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ActionBar
                  legalActions={state?.legal_actions ?? []}
                  onAction={handleAction}
                  disabled={isLoading}
                />
                {(isSettled) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center mt-4"
                  >
                    <button
                      onClick={() => { setBet(0); }}
                      className="btn-ghost text-sm"
                    >
                      New Round
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
