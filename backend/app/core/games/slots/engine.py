from dataclasses import dataclass
from enum import Enum

from app.core.rng.rng import RNG


class Symbol(Enum):
    CHERRY = "🍒"
    LEMON = "🍋"
    GRAPE = "🍇"
    STAR = "⭐"
    DIAMOND = "💎"
    SEVEN = "7"


WEIGHTS = [30, 25, 20, 15, 8, 2]
SYMBOLS = list(Symbol)

# Net multipliers for three of a kind. Tuned with pair consolations below
# to an overall RTP of ~93.6% (house edge ~6.4%).
PAYOUTS: dict[Symbol, int] = {
    Symbol.CHERRY: 5,
    Symbol.LEMON: 8,
    Symbol.GRAPE: 15,
    Symbol.STAR: 25,
    Symbol.DIAMOND: 60,
    Symbol.SEVEN: 200,
}

PAIR_PAYOUTS: dict[Symbol, int] = {
    Symbol.CHERRY: 1,
    Symbol.SEVEN: 5,
}


@dataclass
class SlotResult:
    reels: list[str]
    won: bool
    multiplier: int
    net_delta: int


class SlotsEngine:
    def __init__(self, rng: RNG) -> None:
        self._rng = rng

    def spin(self, stake: int) -> SlotResult:
        reels = [self._pick() for _ in range(3)]

        if reels[0] == reels[1] == reels[2]:
            mult = PAYOUTS[reels[0]]
        else:
            mult = 0
            for sym, pair_mult in PAIR_PAYOUTS.items():
                if reels.count(sym) == 2:
                    mult = pair_mult
                    break

        net = stake * mult if mult > 0 else -stake
        return SlotResult(
            reels=[s.value for s in reels],
            won=mult > 0,
            multiplier=mult,
            net_delta=net,
        )

    def _pick(self) -> Symbol:
        total = sum(WEIGHTS)
        r = self._rng.randint(0, total - 1)
        cumulative = 0
        for sym, w in zip(SYMBOLS, WEIGHTS):
            cumulative += w
            if r < cumulative:
                return sym
        return SYMBOLS[-1]
