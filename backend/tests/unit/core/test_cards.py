import pytest
from hypothesis import given
from hypothesis import settings as hyp_settings
from hypothesis import strategies as st

from app.core.cards.card import Card, Rank, Suit
from app.core.cards.shoe import EmptyShoeError, Shoe, build_standard_deck
from app.core.rng.rng import SeededRNG


def test_build_standard_deck_length():
    deck = build_standard_deck()
    assert len(deck) == 52


def test_card_immutability():
    card = Card(rank=Rank.ACE, suit=Suit.SPADES)
    with pytest.raises((AttributeError, TypeError)):
        card.rank = Rank.TWO  # type: ignore[misc]


def test_card_code_roundtrip():
    for suit in Suit:
        for rank in Rank:
            card = Card(rank=rank, suit=suit)
            assert Card.from_code(card.code) == card


def test_card_str():
    card = Card(rank=Rank.ACE, suit=Suit.SPADES)
    assert str(card) == "A♠"


def test_shoe_count():
    rng = SeededRNG(42)
    shoe = Shoe(rng, decks=2)
    assert len(shoe) == 104


def test_shoe_draw_reduces_count():
    rng = SeededRNG(0)
    shoe = Shoe(rng)
    shoe.draw()
    assert len(shoe) == 51


def test_shoe_draw_many():
    rng = SeededRNG(0)
    shoe = Shoe(rng)
    cards = shoe.draw_many(5)
    assert len(cards) == 5
    assert len(shoe) == 47


def test_shoe_empty_raises():
    rng = SeededRNG(0)
    shoe = Shoe(rng)
    shoe.draw_many(52)
    with pytest.raises(EmptyShoeError):
        shoe.draw()


def test_shoe_reshuffle():
    rng = SeededRNG(0)
    shoe = Shoe(rng)
    shoe.draw_many(10)
    shoe.reshuffle()
    assert len(shoe) == 52


def test_shoe_penetration():
    rng = SeededRNG(0)
    shoe = Shoe(rng)
    shoe.draw_many(26)
    assert abs(shoe.penetration - 0.5) < 0.01


def test_same_seed_same_order():
    rng1 = SeededRNG(999)
    rng2 = SeededRNG(999)
    shoe1 = Shoe(rng1)
    shoe2 = Shoe(rng2)
    assert shoe1.draw_many(10) == shoe2.draw_many(10)


@given(st.integers(min_value=0, max_value=2**31))
@hyp_settings(max_examples=20)
def test_shoe_never_exceeds_capacity(seed: int):
    rng = SeededRNG(seed)
    shoe = Shoe(rng)
    drawn = shoe.draw_many(52)
    assert len(drawn) == 52
    assert len(shoe) == 0
