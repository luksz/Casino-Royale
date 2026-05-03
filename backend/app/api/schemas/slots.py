from pydantic import BaseModel


class SlotSpinRequest(BaseModel):
    player_id: str
    stake: int


class SlotSpinResponse(BaseModel):
    reels: list[str]
    won: bool
    multiplier: int
    net_delta: int
    new_balance: int
