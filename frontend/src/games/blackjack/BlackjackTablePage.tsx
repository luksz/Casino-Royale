import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionStore } from "@/store/sessionStore";
import { usePlayerBalance } from "@/hooks/usePlayer";
import { useSound } from "@/hooks/useSound";
import { useBlackjack } from "@/hooks/useBlackjack";
import { Chip } from "@/components/casino/Chip";
import { ChipStack } from "@/components/casino/ChipStack";
import { Hand } from "@/components/cards/Hand";
import { ActionBar } from "./ActionBar";
import { cn } from "@/lib/utils";
import type { PlayerAction } from "@/types/api";

const OUTCOME_MESSAGES: Record<string, { text: string; color: string }> = {
  PLAYER_BLACKJACK: { text: "Blackjack! 🎉", color: "text-gold-400" },
  PLAYER_WIN:       { text: "You Win!",      color: "text-green-400" },
  PUSH:             { text: "Push",           color: "text-ivory" },
  DEALER_WIN:       { text: "Dealer Wins",    color: "text-red-400" },
  PLAYER_BUST:      { text: "Bust!",          color: "text-red-400" },
  SURRENDER:        { text: "Surrendered",    color: "text-ivory/60" },
};

const CHIP_VALUES = [1, 5, 25, 100, 500, 1000, 5000];

const SIDE_BET_OUTCOME_LABEL: Record<string, string> = {
  PERFECT_PAIR:    "Perfect Pair 25:1",
  COLORED_PAIR:    "Colored Pair 10:1",
  MIXED_PAIR:      "Mixed Pair 5:1",
  SUITED_TRIPS:    "Suited Trips 100:1",
  STRAIGHT_FLUSH:  "Straight Flush 40:1",
  THREE_OF_A_KIND: "Three of a Kind 30:1",
  STRAIGHT:        "Straight 10:1",
  FLUSH:           "Flush 5:1",
};

