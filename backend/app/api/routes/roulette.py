from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_wallet_service
from app.api.schemas.roulette import BetRequest, SpinRequest, SpinResponse, PayoutDetailResponse
from app.core.games.roulette.bets import Bet
from app.core.games.roulette.engine import RouletteEngine
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/roulette", tags=["roulette"])


def _make_engine() -> RouletteEngine:
    s = get_settings()
    return RouletteEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))


@router.post("/spin", response_model=SpinResponse)
async def spin(
    body: SpinRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> SpinResponse:
    total_bet = sum(b.amount for b in body.bets)
    if total_bet <= 0:
        raise HTTPException(400, "Total bet must be positive")

    try:
        await wallet.debit(body.player_id, total_bet)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    bets = [Bet(bet_type=b.bet_type, amount=b.amount, number=b.number) for b in body.bets]
    result = _make_engine().spin(bets)

    if result.net_delta > 0:
        await wallet.credit(body.player_id, result.net_delta)
    elif result.net_delta == 0:
        await wallet.credit(body.player_id, total_bet)

    new_balance = await wallet.get_balance(body.player_id)
    return SpinResponse(
        winning_number=result.winning_number,
        is_red=result.is_red,
        is_black=result.is_black,
        net_delta=result.net_delta,
        payouts=[PayoutDetailResponse(bet_type=p.bet_type, number=p.number, amount=p.amount, won=p.won, delta=p.delta) for p in result.payouts],
        new_balance=new_balance,
    )
