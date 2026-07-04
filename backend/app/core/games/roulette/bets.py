from dataclasses import dataclass
from enum import Enum

from app.core.games.roulette.wheel import COLUMN_1, COLUMN_2, COLUMN_3, RED


class BetType(Enum):
    STRAIGHT = "STRAIGHT"
    RED = "RED"
    BLACK = "BLACK"
    ODD = "ODD"
    EVEN = "EVEN"
    LOW = "LOW"
    HIGH = "HIGH"
    DOZEN_FIRST = "DOZEN_FIRST"
    DOZEN_SECOND = "DOZEN_SECOND"
    DOZEN_THIRD = "DOZEN_THIRD"
    COLUMN_FIRST = "COLUMN_FIRST"
    COLUMN_SECOND = "COLUMN_SECOND"
    COLUMN_THIRD = "COLUMN_THIRD"


PAYOUTS: dict[BetType, int] = {
    BetType.STRAIGHT: 35,
    BetType.DOZEN_FIRST: 2, BetType.DOZEN_SECOND: 2, BetType.DOZEN_THIRD: 2,
    BetType.COLUMN_FIRST: 2, BetType.COLUMN_SECOND: 2, BetType.COLUMN_THIRD: 2,
    BetType.RED: 1, BetType.BLACK: 1, BetType.ODD: 1,
    BetType.EVEN: 1, BetType.LOW: 1, BetType.HIGH: 1,
}


@dataclass
class Bet:
    bet_type: BetType
    amount: int
    number: int | None = None

    def wins(self, result: int) -> bool:
        match self.bet_type:
            case BetType.STRAIGHT:
                return result == self.number
            case BetType.RED:
                return result in RED
            case BetType.BLACK:
                return result != 0 and result not in RED
            case BetType.ODD:
                return result != 0 and result % 2 == 1
            case BetType.EVEN:
                return result != 0 and result % 2 == 0
            case BetType.LOW:
                return 1 <= result <= 18
            case BetType.HIGH:
                return 19 <= result <= 36
            case BetType.DOZEN_FIRST:
                return 1 <= result <= 12
            case BetType.DOZEN_SECOND:
                return 13 <= result <= 24
            case BetType.DOZEN_THIRD:
                return 25 <= result <= 36
            case BetType.COLUMN_FIRST:
                return result in COLUMN_1
            case BetType.COLUMN_SECOND:
                return result in COLUMN_2
            case BetType.COLUMN_THIRD:
                return result in COLUMN_3
            case _:
                return False

    def net_delta(self, result: int) -> int:
        if self.wins(result):
            return self.amount * PAYOUTS[self.bet_type]
        return -self.amount
