from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_wallet_service
from app.api.schemas.baccarat import BaccaratPlayRequest, BaccaratResultResponse
from app.config.settings import get_settings
from app.core.games.baccarat.engine import BaccaratEngine
from app.core.rng.rng import make_rng
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/baccarat", tags=["baccarat"])

_engine: BaccaratEngine | None = None


def _get_engine() -> BaccaratEngine:
    global _engine
    if _engine is None:
        s = get_settings()
        _engine = BaccaratEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))
    return _engine


@router.post("/play", response_model=BaccaratResultResponse)
async def play(
    body: BaccaratPlayRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> BaccaratResultResponse:
    try:
        await wallet.debit(body.player_id, body.stake)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    result = _get_engine().play(body.bet, body.stake)

    if result.net_delta > 0:
        await wallet.credit(body.player_id, body.stake + result.net_delta)
    elif result.net_delta == 0:
        await wallet.credit(body.player_id, body.stake)

    new_balance = await wallet.get_balance(body.player_id)
    return BaccaratResultResponse(**result.__dict__, new_balance=new_balance)
