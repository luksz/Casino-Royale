from dataclasses import dataclass

from app.core.cards.card import Card, Rank, Suit


_RED_SUITS = {Suit.HEARTS, Suit.DIAMONDS}


def _color(card: Card) -> str:
    return "red" if card.suit in _RED_SUITS else "black"


def _21_3_ranks(rank: Rank) -> list[int]:
    """Rank values for 21+3 straights; Ace can be 1 or 14."""
    if rank == Rank.ACE:
        return [1, 14]
    return [rank.value]  # TWO=2 … JACK=11, QUEEN=12, KING=13


def _is_flush(a: Card, b: Card, c: Card) -> bool:
    return a.suit == b.suit == c.suit


def _is_straight(a: Card, b: Card, c: Card) -> bool:
    for va in _21_3_ranks(a.rank):
        for vb in _21_3_ranks(b.rank):
            for vc in _21_3_ranks(c.rank):
                s = sorted([va, vb, vc])
                if s[0] + 1 == s[1] and s[1] + 1 == s[2]:
                    return True
    return False


def _is_trips(a: Card, b: Card, c: Card) -> bool:
    return a.rank == b.rank == c.rank


@dataclass
class SideBetResult:
    bet_type: str
    stake: int
    outcome: str
    net_delta: int   # profit only (positive = win, negative = loss)


# ---------------------------------------------------------------------------
# Perfect Pairs — resolved from first two player cards
# ---------------------------------------------------------------------------
PERFECT_PAIRS_PAYOUTS = {
    "PERFECT_PAIR":  25,   # same rank + same suit
    "COLORED_PAIR":  10,   # same rank + same color, different suits
    "MIXED_PAIR":     5,   # same rank, different colors
}


def evaluate_perfect_pairs(card1: Card, card2: Card, stake: int) -> SideBetResult:
    if card1.rank != card2.rank:
        return SideBetResult("PERFECT_PAIRS", stake, "LOSE", -stake)
    if card1.suit == card2.suit:
        return SideBetResult("PERFECT_PAIRS", stake, "PERFECT_PAIR", stake * 25)
    if _color(card1) == _color(card2):
        return SideBetResult("PERFECT_PAIRS", stake, "COLORED_PAIR", stake * 10)
    return SideBetResult("PERFECT_PAIRS", stake, "MIXED_PAIR", stake * 5)


# ---------------------------------------------------------------------------
# 21+3 — resolved from two player cards + dealer upcard
# ---------------------------------------------------------------------------
TWENTY_ONE_THREE_PAYOUTS = {
    "SUITED_TRIPS":    100,
    "STRAIGHT_FLUSH":   40,
    "THREE_OF_A_KIND":  30,
    "STRAIGHT":         10,
    "FLUSH":             5,
}


def evaluate_21_3(p1: Card, p2: Card, dealer_up: Card, stake: int) -> SideBetResult:
    flush    = _is_flush(p1, p2, dealer_up)
    straight = _is_straight(p1, p2, dealer_up)
    trips    = _is_trips(p1, p2, dealer_up)

    if trips and flush:
        return SideBetResult("21_3", stake, "SUITED_TRIPS",    stake * 100)
    if straight and flush:
        return SideBetResult("21_3", stake, "STRAIGHT_FLUSH",  stake * 40)
    if trips:
        return SideBetResult("21_3", stake, "THREE_OF_A_KIND", stake * 30)
    if straight:
        return SideBetResult("21_3", stake, "STRAIGHT",        stake * 10)
    if flush:
        return SideBetResult("21_3", stake, "FLUSH",           stake * 5)
    return SideBetResult("21_3", stake, "LOSE", -stake)
