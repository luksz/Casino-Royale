from __future__ import annotations
from dataclasses import dataclass
from math import comb, log, exp
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.rng.rng import RNG

POOL_SIZE = 80
MIN_DRAW = 1
MAX_DRAW = 40


def _hg_pmf(k: int, n_draws: int, n_picks: int, pool: int = POOL_SIZE) -> float:
    """Hypergeometric P(X=k): drawing n_draws from pool, n_picks are 'successes'."""
    if k < 0 or k > min(n_draws, n_picks):
        return 0.0
    non_picks = pool - n_picks
    non_k = n_draws - k
    if non_k < 0 or non_k > non_picks:
        return 0.0
    # Use log-space to avoid integer overflow on large C(80, 30+) values
    try:
        log_p = (
            _log_comb(n_picks, k)
            + _log_comb(non_picks, non_k)
            - _log_comb(pool, n_draws)
        )
        return exp(log_p)
    except (ValueError, OverflowError):
        return 0.0


def _log_comb(n: int, k: int) -> float:
    if k < 0 or k > n:
        return float("-inf")
    if k == 0 or k == n:
        return 0.0
    result = 0.0
    for i in range(min(k, n - k)):
        result += log(n - i) - log(i + 1)
    return result


def compute_return_multiplier(n_picks: int, n_draws: int, n_matches: int) -> int:
    """
    Total return multiplier using hypergeometric odds + 25% house edge.
    0 = lose, 1 = push, >1 = win. net_delta = stake * (mult - 1).

    Rules:
      • The player bets ON matching numbers. Matching too few = always lose,
        regardless of how unlikely the outcome was. Threshold = ceil(n_picks/2).
      • Each winning tier (min..n_picks) shares the 75% RTP target equally,
        so the per-tier payout is (0.75 / num_tiers) / P(this tier).
    """
    if n_matches == 0:
        return 0

    min_match = max(1, (n_picks + 1) // 2)
    if n_matches < min_match:
        return 0

    num_winning_tiers = n_picks - min_match + 1
    p = _hg_pmf(n_matches, n_draws, n_picks)
    if p <= 0:
        return 0

    raw = 0.75 / (p * num_winning_tiers)
    if raw < 1.4:
        return 0
    if raw < 1.9:
        return 1
    return min(int(round(raw)), 100_000)


@dataclass
class KenoResult:
    draws: list[int]
    picks: list[int]
    matches: list[int]
    num_matches: int
    draw_count: int
    return_multiplier: int   # 0=lose, 1=push, >1=win
    net_delta: int
    stake: int


class KenoEngine:
    def __init__(self, rng: "RNG") -> None:
        self._rng = rng

    def draw(self, picks: list[int], stake: int, draw_count: int = 20) -> KenoResult:
        if not 1 <= len(picks) <= 10:
            raise ValueError("Must pick 1–10 numbers")
        if not all(1 <= p <= POOL_SIZE for p in picks):
            raise ValueError(f"All picks must be 1–{POOL_SIZE}")
        if len(set(picks)) != len(picks):
            raise ValueError("Duplicate picks not allowed")
        if not MIN_DRAW <= draw_count <= MAX_DRAW:
            raise ValueError(f"draw_count must be {MIN_DRAW}–{MAX_DRAW}")

        pool = list(range(1, POOL_SIZE + 1))
        self._rng.shuffle(pool)
        draws = sorted(pool[:draw_count])

        draw_set = set(draws)
        matches = sorted(p for p in picks if p in draw_set)
        num_matches = len(matches)
        num_picks = len(picks)

        return_multiplier = compute_return_multiplier(num_picks, draw_count, num_matches)
        net_delta = stake * (return_multiplier - 1) if return_multiplier > 0 else -stake

        return KenoResult(
            draws=draws,
            picks=sorted(picks),
            matches=matches,
            num_matches=num_matches,
            draw_count=draw_count,
            return_multiplier=return_multiplier,
            net_delta=net_delta,
            stake=stake,
        )
