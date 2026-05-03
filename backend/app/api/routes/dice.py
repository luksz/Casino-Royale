from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies import get_wallet_service
from app.core.games.dice.engine import DiceEngine
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/dice", tags=["dice"])


class RollRequest(BaseModel):
    player_id: str
    bet_type: str
    stake: int


class RollResponse(BaseModel):
    die1: int
    die2: int
    total: int
    is_double: bool
    bet_type: str
    won: bool
    net_delta: int
    new_balance: int


@router.post("/roll", response_model=RollResponse)
async def roll(
    body: RollRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> RollResponse:
    if body.stake <= 0:
        raise HTTPException(400, "Stake must be positive")

    try:
        await wallet.debit(body.player_id, body.stake)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    s = get_settings()
    engine = DiceEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))
    try:
        result = engine.roll(body.bet_type, body.stake)
    except ValueError as e:
        await wallet.credit(body.player_id, body.stake)  # refund
        raise HTTPException(400, str(e))

    return_amount = body.stake + result.net_delta
    if return_amount > 0:
        await wallet.credit(body.player_id, return_amount)

    new_balance = await wallet.get_balance(body.player_id)
    return RollResponse(
        die1=result.die1,
        die2=result.die2,
        total=result.total,
        is_double=result.is_double,
        bet_type=result.bet_type,
        won=result.won,
        net_delta=result.net_delta,
        new_balance=new_balance,
    )
