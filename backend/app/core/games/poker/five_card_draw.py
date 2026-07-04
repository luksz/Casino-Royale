from collections import Counter
from dataclasses import dataclass
from enum import Enum

from app.core.cards.card import Card
from app.core.cards.shoe import Shoe
from app.core.games.poker.evaluator import evaluate
from app.core.rng.rng import RNG


class PokerPhase(Enum):
    DRAW = "DRAW"
    SETTLED = "SETTLED"


@dataclass
class PokerState:
    phase: PokerPhase
    player_hand: list[str]
    bot_hand_hidden: list[str]  # sent to client during draw phase
    bot_hand_visible: list[str]  # revealed after settle
    stake: int
    player_eval: str = ""
    bot_eval: str = ""
    winner: str = ""  # PLAYER | BOT | TIE
    net_delta: int = 0


class FiveCardDrawEngine:
    def __init__(self, rng: RNG) -> None:
        self._shoe = Shoe(rng, decks=1)
        self._player: list[Card] = []
        self._bot: list[Card] = []
        self._stake = 0

    def deal(self, stake: int) -> PokerState:
        if self._shoe.penetration > 0.5:
            self._shoe.reshuffle()
        self._stake = stake
        self._player = self._shoe.draw_many(5)
        self._bot = self._shoe.draw_many(5)
        return self._make_state(PokerPhase.DRAW)

    def draw(self, discard_indices: list[int]) -> PokerState:
        for i in discard_indices:
            self._player[i] = self._shoe.draw()

        for i in self._bot_ai_discards():
            self._bot[i] = self._shoe.draw()

        pe = evaluate(self._player)
        be = evaluate(self._bot)
        winner = "PLAYER" if pe > be else ("BOT" if be > pe else "TIE")
        net = self._stake if winner == "PLAYER" else (-self._stake if winner == "BOT" else 0)

        state = self._make_state(PokerPhase.SETTLED)
        state.player_eval = pe.description
        state.bot_eval = be.description
        state.winner = winner
        state.net_delta = net
        state.bot_hand_visible = [c.code for c in self._bot]
        return state

    def _make_state(self, phase: PokerPhase) -> PokerState:
        return PokerState(
            phase=phase,
            player_hand=[c.code for c in self._player],
            bot_hand_hidden=["??" for _ in self._bot],
            bot_hand_visible=[],
            stake=self._stake,
        )

    def _bot_ai_discards(self) -> list[int]:
        vals = [c.rank.value for c in self._bot]
        suits = [c.suit for c in self._bot]
        counts = Counter(vals)
        max_c = max(counts.values())

        if max_c >= 2:
            keep = {v for v, c in counts.items() if c >= 2}
            return [i for i, c in enumerate(self._bot) if c.rank.value not in keep]

        suit_counts = Counter(suits)
        if max(suit_counts.values()) >= 4:
            dom = max(suit_counts, key=lambda s: suit_counts[s])
            return [i for i, c in enumerate(self._bot) if c.suit != dom]

        by_val = sorted(range(5), key=lambda i: vals[i])
        return by_val[:2]
