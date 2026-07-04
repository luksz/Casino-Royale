from dataclasses import dataclass

from app.core.cards.shoe import Shoe
from app.core.rng.rng import RNG


@dataclass
class WarResult:
    player_card: str
    dealer_card: str
    result: str  # "WIN" | "LOSE" | "WAR_WIN" | "WAR_LOSE"
    war_player_card: str | None
    war_dealer_card: str | None
    net_delta: int


class WarEngine:
    def __init__(self, rng: RNG) -> None:
        self._shoe = Shoe(rng, decks=6)

    def play(self, stake: int) -> WarResult:
        if self._shoe.penetration > 0.75:
            self._shoe.reshuffle()

        pc = self._shoe.draw()
        dc = self._shoe.draw()
        pv, dv = pc.rank.value, dc.rank.value

        if pv > dv:
            return WarResult(pc.code, dc.code, "WIN", None, None, stake)
        if dv > pv:
            return WarResult(pc.code, dc.code, "LOSE", None, None, -stake)

        # War — an equal raise goes up, so 2× stake is now at risk.
        # Win the war: original bet pays, raise is returned (net +stake).
        # Tie again: bonus pays double (net +2×stake). Lose: both bets lost.
        self._shoe.draw_many(min(6, len(self._shoe)))
        p2 = self._shoe.draw()
        d2 = self._shoe.draw()
        if p2.rank.value > d2.rank.value:
            return WarResult(pc.code, dc.code, "WAR_WIN", p2.code, d2.code, stake)
        if p2.rank.value == d2.rank.value:
            return WarResult(pc.code, dc.code, "WAR_WIN", p2.code, d2.code, 2 * stake)
        return WarResult(pc.code, dc.code, "WAR_LOSE", p2.code, d2.code, -2 * stake)
