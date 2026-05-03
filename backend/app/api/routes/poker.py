import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_wallet_service
from app.api.schemas.poker import PokerDealRequest, PokerDrawRequest, PokerStateResponse
from app.core.games.poker.five_card_draw import FiveCardDrawEngine, PokerPhase
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/poker", tags=["poker"])

_rounds: dict[str, tuple[FiveCardDrawEngine, str, int]] = {}  # id -> (engine, player_id, stake)


def _make_engine() -> FiveCardDrawEngine:
    s = get_settings()
    return FiveCardDrawEngine(make_rng(seed=s.rng_seed, secure=(s.rng_seed is None)))


def _to_response(round_id: str, engine: FiveCardDrawEngine, new_balance: int | None = None) -> PokerStateResponse:
    s = engine.state if hasattr(engine, '_state_cache') else None
    st = engine._make_state(engine._state_cache.phase) if s else None
    # just re-use stored state from deal/draw
    return _round_response(round_id, engine, new_balance)


def _round_response(round_id: str, engine: FiveCardDrawEngine, new_balance: int | None) -> PokerStateResponse:
    st = engine._last_state
    settled = st.phase == PokerPhase.SETTLED
    return PokerStateResponse(
        round_id=round_id,
        phase=st.phase.value,
        player_hand=st.player_hand,
        bot_hand=st.bot_hand_visible if settled else st.bot_hand_hidden,
        stake=st.stake,
        player_eval=st.player_eval,
        bot_eval=st.bot_eval,
        winner=st.winner,
        net_delta=st.net_delta,
        new_balance=new_balance,
    )


@router.post("/rounds", response_model=PokerStateResponse, status_code=201)
async def deal(
    body: PokerDealRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> PokerStateResponse:
    try:
        await wallet.debit(body.player_id, body.stake)
    except PlayerNotFoundError as e:
        raise HTTPException(404, str(e))
    except InsufficientFundsError as e:
        raise HTTPException(402, str(e))

    engine = _make_engine()
    state = engine.deal(body.stake)
    engine._last_state = state
    round_id = str(uuid.uuid4())
    _rounds[round_id] = (engine, body.player_id, body.stake)

    balance = await wallet.get_balance(body.player_id)
    return _round_response(round_id, engine, balance)


@router.post("/rounds/{round_id}/draw", response_model=PokerStateResponse)
async def draw(
    round_id: str,
    body: PokerDrawRequest,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> PokerStateResponse:
    if round_id not in _rounds:
        raise HTTPException(404, "Round not found")

    engine, player_id, stake = _rounds[round_id]
    state = engine.draw(body.discard_indices)
    engine._last_state = state

    if state.net_delta > 0:
        await wallet.credit(player_id, stake + state.net_delta)
    elif state.net_delta == 0:
        await wallet.credit(player_id, stake)

    balance = await wallet.get_balance(player_id)
    return _round_response(round_id, engine, balance)
