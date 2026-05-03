import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import get_wallet_service
from app.core.games.hilo.engine import HiLoEngine, HiLoRound
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/hilo", tags=["hilo"])

# Module-level round store
_rounds: dict[str, HiLoRound] = {}


def _make_engine() -> HiLoEngine:
    s = get_settings()
    return HiLoEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))


class StartRequest(BaseModel):
    player_id: str
    stake: int


class StartResponse(BaseModel):
    round_id: str
    current_card: str
    stake: int
    multiplier: float
    potential_win: int


class PlayRequest(BaseModel):
    action: str   # "HIGHER" | "LOWER" | "CASHOUT"


class PlayResponse(BaseModel):
    action: str
    next_card: str | None
    result: str           # "WIN" | "LOSE" | "CASHOUT" | "TIE"
    current_card: str | None
    multiplier: float
    potential_win: int
    net_delta: int
    round_over: bool
    new_balance: int | None


@router.post("/rounds", response_model=StartResponse, status_code=status.HTTP_201_CREATED)
async def start_round(
    body: StartRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> StartResponse:
    if body.stake <= 0:
        raise HTTPException(400, "Stake must be positive")

    try:
        await wallet.debit(body.player_id, body.stake)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    engine = _make_engine()
    round = engine.start_round(body.player_id, body.stake)
    round_id = str(uuid.uuid4())
    _rounds[round_id] = round

    return StartResponse(
        round_id=round_id,
        current_card=round.current_card,
        stake=round.stake,
        multiplier=round.multiplier,
        potential_win=round.potential_win,
    )


@router.post("/rounds/{round_id}/play", response_model=PlayResponse)
async def play(
    round_id: str,
    body: PlayRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> PlayResponse:
    round = _rounds.get(round_id)
    if round is None:
        raise HTTPException(404, "Round not found")
    if not round.active:
        raise HTTPException(400, "Round is already over")

    engine = _make_engine()
    try:
        guess_result = engine.play(round, body.action)
    except ValueError as e:
        raise HTTPException(400, str(e))

    new_balance: int | None = None
    if guess_result.round_over:
        return_amount = round.stake + guess_result.net_delta
        if return_amount > 0:
            await wallet.credit(round.player_id, return_amount)
        new_balance = await wallet.get_balance(round.player_id)
        del _rounds[round_id]

    current_card = round.current_card if not guess_result.round_over else None

    return PlayResponse(
        action=guess_result.action,
        next_card=guess_result.next_card,
        result=guess_result.result,
        current_card=current_card,
        multiplier=guess_result.new_multiplier,
        potential_win=round.potential_win if not guess_result.round_over else 0,
        net_delta=guess_result.net_delta,
        round_over=guess_result.round_over,
        new_balance=new_balance,
    )
