from __future__ import annotations
from typing import TYPE_CHECKING

from app.core.cards.card import Card, Rank, Suit

if TYPE_CHECKING:
    from app.core.rng.rng import RNG


class EmptyShoeError(Exception):
    pass


def build_standard_deck() -> list[Card]:
    return [Card(rank=rank, suit=suit) for suit in Suit for rank in Rank]


class Shoe:
    def __init__(self, rng: "RNG", decks: int = 1) -> None:
        self._rng = rng
        self._decks = decks
        self._total = 52 * decks
        self._cards: list[Card] = []
        self.reshuffle()

    def reshuffle(self) -> None:
        self._cards = build_standard_deck() * self._decks
        self._rng.shuffle(self._cards)

    def draw(self) -> Card:
        if not self._cards:
            raise EmptyShoeError("Shoe is empty")
        return self._cards.pop()

    def draw_many(self, n: int) -> list[Card]:
        return [self.draw() for _ in range(n)]

    @property
    def penetration(self) -> float:
        return 1.0 - len(self._cards) / self._total

    def __len__(self) -> int:
        return len(self._cards)
