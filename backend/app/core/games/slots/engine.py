from dataclasses import dataclass
from enum import Enum


class Symbol(Enum):
    CHERRY = "🍒"
    LEMON = "🍋"
    GRAPE = "🍇"
    STAR = "⭐"
    DIAMOND = "💎"
    SEVEN = "7"


WEIGHTS = [30, 25, 20, 15, 8, 2]
SYMBOLS = list(Symbol)

PAYOUTS: dict[Symbol, int] = {
    Symbol.CHERRY: 2,
    Symbol.LEMON: 3,
    Symbol.GRAPE: 5,
    Symbol.STAR: 10,
    Symbol.DIAMOND: 25,
    Symbol.SEVEN: 100,
}


@dataclass
class SlotResult:
    reels: list[str]
    won: bool
    multiplier: int
    net_delta: int


class SlotsEngine:
    def __init__(self, rng) -> None:
        self._rng = rng

    def spin(self, stake: int) -> SlotResult:
        reels = [self._pick() for _ in range(3)]

        if reels[0] == reels[1] == reels[2]:
            mult = PAYOUTS[reels[0]]
        elif Symbol.CHERRY in (reels[0], reels[1]) and Symbol.CHERRY in (reels[1], reels[2]):
            mult = 1
        elif reels[0] == Symbol.CHERRY or reels[1] == Symbol.CHERRY:
            mult = 1
        else:
            mult = 0

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
