from pydantic import BaseModel


class PokerDealRequest(BaseModel):
    player_id: str
    stake: int


class PokerDrawRequest(BaseModel):
    discard_indices: list[int]


class PokerStateResponse(BaseModel):
    round_id: str
    phase: str
    player_hand: list[str]
    bot_hand: list[str]
    stake: int
    player_eval: str
    bot_eval: str
    winner: str
    net_delta: int
    new_balance: int | None
