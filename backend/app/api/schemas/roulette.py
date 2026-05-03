from pydantic import BaseModel
from app.core.games.roulette.bets import BetType


class BetRequest(BaseModel):
    bet_type: BetType
    amount: int
    number: int | None = None


class SpinRequest(BaseModel):
    player_id: str
    bets: list[BetRequest]


class PayoutDetailResponse(BaseModel):
    bet_type: str
    number: int | None
    amount: int
    won: bool
    delta: int


class SpinResponse(BaseModel):
    winning_number: int
    is_red: bool
    is_black: bool
    net_delta: int
    payouts: list[PayoutDetailResponse]
    new_balance: int
