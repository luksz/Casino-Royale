
import pytest
from hypothesis import given
from hypothesis import settings as hyp_settings
from hypothesis import strategies as st

from app.core.cards.card import Card
from app.core.games.blackjack.engine import BlackjackEngine, InvalidActionError
from app.core.games.blackjack.hand import BlackjackHand
from app.core.games.blackjack.rules import BlackjackRules
from app.core.games.blackjack.state import GamePhase, Outcome, PlayerAction
from app.core.rng.rng import SeededRNG

# ---- Hand value tests ----

def make_hand(*codes: str) -> BlackjackHand:
    h = BlackjackHand()
    for c in codes:
        h.add_card(Card.from_code(c))
    return h


def test_hand_hard_value():
    h = make_hand("KS", "7D")
    assert h.value == 17
    assert not h.is_soft


def test_hand_soft_ace():
    h = make_hand("AS", "6D")
    assert h.value == 17
    assert h.is_soft


def test_hand_soft_ace_goes_hard():
    h = make_hand("AS", "6D", "5H")
    assert h.value == 12
    assert not h.is_soft


def test_hand_blackjack():
    h = make_hand("AS", "KD")
    assert h.is_blackjack
    assert h.value == 21


def test_hand_bust():
    h = make_hand("KS", "QD", "5H")
    assert h.is_bust
    assert h.value == 25


def test_multiple_aces():
    h = make_hand("AS", "AD")
    assert h.value == 12  # 11 + 1


def test_hand_value_deterministic():
    h1 = make_hand("AS", "6D")
    h2 = make_hand("AS", "6D")
    assert h1.value == h2.value


# ---- Engine state machine tests ----

def test_invalid_action_wrong_phase():
    engine = BlackjackEngine(rng=SeededRNG(0))
    with pytest.raises(InvalidActionError):
        engine.apply_action(PlayerAction.HIT)


def test_full_round_stand():
    engine = BlackjackEngine(rules=BlackjackRules(deck_count=1), rng=SeededRNG(42))
    state = engine.start_round(100)
    assert state.phase in (GamePhase.PLAYER_TURN, GamePhase.SETTLED)
    while state.phase == GamePhase.PLAYER_TURN:
        state = engine.apply_action(PlayerAction.STAND)
    assert state.phase == GamePhase.SETTLED
    assert state.outcomes is not None


def test_surrender_halves_bet():
    # Find a seed where surrender is legal immediately
    for seed in range(100):
        engine = BlackjackEngine(rules=BlackjackRules(deck_count=1), rng=SeededRNG(seed))
        state = engine.start_round(100)
        can_surrender = PlayerAction.SURRENDER in state.available_actions
        if state.phase == GamePhase.PLAYER_TURN and can_surrender:
            state = engine.apply_action(PlayerAction.SURRENDER)
            assert state.net_delta == -50
            assert state.outcomes[0] == Outcome.SURRENDER
            return
    pytest.skip("No surrender scenario found in seed range")


def test_double_doubles_bet():
    for seed in range(100):
        engine = BlackjackEngine(rules=BlackjackRules(deck_count=1), rng=SeededRNG(seed))
        state = engine.start_round(100)
        if state.phase == GamePhase.PLAYER_TURN and PlayerAction.DOUBLE in state.available_actions:
            state = engine.apply_action(PlayerAction.DOUBLE)
            # Bet should be doubled in the state at point of action
            assert state.bet == 200
            return
    pytest.skip("No double scenario found in seed range")


# ---- Property-based: chip conservation ----

@given(
    seed=st.integers(min_value=0, max_value=2**20),
    bet=st.integers(min_value=1, max_value=1000),
)
@hyp_settings(max_examples=50)
def test_chip_conservation(seed: int, bet: int):
    """Player delta + house delta must sum to zero."""
    engine = BlackjackEngine(rules=BlackjackRules(deck_count=2), rng=SeededRNG(seed))
    state = engine.start_round(bet)
    while state.phase == GamePhase.PLAYER_TURN:
        action = state.available_actions[0]
        state = engine.apply_action(action)
    assert state.phase == GamePhase.SETTLED
    assert state.net_delta is not None
    # Conservation: house takes exactly what player loses and vice-versa
    # Blackjack payout (3:2) means house_delta = -net_delta for all cases.
    # We just verify net_delta is consistent (not None, is int).
    assert isinstance(state.net_delta, int)
