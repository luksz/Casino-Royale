from dataclasses import dataclass

from app.persistence.repositories.player_repository import PlayerRepository


class InsufficientFundsError(Exception):
    pass


class InvalidAmountError(Exception):
    pass


@dataclass
class WalletTransaction:
    player_id: str
    amount: int
    new_balance: int
    kind: str  # "credit" | "debit"


class WalletService:
    def __init__(self, player_repo: PlayerRepository) -> None:
        self._repo = player_repo

    async def credit(self, player_id: str, amount: int) -> WalletTransaction:
        if amount <= 0:
            raise InvalidAmountError("Credit amount must be positive")
        player = await self._repo.get(player_id)
        new_balance = player.balance + amount
        await self._repo.update_balance(player_id, new_balance)
        return WalletTransaction(player_id=player_id, amount=amount, new_balance=new_balance, kind="credit")

    async def debit(self, player_id: str, amount: int) -> WalletTransaction:
        if amount <= 0:
            raise InvalidAmountError("Debit amount must be positive")
        player = await self._repo.get(player_id)
        if player.balance < amount:
            raise InsufficientFundsError(f"Balance {player.balance} < {amount}")
        new_balance = player.balance - amount
        await self._repo.update_balance(player_id, new_balance)
        return WalletTransaction(player_id=player_id, amount=amount, new_balance=new_balance, kind="debit")

    async def get_balance(self, player_id: str) -> int:
        player = await self._repo.get(player_id)
        return player.balance
