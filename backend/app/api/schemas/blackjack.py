from pydantic import BaseModel

from app.core.games.blackjack.state import GamePhase, Outcome, PlayerAction


class StartRoundRequest(BaseModel):
    player_id: str
    bet: int
    perfect_pairs: int = 0
    twenty_one_three: int = 0


class ActionRequest(BaseModel):
    action: PlayerAction


class HandStateResponse(BaseModel):
    cards: list[str]
    value: int
    is_soft: bool
    is_bust: bool
    is_blackjack: bool


class SideBetResultResponse(BaseModel):
    bet_type: str
    stake: int
    outcome: str
    net_delta: int


class RoundStateResponse(BaseModel):
    round_id: str
    phase: GamePhase
    player_hands: list[HandStateResponse]
    dealer_hand: HandStateResponse
    current_hand_index: int
    bet: int
    legal_actions: list[PlayerAction]
    outcomes: dict[str, Outcome] | None
    net_delta: int | None
    side_bet_results: list[SideBetResultResponse] = []
