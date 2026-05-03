from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_wallet_service
from app.api.schemas.blackjack import (
    ActionRequest,
    HandStateResponse,
    RoundStateResponse,
    StartRoundRequest,
)
from app.core.games.blackjack.engine import InvalidActionError
from app.core.games.blackjack.hand import BlackjackHand
from app.core.games.blackjack.state import BlackjackState
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.blackjack_service import BlackjackService, RoundNotFoundError
from app.services.wallet_service import InsufficientFundsError, WalletService

router = APIRouter(prefix="/blackjack", tags=["blackjack"])

def get_blackjack_service(
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> BlackjackService:
    return BlackjackService(wallet)


def _hand_to_response(hand: BlackjackHand, hide_hole: bool = False) -> HandStateResponse:
    cards = [hand.cards[0].code, "??"] if hide_hole and len(hand.cards) >= 2 else [c.code for c in hand.cards]
    return HandStateResponse(
        cards=cards,
        value=hand.value if not hide_hole else hand.cards[0].rank.blackjack_value,
        is_soft=False if hide_hole else hand.is_soft,
        is_bust=False if hide_hole else hand.is_bust,
        is_blackjack=False if hide_hole else hand.is_blackjack,
    )


def _state_to_response(round_id: str, state: BlackjackState, hide_hole: bool = False) -> RoundStateResponse:
    from app.core.games.blackjack.state import GamePhase
    outcomes = None
    if state.outcomes is not None:
        outcomes = {str(k): v for k, v in state.outcomes.items()}

    return RoundStateResponse(
        round_id=round_id,
        phase=state.phase,
        player_hands=[_hand_to_response(h) for h in state.player_hands],
        dealer_hand=_hand_to_response(state.dealer_hand, hide_hole=hide_hole and state.phase == GamePhase.PLAYER_TURN),
        current_hand_index=state.current_hand_index,
        bet=state.bet,
        legal_actions=state.available_actions,
        outcomes=outcomes,
        net_delta=state.net_delta,
    )


@router.post("/rounds", response_model=RoundStateResponse, status_code=status.HTTP_201_CREATED)
async def start_round(
    body: StartRoundRequest,
    svc: Annotated[BlackjackService, Depends(get_blackjack_service)],
) -> RoundStateResponse:
    try:
        round_id, state = await svc.start_round(body.player_id, body.bet)
    except PlayerNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientFundsError as e:
        raise HTTPException(status_code=402, detail=str(e))
    return _state_to_response(round_id, state, hide_hole=True)


@router.post("/rounds/{round_id}/action", response_model=RoundStateResponse)
async def apply_action(
    round_id: str,
    body: ActionRequest,
    svc: Annotated[BlackjackService, Depends(get_blackjack_service)],
) -> RoundStateResponse:
    try:
        state = await svc.apply_action(round_id, body.action)
    except RoundNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidActionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    from app.core.games.blackjack.state import GamePhase
    hide = state.phase == GamePhase.PLAYER_TURN
    return _state_to_response(round_id, state, hide_hole=hide)


@router.get("/rounds/{round_id}", response_model=RoundStateResponse)
async def get_round(
    round_id: str,
    svc: Annotated[BlackjackService, Depends(get_blackjack_service)],
) -> RoundStateResponse:
    try:
        state = svc.get_state(round_id)
    except RoundNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    from app.core.games.blackjack.state import GamePhase
    hide = state.phase == GamePhase.PLAYER_TURN
    return _state_to_response(round_id, state, hide_hole=hide)
