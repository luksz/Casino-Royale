export interface Player {
  id: string;
  display_name: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface BalanceResponse {
  player_id: string;
  balance: number;
}

export interface HealthResponse {
  status: string;
  app_name: string;
}

// Blackjack
export type GamePhase = "BETTING" | "DEALING" | "PLAYER_TURN" | "DEALER_TURN" | "SETTLED";
export type PlayerAction = "HIT" | "STAND" | "DOUBLE" | "SPLIT" | "SURRENDER";
export type Outcome =
  | "PLAYER_BLACKJACK"
  | "PLAYER_WIN"
  | "PUSH"
  | "DEALER_WIN"
  | "PLAYER_BUST"
  | "SURRENDER";

export interface HandState {
  cards: string[];
  value: number;
  is_soft: boolean;
  is_bust: boolean;
  is_blackjack: boolean;
}

export interface SideBetResult {
  bet_type: string;
  stake: number;
  outcome: string;
  net_delta: number;
}

export interface RoundStateResponse {
  round_id: string;
  phase: GamePhase;
  player_hands: HandState[];
  dealer_hand: HandState;
  current_hand_index: number;
  bet: number;
  legal_actions: PlayerAction[];
  outcomes: Record<string, Outcome> | null;
  net_delta: number | null;
  side_bet_results: SideBetResult[];
}
