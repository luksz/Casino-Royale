from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.persistence.models.player import Player


class PlayerNotFoundError(Exception):
    pass


class PlayerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, display_name: str, balance: int) -> Player:
        player = Player(display_name=display_name, balance=balance)
        self._session.add(player)
        await self._session.commit()
        await self._session.refresh(player)
        return player

    async def get(self, player_id: str) -> Player:
        player = await self._session.get(Player, player_id)
        if player is None:
            raise PlayerNotFoundError(f"Player {player_id} not found")
        return player

    async def get_by_name(self, display_name: str) -> Player:
        result = await self._session.execute(
            select(Player).where(Player.display_name == display_name)
        )
        player = result.scalar_one_or_none()
        if player is None:
            raise PlayerNotFoundError(f"Player '{display_name}' not found")
        return player

    async def update_balance(self, player_id: str, new_balance: int) -> Player:
        player = await self.get(player_id)
        player.balance = new_balance
        await self._session.commit()
        await self._session.refresh(player)
        return player

    async def list_all(self) -> list[Player]:
        result = await self._session.execute(select(Player))
        return list(result.scalars().all())
