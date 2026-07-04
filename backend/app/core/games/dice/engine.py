from collections.abc import Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.rng.rng import RNG

# Bet type → (win_fn, push_fn, payout_multiplier)
# net_delta = stake * multiplier on win, 0 on push, -stake on loss.
# Every bet carries the classic Over/Under 7 house edge of 1/6 ≈ 16.7%:
#   HIGH/LOW win 15/36 at 1:1; SEVEN wins 6/36 at 4:1; DOUBLE wins 6/36 at 4:1;
#   ODD/EVEN win 12/36 at 1:1 with a 6/36 push (7 pushes; doubles lose Even).
_NEVER = lambda d1, d2: False  # noqa: E731

_Cond = Callable[[int, int], bool]
_BETS: dict[str, tuple[_Cond, _Cond, int]] = {
    "HIGH":       (lambda d1, d2: d1 + d2 >= 8, _NEVER, 1),
    "LOW":        (lambda d1, d2: d1 + d2 <= 6, _NEVER, 1),
    "SEVEN":      (lambda d1, d2: d1 + d2 == 7, _NEVER, 4),
    "ANY_DOUBLE": (lambda d1, d2: d1 == d2,     _NEVER, 4),
    "ODD":        (lambda d1, d2: (d1 + d2) % 2 == 1 and d1 + d2 != 7,
                   lambda d1, d2: d1 + d2 == 7, 1),
    "EVEN":       (lambda d1, d2: (d1 + d2) % 2 == 0 and d1 != d2,
                   lambda d1, d2: d1 + d2 == 7, 1),
}


@dataclass
class DiceResult:
    die1: int
    die2: int
    total: int
    is_double: bool
    bet_type: str
    won: bool
    push: bool
    net_delta: int


class DiceEngine:
    def __init__(self, rng: "RNG") -> None:
        self._rng = rng

    def roll(self, bet_type: str, stake: int) -> DiceResult:
        if bet_type not in _BETS:
            raise ValueError(f"Unknown bet type: {bet_type}")

        d1 = self._rng.randint(1, 6)
        d2 = self._rng.randint(1, 6)
        total = d1 + d2

        win_fn, push_fn, multiplier = _BETS[bet_type]
        won = win_fn(d1, d2)
        push = not won and push_fn(d1, d2)
        net_delta = stake * multiplier if won else (0 if push else -stake)

        return DiceResult(
            die1=d1,
            die2=d2,
            total=total,
            is_double=(d1 == d2),
            bet_type=bet_type,
            won=won,
            push=push,
            net_delta=net_delta,
        )
