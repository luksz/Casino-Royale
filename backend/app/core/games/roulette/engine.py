from dataclasses import dataclass

from app.core.games.roulette.bets import Bet
from app.core.games.roulette.wheel import EuropeanWheel


@dataclass
class PayoutDetail:
    bet_type: str
    number: int | None
    amount: int
    won: bool
    delta: int


@dataclass
class SpinResult:
    winning_number: int
    is_red: bool
    is_black: bool
    net_delta: int
    payouts: list[PayoutDetail]


class RouletteEngine:
    def __init__(self, rng) -> None:
        self._rng = rng

    def spin(self, bets: list[Bet]) -> SpinResult:
        result = EuropeanWheel.spin(self._rng)
        payouts = [
            PayoutDetail(
                bet_type=b.bet_type.value,
                number=b.number,
                amount=b.amount,
                won=b.wins(result),
                delta=b.net_delta(result),
            )
            for b in bets
        ]
        return SpinResult(
            winning_number=result,
            is_red=EuropeanWheel.is_red(result),
            is_black=EuropeanWheel.is_black(result),
            net_delta=sum(p.delta for p in payouts),
            payouts=payouts,
        )
