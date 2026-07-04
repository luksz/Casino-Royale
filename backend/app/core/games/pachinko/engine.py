from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.rng.rng import RNG

# (rows, risk) → list of return multipliers for slots 0..rows
# Slot k = ball that went right k times. Symmetric tables.
PAYOUTS: dict[tuple[int, str], list[float]] = {
    (8,  "low"):    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    (8,  "medium"): [13., 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.],
    (8,  "high"):   [29., 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.],
    (12, "low"):    [5.6, 2.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 2.0, 5.6],
    (12, "medium"): [33., 11., 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11., 33.],
    (12, "high"):   [170., 24., 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24., 170.],
    (16, "low"):
        [5.6, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.7, 0.5, 0.7, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 5.6],
    (16, "medium"):
        [110., 41., 10., 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10., 41., 110.],
    (16, "high"):
        [1000., 130., 26., 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26., 130., 1000.],
}

VALID_ROWS = (8, 12, 16)
VALID_RISKS = ("low", "medium", "high")
MAX_BALLS = 5


@dataclass
class BallResult:
    path: list[bool]     # True=right, False=left per row; len == rows
    slot: int            # 0-indexed landing slot = count(True in path)
    multiplier: float    # return multiplier from PAYOUTS table
    net_delta: int       # int(stake * multiplier) - stake


@dataclass
class PachinkoResult:
    balls: list[BallResult]
    total_net_delta: int
    stake_per_ball: int
    num_balls: int
    rows: int
    risk: str
    payouts: list[float]  # multiplier table used


class PachinkoEngine:
    def __init__(self, rng: RNG) -> None:
        self._rng = rng

    def drop(
        self, stake_per_ball: int, num_balls: int, rows: int, risk: str
    ) -> PachinkoResult:
        if rows not in VALID_ROWS:
            raise ValueError(f"rows must be one of {VALID_ROWS}")
        if risk not in VALID_RISKS:
            raise ValueError(f"risk must be one of {VALID_RISKS}")
        if not 1 <= num_balls <= MAX_BALLS:
            raise ValueError(f"num_balls must be 1–{MAX_BALLS}")

        payouts = PAYOUTS[(rows, risk)]
        balls: list[BallResult] = []

        for _ in range(num_balls):
            path = [self._rng.random() >= 0.5 for _ in range(rows)]
            slot = sum(1 for p in path if p)
            mult = payouts[slot]
            net_delta = int(stake_per_ball * mult) - stake_per_ball
            balls.append(BallResult(path=path, slot=slot, multiplier=mult, net_delta=net_delta))

        return PachinkoResult(
            balls=balls,
            total_net_delta=sum(b.net_delta for b in balls),
            stake_per_ball=stake_per_ball,
            num_balls=num_balls,
            rows=rows,
            risk=risk,
            payouts=payouts,
        )
