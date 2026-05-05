from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies import get_wallet_service
from app.core.games.keno.engine import KenoEngine
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/keno", tags=["keno"])


class DrawRequest(BaseModel):
    player_id: str
    picks: list[int]
    stake: int
    draw_count: int = 20


class DrawResponse(BaseModel):
    draws: list[int]
    picks: list[int]
    matches: list[int]
    num_matches: int
    draw_count: int
    return_multiplier: int
    net_delta: int
    stake: int
    new_balance: int


@router.post("/draw", response_model=DrawResponse)
async def draw(
    body: DrawRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> DrawResponse:
    if body.stake <= 0:
        raise HTTPException(400, "Stake must be positive")

    try:
        await wallet.debit(body.player_id, body.stake)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    s = get_settings()
    engine = KenoEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))
    try:
        result = engine.draw(body.picks, body.stake, body.draw_count)
    except ValueError as e:
        await wallet.credit(body.player_id, body.stake)  # refund
        raise HTTPException(400, str(e))

    return_amount = body.stake + result.net_delta
    if return_amount > 0:
        await wallet.credit(body.player_id, return_amount)

    new_balance = await wallet.get_balance(body.player_id)
    return DrawResponse(
        draws=result.draws,
        picks=result.picks,
        matches=result.matches,
        num_matches=result.num_matches,
        draw_count=result.draw_count,
        return_multiplier=result.return_multiplier,
        net_delta=result.net_delta,
        stake=result.stake,
        new_balance=new_balance,
    )
