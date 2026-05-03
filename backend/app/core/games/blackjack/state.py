from dataclasses import dataclass, field
from enum import Enum

from app.core.games.blackjack.hand import BlackjackHand


class GamePhase(Enum):
    BETTING = "BETTING"
    DEALING = "DEALING"
    PLAYER_TURN = "PLAYER_TURN"
    DEALER_TURN = "DEALER_TURN"
    SETTLED = "SETTLED"


class PlayerAction(Enum):
    HIT = "HIT"
    STAND = "STAND"
    DOUBLE = "DOUBLE"
    SPLIT = "SPLIT"
    SURRENDER = "SURRENDER"


class Outcome(Enum):
    PLAYER_BLACKJACK = "PLAYER_BLACKJACK"
    PLAYER_WIN = "PLAYER_WIN"
    PUSH = "PUSH"
    DEALER_WIN = "DEALER_WIN"
    PLAYER_BUST = "PLAYER_BUST"
    SURRENDER = "SURRENDER"


@dataclass
class BlackjackState:
    phase: GamePhase = GamePhase.BETTING
    player_hands: list[BlackjackHand] = field(default_factory=list)
    dealer_hand: BlackjackHand = field(default_factory=BlackjackHand)
    current_hand_index: int = 0
    bet: int = 0
    available_actions: list[PlayerAction] = field(default_factory=list)
    outcomes: dict[int, Outcome] | None = None
    net_delta: int | None = None
