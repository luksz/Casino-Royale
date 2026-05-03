from dataclasses import dataclass

from app.core.cards.shoe import Shoe


@dataclass
class WarResult:
    player_card: str
    dealer_card: str
    result: str  # "WIN" | "LOSE" | "WAR_WIN" | "WAR_LOSE"
    war_player_card: str | None
    war_dealer_card: str | None
    net_delta: int


class WarEngine:
    def __init__(self, rng) -> None:
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

        # War — burn 3 each, deal one more
        self._shoe.draw_many(min(6, len(self._shoe)))
        p2 = self._shoe.draw()
        d2 = self._shoe.draw()
        result = "WAR_WIN" if p2.rank.value >= d2.rank.value else "WAR_LOSE"
        net = stake if result == "WAR_WIN" else -stake
        return WarResult(pc.code, dc.code, result, p2.code, d2.code, net)
