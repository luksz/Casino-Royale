from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_wallet_service
from app.api.schemas.slots import SlotSpinRequest, SlotSpinResponse
from app.core.games.slots.engine import SlotsEngine
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/slots", tags=["slots"])


def _make_engine() -> SlotsEngine:
    s = get_settings()
    return SlotsEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))


@router.post("/spin", response_model=SlotSpinResponse)
async def spin(
    body: SlotSpinRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> SlotSpinResponse:
    try:
        await wallet.debit(body.player_id, body.stake)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    result = _make_engine().spin(body.stake)

    if result.net_delta > 0:
        await wallet.credit(body.player_id, body.stake + result.net_delta)

    new_balance = await wallet.get_balance(body.player_id)
    return SlotSpinResponse(**result.__dict__, new_balance=new_balance)