export default function BlackjackTablePage() {
  const navigate = useNavigate();
  const { currentPlayerId, currentPlayerName, recordRound } = useSessionStore();
  const { data: balanceData, refetch } = usePlayerBalance(currentPlayerId);
  const { cardDeal, win, lose } = useSound();

  const [bet, setBet] = useState(0);
  const [ppBet, setPpBet] = useState(0);
  const [t21Bet, setT21Bet] = useState(0);
  const [lastBet, setLastBet] = useState(0);
  const [lastPpBet, setLastPpBet] = useState(0);
  const [lastT21Bet, setLastT21Bet] = useState(0);
  const [actionBadge, setActionBadge] = useState<string | null>(null);
  const badgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { state, startRound, sendAction, isLoading } = useBlackjack(currentPlayerId ?? "");

  useEffect(() => {
    if (state?.phase === "SETTLED" && state.net_delta != null) {
      const sideDelta = (state.side_bet_results ?? []).reduce((s, r) => s + r.net_delta, 0);
      recordRound("Blackjack", state.net_delta + sideDelta);
      refetch();
      (state.net_delta + sideDelta) > 0 ? win() : lose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  if (!currentPlayerId) { navigate("/"); return null; }

  const balance = balanceData?.balance ?? 0;
  const isSettled = state?.phase === "SETTLED";
  const isPlayerTurn = state?.phase === "PLAYER_TURN";
  const isDealerTurn = state?.phase === "DEALER_TURN";
  const isBetting = !state || isSettled;

  const totalBetting = bet + ppBet + t21Bet;
  const lastTotal = lastBet + lastPpBet + lastT21Bet;

  const showBadge = useCallback((label: string) => {
    setActionBadge(label);
    if (badgeTimer.current) clearTimeout(badgeTimer.current);
    badgeTimer.current = setTimeout(() => setActionBadge(null), 900);
  }, []);

  function handleAction(action: PlayerAction) {
    showBadge(
      action === "HIT" ? "Hit"
      : action === "STAND" ? "Stand"
      : action === "DOUBLE" ? "Double!"
      : action === "SPLIT" ? "Split"
      : "Surrender"
    );
    sendAction.mutate(action);
  }

  function handleDeal() {
    if (bet <= 0) return;
    cardDeal();
    setLastBet(bet);
    setLastPpBet(ppBet);
    setLastT21Bet(t21Bet);
    startRound.mutate({ bet, perfect_pairs: ppBet, twenty_one_three: t21Bet });
    setBet(0);
    setPpBet(0);
    setT21Bet(0);
  }

  function applyRebetTransform(transform?: (v: number) => number) {
    setBet(transform ? transform(lastBet) : lastBet);
    setPpBet(transform ? transform(lastPpBet) : lastPpBet);
    setT21Bet(transform ? transform(lastT21Bet) : lastT21Bet);
  }

  const outcomeKey = state?.outcomes ? Object.values(state.outcomes)[0] : null;
  const outcome = outcomeKey ? OUTCOME_MESSAGES[outcomeKey] : null;
  const sideBetResults = state?.side_bet_results ?? [];
  const sideDeltaTotal = sideBetResults.reduce((s, r) => s + r.net_delta, 0);

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
      <div className="flex-1 flex flex-col items-center justify-between py-6 px-4 gap-4 max-w-2xl mx-auto w-full">

        {/* Dealer zone */}
        <div className="w-full table-zone p-6 flex flex-col items-center gap-2 min-h-[140px] justify-center">
          {state ? (
            <>
              <Hand hand={state.dealer_hand} label="Dealer" hideHole={isPlayerTurn} />
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
              className="card-surface px-8 py-4 text-center w-full"
            >
              <p className={`font-display text-3xl font-bold ${outcome.color}`}>{outcome.text}</p>
              {state?.net_delta != null && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`text-lg font-semibold mt-1 ${
                    (state.net_delta + sideDeltaTotal) > 0 ? "text-green-400"
                    : (state.net_delta + sideDeltaTotal) < 0 ? "text-red-400"
                    : "text-ivory/50"
                  }`}
                >
                  {(state.net_delta + sideDeltaTotal) > 0 ? "+" : ""}
                  {(state.net_delta + sideDeltaTotal).toLocaleString()} chips
                </motion.p>
              )}
              {/* Side bet results */}
              {sideBetResults.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {sideBetResults.map((r, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-xs border px-2 py-0.5 rounded-full",
                        r.net_delta > 0
                          ? "bg-green-500/15 text-green-400 border-green-500/30"
                          : "bg-red-500/10 text-red-400/80 border-red-500/20"
                      )}
                    >
                      {r.net_delta > 0
                        ? `${SIDE_BET_OUTCOME_LABEL[r.outcome] ?? r.outcome} +${r.net_delta}`
                        : `${r.bet_type === "PERFECT_PAIRS" ? "PP" : "21+3"} −${r.stake}`
                      }
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player hands zone */}
        <div className="w-full table-zone p-6 flex justify-center gap-8 flex-wrap min-h-[140px] items-center">
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
        <div className="w-full card-surface p-5">
          <AnimatePresence mode="wait">
            {isBetting ? (
              <motion.div
                key="betting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4"
              >
                {/* Main bet */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <p className="text-ivory/50 text-xs uppercase tracking-widest">Main Bet</p>
                  <div className="flex items-center gap-3 min-h-[40px]">
                    {bet > 0 ? (
                      <>
                        <ChipStack amount={bet} size={36} />
                        <p className="font-display text-3xl text-gold-400 font-bold tabular-nums">
                          {bet.toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="font-display text-3xl text-ivory/20 font-bold">0</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {CHIP_VALUES.map(v => (
                      <Chip
                        key={v}
                        value={v}
                        disabled={isLoading || bet + v > balance}
                        onClick={() => setBet(b => b + v)}
                      />
                    ))}
                    {balance > 500 && (
                      <button
                        onClick={() => setBet(balance - ppBet - t21Bet)}
                        disabled={isLoading || balance - ppBet - t21Bet <= 0}
                        className={cn(
                          "px-3 h-12 rounded-full font-bold text-xs border-4 transition-all disabled:opacity-30",
                          "border-gold-600/40 bg-navy-800 text-gold-500/70 hover:text-gold-400 hover:border-gold-400/60"
                        )}
                      >
                        All In
                      </button>
                    )}
                  </div>
                </div>

                {/* Side bets */}
                <div className="w-full border-t border-royal-700/20 pt-3 flex gap-4">
                  {/* Perfect Pairs */}
                  <SideBetRow
                    label="Perfect Pairs"
                    amount={ppBet}
                    onAdd={v => setPpBet(p => p + v)}
                    onClear={() => setPpBet(0)}
                    maxAdd={balance - bet - t21Bet - ppBet}
                    disabled={isLoading}
                  />
                  {/* 21+3 */}
                  <SideBetRow
                    label="21 + 3"
                    amount={t21Bet}
                    onAdd={v => setT21Bet(p => p + v)}
                    onClear={() => setT21Bet(0)}
                    maxAdd={balance - bet - ppBet - t21Bet}
                    disabled={isLoading}
                  />
                </div>

                {/* Re-bet row */}
                {lastBet > 0 && (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => applyRebetTransform()}
                      disabled={isLoading || lastTotal > balance}
                      className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory hover:border-royal-400/70 text-xs font-semibold transition-all disabled:opacity-30"
                    >
                      Re-bet <span className="text-ivory/40">({lastTotal})</span>
                    </button>
                    <button
                      onClick={() => applyRebetTransform(v => Math.max(0, Math.floor(v / 2)))}
                      disabled={isLoading}
                      className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory hover:border-royal-400/70 text-xs font-semibold transition-all disabled:opacity-30"
                    >
                      ½ Bet
                    </button>
                    <button
                      onClick={() => applyRebetTransform(v => v * 2)}
                      disabled={isLoading || lastTotal * 2 > balance}
                      className="flex-1 py-2 rounded-lg border border-royal-600/50 text-ivory/70 hover:text-ivory hover:border-royal-400/70 text-xs font-semibold transition-all disabled:opacity-30"
                    >
                      ×2 Bet
                    </button>
                  </div>
                )}

                {/* Clear + Deal */}
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => { setBet(0); setPpBet(0); setT21Bet(0); }}
                    disabled={totalBetting === 0 || isLoading}
                    className="btn-ghost flex-1 text-sm py-2"
                  >
                    Clear{totalBetting > 0 ? ` (${totalBetting.toLocaleString()})` : ""}
                  </button>
                  <button
                    onClick={handleDeal}
                    disabled={bet <= 0 || isLoading || totalBetting > balance}
                    className="btn-primary flex-1 text-sm py-3"
                  >
                    {isLoading ? "Dealing…" : `Deal · ${totalBetting.toLocaleString()}`}
                  </button>
                </div>
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
                {isSettled && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center mt-4"
                  >
                    <button onClick={() => { setBet(0); setPpBet(0); setT21Bet(0); }} className="btn-ghost text-sm">
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

interface SideBetRowProps {
  label: string;
  amount: number;
  onAdd: (v: number) => void;
  onClear: () => void;
  maxAdd: number;
  disabled?: boolean;
}

function SideBetRow({ label, amount, onAdd, onClear, maxAdd, disabled }: SideBetRowProps) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <p className="text-ivory/40 text-[10px] uppercase tracking-wider">{label}</p>
      <p className={cn("font-bold text-sm tabular-nums", amount > 0 ? "text-gold-400" : "text-ivory/20")}>
        {amount > 0 ? amount.toLocaleString() : "—"}
      </p>
      <div className="flex gap-1">
        {[1, 5, 25, 100].map(v => (
          <button
            key={v}
            onClick={() => onAdd(v)}
            disabled={disabled || v > maxAdd}
            className="w-8 h-8 rounded-full border-2 font-bold text-[10px] transition-all disabled:opacity-30
              bg-gray-800 border-gray-600 text-white hover:border-gray-400 active:scale-95"
          >
            {v}
          </button>
        ))}
        {amount > 0 && (
          <button
            onClick={onClear}
            disabled={disabled}
            className="w-8 h-8 rounded-full border-2 font-bold text-[10px] transition-all disabled:opacity-30
              bg-red-900/30 border-red-700/50 text-red-400 hover:border-red-500"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
