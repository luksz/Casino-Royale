from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.database import get_session
from app.persistence.repositories.player_repository import PlayerRepository
from app.services.player_service import PlayerService
from app.services.wallet_service import WalletService


async def get_player_repo(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlayerRepository:
    return PlayerRepository(session)


async def get_player_service(
    repo: Annotated[PlayerRepository, Depends(get_player_repo)],
) -> PlayerService:
    return PlayerService(repo)


async def get_wallet_service(
    repo: Annotated[PlayerRepository, Depends(get_player_repo)],
) -> WalletService:
    return WalletService(repo)
