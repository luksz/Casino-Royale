import pytest

from app.services.wallet_service import InsufficientFundsError, InvalidAmountError


@pytest.mark.asyncio
async def test_credit_increases_balance(player_repo, wallet_service):
    player = await player_repo.create("Alice", 1000)
    tx = await wallet_service.credit(player.id, 500)
    assert tx.new_balance == 1500
    assert tx.kind == "credit"


@pytest.mark.asyncio
async def test_debit_decreases_balance(player_repo, wallet_service):
    player = await player_repo.create("Bob", 1000)
    tx = await wallet_service.debit(player.id, 300)
    assert tx.new_balance == 700
    assert tx.kind == "debit"


@pytest.mark.asyncio
async def test_debit_insufficient_funds(player_repo, wallet_service):
    player = await player_repo.create("Charlie", 100)
    with pytest.raises(InsufficientFundsError):
        await wallet_service.debit(player.id, 200)


@pytest.mark.asyncio
async def test_credit_invalid_amount(player_repo, wallet_service):
    player = await player_repo.create("Dave", 1000)
    with pytest.raises(InvalidAmountError):
        await wallet_service.credit(player.id, 0)
    with pytest.raises(InvalidAmountError):
        await wallet_service.credit(player.id, -50)


@pytest.mark.asyncio
async def test_debit_invalid_amount(player_repo, wallet_service):
    player = await player_repo.create("Eve", 1000)
    with pytest.raises(InvalidAmountError):
        await wallet_service.debit(player.id, 0)


@pytest.mark.asyncio
async def test_get_balance(player_repo, wallet_service):
    player = await player_repo.create("Frank", 5000)
    balance = await wallet_service.get_balance(player.id)
    assert balance == 5000
