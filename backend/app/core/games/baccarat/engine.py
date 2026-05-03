from dataclasses import dataclass
from enum import Enum

from app.core.cards.card import Card, Rank
from app.core.cards.shoe import Shoe


class BaccaratBet(Enum):
    PLAYER = "PLAYER"
    BANKER = "BANKER"
    TIE = "TIE"


def _val(card: Card) -> int:
    if card.rank in (Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING):
        return 0
    if card.rank == Rank.ACE:
        return 1
    return card.rank.value


def _score(cards: list[Card]) -> int:
    return sum(_val(c) for c in cards) % 10


@dataclass
class BaccaratResult:
    player_cards: list[str]
    banker_cards: list[str]
    player_score: int
    banker_score: int
    winner: str
    bet: str
    stake: int
    net_delta: int


class BaccaratEngine:
    def __init__(self, rng) -> None:
        self._shoe = Shoe(rng, decks=8)

    def play(self, bet: BaccaratBet, stake: int) -> BaccaratResult:
        if self._shoe.penetration > 0.75:
            self._shoe.reshuffle()

        player = [self._shoe.draw(), self._shoe.draw()]
        banker = [self._shoe.draw(), self._shoe.draw()]
        ps, bs = _score(player), _score(banker)

        if ps < 8 and bs < 8:
            if ps <= 5:
                player.append(self._shoe.draw())
                tv = _val(player[-1])
                if bs <= 2:
                    banker.append(self._shoe.draw())
                elif bs == 3 and tv != 8:
                    banker.append(self._shoe.draw())
                elif bs == 4 and tv in {2, 3, 4, 5, 6, 7}:
                    banker.append(self._shoe.draw())
                elif bs == 5 and tv in {4, 5, 6, 7}:
                    banker.append(self._shoe.draw())
                elif bs == 6 and tv in {6, 7}:
                    banker.append(self._shoe.draw())
            elif bs <= 5:
                banker.append(self._shoe.draw())

        ps, bs = _score(player), _score(banker)
        winner = "PLAYER" if ps > bs else "BANKER" if bs > ps else "TIE"

        if bet == BaccaratBet.TIE:
            net = stake * 8 if winner == "TIE" else -stake
        elif bet == BaccaratBet.PLAYER:
            net = stake if winner == "PLAYER" else (0 if winner == "TIE" else -stake)
        else:
            net = int(stake * 0.95) if winner == "BANKER" else (0 if winner == "TIE" else -stake)

        return BaccaratResult(
            player_cards=[c.code for c in player],
            banker_cards=[c.code for c in banker],
            player_score=ps,
            banker_score=bs,
            winner=winner,
            bet=bet.value,
            stake=stake,
            net_delta=net,
        )
