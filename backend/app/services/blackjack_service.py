import uuid

from app.core.games.blackjack.engine import BlackjackEngine
from app.core.games.blackjack.rules import BlackjackRules
from app.core.games.blackjack.state import BlackjackState, GamePhase, PlayerAction
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.services.wallet_service import WalletService


class RoundNotFoundError(Exception):
    pass


# Module-level store so rounds survive across requests (each request gets a new service instance)
_rounds: dict[str, tuple[BlackjackEngine, str]] = {}


class BlackjackService:
    def __init__(self, wallet_service: WalletService) -> None:
        self._wallet = wallet_service

    async def start_round(self, player_id: str, bet: int) -> tuple[str, BlackjackState]:
        settings = get_settings()
        rng = make_rng(seed=settings.rng_seed, secure=(settings.rng_seed is None))
        engine = BlackjackEngine(rules=BlackjackRules(), rng=rng)

        await self._wallet.debit(player_id, bet)

        state = engine.start_round(bet)
        round_id = str(uuid.uuid4())
        _rounds[round_id] = (engine, player_id)

        if state.phase == GamePhase.SETTLED:
            await self._settle_wallet(player_id, bet, state)

        return round_id, state

    async def apply_action(self, round_id: str, action: PlayerAction) -> BlackjackState:
        engine, player_id = self._get_round(round_id)
        state = engine.apply_action(action)

        if state.phase == GamePhase.SETTLED:
            await self._settle_wallet(player_id, engine.state.bet, state)

        return state

    def get_state(self, round_id: str) -> BlackjackState:
        engine, _ = self._get_round(round_id)
        return engine.state

    def _get_round(self, round_id: str) -> tuple[BlackjackEngine, str]:
        if round_id not in _rounds:
            raise RoundNotFoundError(f"Round {round_id} not found")
        return _rounds[round_id]

    async def _settle_wallet(self, player_id: str, _bet: int, state: BlackjackState) -> None:
        delta = state.net_delta or 0
        if delta > 0:
            await self._wallet.credit(player_id, delta)
        # For a loss or surrender, bet was already debited; no additional action.
        # For push, refund the bet.
        elif delta == 0:
            await self._wallet.credit(player_id, _bet)
