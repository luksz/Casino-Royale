from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_player_service, get_wallet_service
from app.api.schemas.player import BalanceResponse, PlayerCreateRequest, PlayerResponse
from app.persistence.repositories.player_repository import PlayerNotFoundError
from app.services.player_service import DuplicatePlayerError, PlayerService
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/players", tags=["players"])


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(
    body: PlayerCreateRequest,
    svc: Annotated[PlayerService, Depends(get_player_service)],
) -> PlayerResponse:
    try:
        player = await svc.create_player(body.display_name)
    except DuplicatePlayerError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return PlayerResponse.model_validate(player)


@router.get("", response_model=list[PlayerResponse])
async def list_players(
    svc: Annotated[PlayerService, Depends(get_player_service)],
) -> list[PlayerResponse]:
    players = await svc.list_players()
    return [PlayerResponse.model_validate(p) for p in players]


@router.get("/{player_id}", response_model=PlayerResponse)
async def get_player(
    player_id: str,
    svc: Annotated[PlayerService, Depends(get_player_service)],
) -> PlayerResponse:
    try:
        player = await svc.get_player(player_id)
    except PlayerNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return PlayerResponse.model_validate(player)


@router.get("/{player_id}/balance", response_model=BalanceResponse)
async def get_balance(
    player_id: str,
    wallet: Annotated[WalletService, Depends(get_wallet_service)],
) -> BalanceResponse:
    try:
        balance = await wallet.get_balance(player_id)
    except PlayerNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return BalanceResponse(player_id=player_id, balance=balance)
