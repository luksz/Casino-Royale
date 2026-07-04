from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.dependencies import get_wallet_service
from app.config.settings import get_settings
from app.core.games.pachinko.engine import PachinkoEngine
from app.core.rng.rng import make_rng
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/pachinko", tags=["pachinko"])


class DropRequest(BaseModel):
    player_id: str
    stake_per_ball: int
    num_balls: int = 1
    rows: int = 8
    risk: str = "low"


class BallResponse(BaseModel):
    path: list[bool]
    slot: int
    multiplier: float
    net_delta: int


class DropResponse(BaseModel):
    balls: list[BallResponse]
    total_net_delta: int
    stake_per_ball: int
    num_balls: int
    rows: int
    risk: str
    payouts: list[float]
    new_balance: int


@router.post("/drop", response_model=DropResponse)
async def drop(
    body: DropRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> DropResponse:
    if body.stake_per_ball <= 0:
        raise HTTPException(400, "Stake must be positive")

    total_stake = body.stake_per_ball * body.num_balls
    try:
        await wallet.debit(body.player_id, total_stake)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    s = get_settings()
    engine = PachinkoEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))
    try:
        result = engine.drop(body.stake_per_ball, body.num_balls, body.rows, body.risk)
    except ValueError as e:
        await wallet.credit(body.player_id, total_stake)
        raise HTTPException(400, str(e))

    for ball in result.balls:
        return_amount = int(body.stake_per_ball * ball.multiplier)
        if return_amount > 0:
            await wallet.credit(body.player_id, return_amount)

    new_balance = await wallet.get_balance(body.player_id)
    return DropResponse(
        balls=[
            BallResponse(path=b.path, slot=b.slot, multiplier=b.multiplier, net_delta=b.net_delta)
            for b in result.balls
        ],
        total_net_delta=result.total_net_delta,
        stake_per_ball=result.stake_per_ball,
        num_balls=result.num_balls,
        rows=result.rows,
        risk=result.risk,
        payouts=result.payouts,
        new_balance=new_balance,
    )
