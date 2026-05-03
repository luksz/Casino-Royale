from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.rng.rng import RNG

# Bet type → (condition_fn, payout_multiplier)
# net_delta = stake * multiplier on win, -stake on loss
_BETS: dict[str, tuple] = {
    "HIGH":       (lambda d1, d2: d1 + d2 >= 8,  1),   # 15/36 ≈ 41.7%
    "LOW":        (lambda d1, d2: d1 + d2 <= 6,  1),   # 15/36 ≈ 41.7%
    "SEVEN":      (lambda d1, d2: d1 + d2 == 7,  4),   # 6/36  ≈ 16.7%
    "ANY_DOUBLE": (lambda d1, d2: d1 == d2,       5),  # 6/36  ≈ 16.7%
    "ODD":        (lambda d1, d2: (d1 + d2) % 2 == 1, 1),
    "EVEN":       (lambda d1, d2: (d1 + d2) % 2 == 0, 1),
}


@dataclass
class DiceResult:
    die1: int
    die2: int
    total: int
    is_double: bool
    bet_type: str
    won: bool
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

        condition, multiplier = _BETS[bet_type]
        won = condition(d1, d2)
        net_delta = stake * multiplier if won else -stake

        return DiceResult(
            die1=d1,
            die2=d2,
            total=total,
            is_double=(d1 == d2),
            bet_type=bet_type,
            won=won,
            net_delta=net_delta,
        )
