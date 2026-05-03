from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.rng.rng import RNG

POOL_SIZE = 80
DRAW_COUNT = 20

# KENO_PAYOUTS[num_picks][num_matches] = total_return_multiplier
# 0 = lose, 1 = push, >1 = win (net_delta = stake * (mult - 1))
KENO_PAYOUTS: dict[int, dict[int, int]] = {
    1:  {1: 3},
    2:  {2: 15, 1: 2},
    3:  {3: 46,  2: 3,   1: 1},
    4:  {4: 92,  3: 7,   2: 2,  1: 1},
    5:  {5: 700, 4: 23,  3: 4},
    6:  {6: 1400, 5: 76,  4: 11, 3: 2},
    7:  {7: 3500, 6: 180, 5: 26, 4: 6,  3: 2},
    8:  {8: 7000, 7: 700, 6: 90, 5: 18, 4: 4},
    9:  {9: 12000, 8: 2000, 7: 250, 6: 50, 5: 10, 4: 2},
    10: {10: 40000, 9: 4000, 8: 600, 7: 100, 6: 20, 5: 4, 4: 2},
}


@dataclass
class KenoResult:
    draws: list[int]
    picks: list[int]
    matches: list[int]
    num_matches: int
    return_multiplier: int   # 0=lose, 1=push, >1=win
    net_delta: int
    stake: int


class KenoEngine:
    def __init__(self, rng: "RNG") -> None:
        self._rng = rng

    def draw(self, picks: list[int], stake: int) -> KenoResult:
        if not 1 <= len(picks) <= 10:
            raise ValueError("Must pick 1–10 numbers")
        if not all(1 <= p <= POOL_SIZE for p in picks):
            raise ValueError(f"All picks must be 1–{POOL_SIZE}")
        if len(set(picks)) != len(picks):
            raise ValueError("Duplicate picks not allowed")

        pool = list(range(1, POOL_SIZE + 1))
        self._rng.shuffle(pool)
        draws = sorted(pool[:DRAW_COUNT])

        picks_set = set(picks)
        matches = sorted(p for p in picks if p in set(draws))
        num_matches = len(matches)
        num_picks = len(picks)

        payout_row = KENO_PAYOUTS.get(num_picks, {})
        return_multiplier = payout_row.get(num_matches, 0)
        net_delta = stake * (return_multiplier - 1) if return_multiplier > 0 else -stake

        return KenoResult(
            draws=draws,
            picks=sorted(picks),
            matches=matches,
            num_matches=num_matches,
            return_multiplier=return_multiplier,
            net_delta=net_delta,
            stake=stake,
        )
