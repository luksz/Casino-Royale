from pydantic import BaseModel
from app.core.games.baccarat.engine import BaccaratBet


class BaccaratPlayRequest(BaseModel):
    player_id: str
    bet: BaccaratBet
    stake: int


class BaccaratResultResponse(BaseModel):
    player_cards: list[str]
    banker_cards: list[str]
    player_score: int
    banker_score: int
    winner: str
    bet: str
    stake: int
    net_delta: int
    new_balance: int
