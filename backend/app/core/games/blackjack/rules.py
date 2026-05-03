from dataclasses import dataclass
from fractions import Fraction


@dataclass(frozen=True)
class BlackjackRules:
    deck_count: int = 6
    dealer_hits_soft_17: bool = False
    blackjack_payout: Fraction = Fraction(3, 2)
    double_after_split: bool = True
    surrender_allowed: bool = True
    max_splits: int = 3
