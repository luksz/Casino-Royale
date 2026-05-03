from app.config.settings import get_settings
from app.persistence.models.player import Player
from app.persistence.repositories.player_repository import PlayerNotFoundError, PlayerRepository


class DuplicatePlayerError(Exception):
    pass


class PlayerService:
    def __init__(self, player_repo: PlayerRepository) -> None:
        self._repo = player_repo

    async def create_player(self, display_name: str) -> Player:
        try:
            await self._repo.get_by_name(display_name)
            raise DuplicatePlayerError(f"Player '{display_name}' already exists")
        except PlayerNotFoundError:
            pass
        settings = get_settings()
        return await self._repo.create(display_name=display_name, balance=settings.starting_balance)

    async def get_player(self, player_id: str) -> Player:
        return await self._repo.get(player_id)

    async def list_players(self) -> list[Player]:
        return await self._repo.list_all()
