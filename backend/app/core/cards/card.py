from dataclasses import dataclass
from enum import Enum


class Suit(Enum):
    CLUBS = "C"
    DIAMONDS = "D"
    HEARTS = "H"
    SPADES = "S"

    @property
    def symbol(self) -> str:
        return {"C": "♣", "D": "♦", "H": "♥", "S": "♠"}[self.value]


class Rank(Enum):
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13
    ACE = 14

    @property
    def display(self) -> str:
        names = {11: "J", 12: "Q", 13: "K", 14: "A"}
        return names.get(self.value, str(self.value))

    @property
    def blackjack_value(self) -> int:
        if self.value >= 10:
            return 10
        return self.value


_RANK_CODE: dict[str, Rank] = {
    "2": Rank.TWO, "3": Rank.THREE, "4": Rank.FOUR, "5": Rank.FIVE,
    "6": Rank.SIX, "7": Rank.SEVEN, "8": Rank.EIGHT, "9": Rank.NINE,
    "10": Rank.TEN, "J": Rank.JACK, "Q": Rank.QUEEN, "K": Rank.KING, "A": Rank.ACE,
}
_SUIT_CODE: dict[str, Suit] = {"C": Suit.CLUBS, "D": Suit.DIAMONDS, "H": Suit.HEARTS, "S": Suit.SPADES}


@dataclass(frozen=True, slots=True)
class Card:
    rank: Rank
    suit: Suit

    def __str__(self) -> str:
        return f"{self.rank.display}{self.suit.symbol}"

    @property
    def code(self) -> str:
        return f"{self.rank.display}{self.suit.value}"

    @classmethod
    def from_code(cls, code: str) -> "Card":
        suit = _SUIT_CODE[code[-1]]
        rank = _RANK_CODE[code[:-1]]
        return cls(rank=rank, suit=suit)
