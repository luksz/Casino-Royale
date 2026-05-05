from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.rng.rng import RNG

POOL_SIZE = 49
PICK_COUNT = 6

# (main_matches, bonus_hit) → return multiplier (0=lose, >1=win)
PRIZE_TIERS: dict[tuple[int, bool], int] = {
    (6, False): 50_000,   # Jackpot
    (5, True):  50_000,   # Group 2: 5 main + bonus
    (5, False): 40_000,   # Group 3: 5 main
    (4, True):  16_000,   # Group 4: 4 main + bonus
    (4, False):    800,   # Group 5: 4 main
    (3, True):     600,   # Group 6: 3 main + bonus
    (3, False):     46,   # Group 7: 3 main
}


@dataclass
class TotoResult:
    main_draws: list[int]    # 6 winning numbers, sorted
    bonus: int               # 1 bonus number
    picks: list[int]         # player's 6 picks, sorted
    main_matches: list[int]  # picks that matched main draws
    bonus_hit: bool          # whether a non-matching pick hit the bonus
    num_main_matches: int
    prize_tier: str          # e.g. "Group 1 – Jackpot" or "No Prize"
    return_multiplier: int   # 0=lose, >1=win
    net_delta: int
    stake: int


def _tier_label(main_matches: int, bonus_hit: bool) -> str:
    labels = {
        (6, False): "Group 1 – Jackpot",
        (5, True):  "Group 2",
        (5, False): "Group 3",
        (4, True):  "Group 4",
        (4, False): "Group 5",
        (3, True):  "Group 6",
        (3, False): "Group 7",
    }
    return labels.get((main_matches, bonus_hit), "No Prize")


class TotoEngine:
    def __init__(self, rng: "RNG") -> None:
        self._rng = rng

    def draw(self, picks: list[int], stake: int) -> TotoResult:
        if len(picks) != PICK_COUNT:
            raise ValueError(f"Must pick exactly {PICK_COUNT} numbers")
        if not all(1 <= p <= POOL_SIZE for p in picks):
            raise ValueError(f"All picks must be 1–{POOL_SIZE}")
        if len(set(picks)) != len(picks):
            raise ValueError("Duplicate picks not allowed")

        pool = list(range(1, POOL_SIZE + 1))
        self._rng.shuffle(pool)
        main_draws = sorted(pool[:PICK_COUNT])
        bonus = pool[PICK_COUNT]  # next number after main draws

        picks_set = set(picks)
        main_set = set(main_draws)

        main_matches = sorted(p for p in picks if p in main_set)
        num_main = len(main_matches)

        # Bonus only applies to picks that did NOT match main draws
        non_matching_picks = picks_set - main_set
        bonus_hit = bonus in non_matching_picks

        return_multiplier = PRIZE_TIERS.get((num_main, bonus_hit), 0)
        # If no bonus prize but check without bonus flag for tier (e.g. 5 matches regardless of bonus)
        # Already handled: (5, True) and (5, False) are separate keys
        net_delta = stake * (return_multiplier - 1) if return_multiplier > 0 else -stake

        return TotoResult(
            main_draws=main_draws,
            bonus=bonus,
            picks=sorted(picks),
            main_matches=main_matches,
            bonus_hit=bonus_hit,
            num_main_matches=num_main,
            prize_tier=_tier_label(num_main, bonus_hit),
            return_multiplier=return_multiplier,
            net_delta=net_delta,
            stake=stake,
        )
