from __future__ import annotations
from fractions import Fraction
from typing import TYPE_CHECKING

from app.core.cards.shoe import Shoe
from app.core.games.blackjack.hand import BlackjackHand
from app.core.games.blackjack.rules import BlackjackRules
from app.core.games.blackjack.state import BlackjackState, GamePhase, Outcome, PlayerAction

if TYPE_CHECKING:
    from app.core.rng.rng import RNG


class InvalidActionError(Exception):
    pass


class BlackjackEngine:
    def __init__(self, rules: BlackjackRules | None = None, rng: "RNG | None" = None) -> None:
        from app.core.rng.rng import make_rng
        self._rules = rules or BlackjackRules()
        self._rng = rng or make_rng(secure=True)
        self._shoe = Shoe(self._rng, decks=self._rules.deck_count)
        self._state = BlackjackState()

    @property
    def state(self) -> BlackjackState:
        return self._state

    def start_round(self, bet: int) -> BlackjackState:
        if self._state.phase not in (GamePhase.BETTING, GamePhase.SETTLED):
            raise InvalidActionError("Cannot start a new round mid-game")
        if bet <= 0:
            raise InvalidActionError("Bet must be positive")

        # Reshuffle if > 75% penetration
        if self._shoe.penetration > 0.75:
            self._shoe.reshuffle()

        player_hand = BlackjackHand()
        dealer_hand = BlackjackHand()
        player_hand.add_card(self._shoe.draw())
        dealer_hand.add_card(self._shoe.draw())
        player_hand.add_card(self._shoe.draw())
        dealer_hand.add_card(self._shoe.draw())

        self._state = BlackjackState(
            phase=GamePhase.PLAYER_TURN,
            player_hands=[player_hand],
            dealer_hand=dealer_hand,
            current_hand_index=0,
            bet=bet,
        )

        # Immediate blackjack check
        if player_hand.is_blackjack:
            return self._play_dealer_and_settle()

        self._state.available_actions = self._compute_actions()
        return self._state

    def legal_actions(self) -> list[PlayerAction]:
        return list(self._state.available_actions)

    def apply_action(self, action: PlayerAction) -> BlackjackState:
        if self._state.phase != GamePhase.PLAYER_TURN:
            raise InvalidActionError(f"Cannot act in phase {self._state.phase}")
        if action not in self._state.available_actions:
            raise InvalidActionError(f"Action {action} not available")

        hand = self._state.player_hands[self._state.current_hand_index]

        if action == PlayerAction.HIT:
            hand.add_card(self._shoe.draw())
            if hand.is_bust:
                return self._advance_or_settle()
            self._state.available_actions = self._compute_actions()

        elif action == PlayerAction.STAND:
            return self._advance_or_settle()

        elif action == PlayerAction.DOUBLE:
            hand.add_card(self._shoe.draw())
            self._state.bet *= 2
            return self._advance_or_settle()

        elif action == PlayerAction.SPLIT:
            split_card = hand.cards.pop()
            new_hand = BlackjackHand()
            new_hand.add_card(split_card)
            hand.add_card(self._shoe.draw())
            new_hand.add_card(self._shoe.draw())
            self._state.player_hands.insert(self._state.current_hand_index + 1, new_hand)
            self._state.available_actions = self._compute_actions()

        elif action == PlayerAction.SURRENDER:
            outcome = {self._state.current_hand_index: Outcome.SURRENDER}
            delta = -(self._state.bet // 2)
            self._state.phase = GamePhase.SETTLED
            self._state.outcomes = outcome
            self._state.net_delta = delta
            self._state.available_actions = []

        return self._state

    # ---- private helpers ----

    def _compute_actions(self) -> list[PlayerAction]:
        hand = self._state.player_hands[self._state.current_hand_index]
        actions: list[PlayerAction] = [PlayerAction.HIT, PlayerAction.STAND]

        # Double: only on first action of this hand (2 cards)
        if len(hand.cards) == 2:
            actions.append(PlayerAction.DOUBLE)

        # Split: pair + split count under limit
        split_count = len(self._state.player_hands) - 1
        if (
            len(hand.cards) == 2
            and hand.cards[0].rank == hand.cards[1].rank
            and split_count < self._rules.max_splits
        ):
            actions.append(PlayerAction.SPLIT)

        # Surrender: only first action of the initial hand
        if (
            self._rules.surrender_allowed
            and self._state.current_hand_index == 0
            and len(hand.cards) == 2
            and len(self._state.player_hands) == 1
        ):
            actions.append(PlayerAction.SURRENDER)

        return actions

    def _advance_or_settle(self) -> BlackjackState:
        next_idx = self._state.current_hand_index + 1
        if next_idx < len(self._state.player_hands):
            self._state.current_hand_index = next_idx
            self._state.available_actions = self._compute_actions()
            return self._state
        return self._play_dealer_and_settle()

    def _play_dealer_and_settle(self) -> BlackjackState:
        self._state.phase = GamePhase.DEALER_TURN
        dealer = self._state.dealer_hand

        # Dealer draws unless all player hands busted / surrendered
        all_bust = all(h.is_bust for h in self._state.player_hands)
        if not all_bust:
            while True:
                dv = dealer.value
                if dv > 17:
                    break
                if dv == 17 and not (self._rules.dealer_hits_soft_17 and dealer.is_soft):
                    break
                dealer.add_card(self._shoe.draw())

        outcomes: dict[int, Outcome] = {}
        net_delta = 0

        for i, hand in enumerate(self._state.player_hands):
            if hand.is_bust:
                outcomes[i] = Outcome.PLAYER_BUST
                net_delta -= self._state.bet
            elif hand.is_blackjack and not dealer.is_blackjack:
                outcomes[i] = Outcome.PLAYER_BLACKJACK
                payout = int(self._state.bet * self._rules.blackjack_payout)
                net_delta += payout
            elif dealer.is_bust or hand.value > dealer.value:
                outcomes[i] = Outcome.PLAYER_WIN
                net_delta += self._state.bet
            elif hand.value == dealer.value:
                outcomes[i] = Outcome.PUSH
            else:
                outcomes[i] = Outcome.DEALER_WIN
                net_delta -= self._state.bet

        self._state.phase = GamePhase.SETTLED
        self._state.outcomes = outcomes
        self._state.net_delta = net_delta
        self._state.available_actions = []
        return self._state
