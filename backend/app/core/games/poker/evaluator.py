from collections import Counter
from dataclasses import dataclass
from enum import IntEnum

from app.core.cards.card import Card


class HandRank(IntEnum):
    HIGH_CARD = 0
    ONE_PAIR = 1
    TWO_PAIR = 2
    THREE_OF_A_KIND = 3
    STRAIGHT = 4
    FLUSH = 5
    FULL_HOUSE = 6
    FOUR_OF_A_KIND = 7
    STRAIGHT_FLUSH = 8
    ROYAL_FLUSH = 9


@dataclass
class HandEval:
    rank: HandRank
    tiebreaker: tuple[int, ...]
    description: str

    def __gt__(self, other: "HandEval") -> bool:
        return (self.rank, self.tiebreaker) > (other.rank, other.tiebreaker)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, HandEval):
            return NotImplemented
        return (self.rank, self.tiebreaker) == (other.rank, other.tiebreaker)


def evaluate(cards: list[Card]) -> HandEval:
    vals = sorted([c.rank.value for c in cards], reverse=True)
    suits = [c.suit for c in cards]

    is_flush = len(set(suits)) == 1
    is_straight = len(set(vals)) == 5 and vals[0] - vals[4] == 4
    # Wheel: A-2-3-4-5
    if set(vals) == {14, 2, 3, 4, 5}:
        is_straight, vals = True, [5, 4, 3, 2, 1]

    counts = Counter(vals)
    groups = sorted(counts.items(), key=lambda x: (x[1], x[0]), reverse=True)
    gc = [g[1] for g in groups]
    gv = tuple(g[0] for g in groups)

    if is_straight and is_flush:
        if set(vals) == {14, 13, 12, 11, 10}:
            return HandEval(HandRank.ROYAL_FLUSH, (14,), "Royal Flush")
        return HandEval(HandRank.STRAIGHT_FLUSH, (vals[0],), "Straight Flush")
    if gc[0] == 4:
        return HandEval(HandRank.FOUR_OF_A_KIND, gv, "Four of a Kind")
    if gc[:2] == [3, 2]:
        return HandEval(HandRank.FULL_HOUSE, gv, "Full House")
    if is_flush:
        return HandEval(HandRank.FLUSH, tuple(vals), "Flush")
    if is_straight:
        return HandEval(HandRank.STRAIGHT, (vals[0],), "Straight")
    if gc[0] == 3:
        return HandEval(HandRank.THREE_OF_A_KIND, gv, "Three of a Kind")
    if gc[:2] == [2, 2]:
        return HandEval(HandRank.TWO_PAIR, gv, "Two Pair")
    if gc[0] == 2:
        return HandEval(HandRank.ONE_PAIR, gv, "One Pair")
    return HandEval(HandRank.HIGH_CARD, tuple(vals), "High Card")
