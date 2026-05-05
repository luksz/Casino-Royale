from __future__ import annotations
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.rng.rng import RNG

RANKS = list(range(2, 15))   # 2–14, where 14 = Ace (high)
SUITS = ["C", "D", "H", "S"]
RANK_DISPLAY = {11: "J", 12: "Q", 13: "K", 14: "A"}
HOUSE_EDGE = 0.04


def _rank_display(r: int) -> str:
    return RANK_DISPLAY.get(r, str(r))


def _card_code(rank: int, suit: str) -> str:
    return f"{_rank_display(rank)}{suit}"


def _deal_card(rng: "RNG") -> tuple[int, str]:
    rank = rng.choice(RANKS)
    suit = rng.choice(SUITS)
    return rank, suit


def _multiplier_increase(current_rank: int, guess: str) -> float:
    """Per-step multiplier for a correct guess, accounting for house edge."""
    if guess == "HIGHER":
        favorable = 14 - current_rank          # strictly above
    elif guess == "LOWER":
        favorable = current_rank - 2           # strictly below
    elif guess == "HIGHER_EQ":
        favorable = 15 - current_rank          # same or above (includes equal)
    elif guess == "LOWER_EQ":
        favorable = current_rank - 1           # same or below (includes equal)
    else:
        return 0.0

    if favorable <= 0:
        return 0.0
    prob = favorable / 13
    return (1 - HOUSE_EDGE) / prob


@dataclass
class HiLoRound:
    player_id: str
    stake: int
    current_rank: int
    current_suit: str
    multiplier: float = 1.0
    active: bool = True
    history: list[str] = field(default_factory=list)

    @property
    def current_card(self) -> str:
        return _card_code(self.current_rank, self.current_suit)

    @property
    def potential_win(self) -> int:
        return int(self.stake * self.multiplier) - self.stake


@dataclass
class HiLoGuessResult:
    action: str                 # "HIGHER" | "LOWER" | "CASHOUT"
    next_card: str | None       # None on cashout or instant loss
    result: str                 # "WIN" | "LOSE" | "CASHOUT" | "TIE"
    new_multiplier: float
    net_delta: int
    round_over: bool


class HiLoEngine:
    def __init__(self, rng: "RNG") -> None:
        self._rng = rng

    def start_round(self, player_id: str, stake: int) -> HiLoRound:
        rank, suit = _deal_card(self._rng)
        return HiLoRound(player_id=player_id, stake=stake, current_rank=rank, current_suit=suit)

    def play(self, round: HiLoRound, action: str) -> HiLoGuessResult:
        if not round.active:
            raise ValueError("Round is already over")

        if action == "CASHOUT":
            round.active = False
            net_delta = int(round.stake * round.multiplier) - round.stake
            return HiLoGuessResult(
                action="CASHOUT",
                next_card=None,
                result="CASHOUT",
                new_multiplier=round.multiplier,
                net_delta=net_delta,
                round_over=True,
            )

        if action not in ("HIGHER", "LOWER", "HIGHER_EQ", "LOWER_EQ"):
            raise ValueError(f"Unknown action: {action}")

        mult_increase = _multiplier_increase(round.current_rank, action)
        if mult_increase == 0:
            # Impossible bet (e.g., HIGHER on Ace) — instant lose
            round.active = False
            return HiLoGuessResult(
                action=action,
                next_card=None,
                result="LOSE",
                new_multiplier=round.multiplier,
                net_delta=-round.stake,
                round_over=True,
            )

        next_rank, next_suit = _deal_card(self._rng)
        next_code = _card_code(next_rank, next_suit)

        is_tie = next_rank == round.current_rank
        eq_action = action in ("HIGHER_EQ", "LOWER_EQ")

        if is_tie and not eq_action:
            # Tie — free look for strict HIGHER/LOWER only
            round.current_rank = next_rank
            round.current_suit = next_suit
            round.history.append(f"TIE:{next_code}")
            return HiLoGuessResult(
                action=action,
                next_card=next_code,
                result="TIE",
                new_multiplier=round.multiplier,
                net_delta=0,
                round_over=False,
            )

        correct = (action == "HIGHER"    and next_rank >  round.current_rank) or \
                  (action == "LOWER"     and next_rank <  round.current_rank) or \
                  (action == "HIGHER_EQ" and next_rank >= round.current_rank) or \
                  (action == "LOWER_EQ"  and next_rank <= round.current_rank)

        if correct:
            round.multiplier *= mult_increase
            round.current_rank = next_rank
            round.current_suit = next_suit
            round.history.append(f"WIN:{next_code}")
            return HiLoGuessResult(
                action=action,
                next_card=next_code,
                result="WIN",
                new_multiplier=round.multiplier,
                net_delta=0,       # only realised on cashout
                round_over=False,
            )
        else:
            round.active = False
            round.history.append(f"LOSE:{next_code}")
            return HiLoGuessResult(
                action=action,
                next_card=next_code,
                result="LOSE",
                new_multiplier=round.multiplier,
                net_delta=-round.stake,
                round_over=True,
            )
