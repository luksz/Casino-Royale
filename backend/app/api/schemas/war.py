from pydantic import BaseModel


class WarPlayRequest(BaseModel):
    player_id: str
    stake: int


class WarResultResponse(BaseModel):
    player_card: str
    dealer_card: str
    result: str
    war_player_card: str | None
    war_dealer_card: str | None
    net_delta: int
    new_balance: int
