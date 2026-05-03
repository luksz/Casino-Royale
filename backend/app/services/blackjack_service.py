import uuid

from app.core.games.blackjack.engine import BlackjackEngine
from app.core.games.blackjack.rules import BlackjackRules
from app.core.games.blackjack.side_bets import SideBetResult, evaluate_perfect_pairs, evaluate_21_3
from app.core.games.blackjack.state import BlackjackState, GamePhase, PlayerAction
from app.core.rng.rng import make_rng
from app.config.settings import get_settings
from app.services.wallet_service import WalletService


class RoundNotFoundError(Exception):
    pass


# (engine, player_id, side_bet_results, total_bet_debited)
_rounds: dict[str, tuple[BlackjackEngine, str, list[SideBetResult], int]] = {}


class BlackjackService:
    def __init__(self, wallet_service: WalletService) -> None:
        self._wallet = wallet_service

    async def start_round(
        self,
        player_id: str,
        bet: int,
        perfect_pairs: int = 0,
        twenty_one_three: int = 0,
    ) -> tuple[str, BlackjackState, list[SideBetResult]]:
        settings = get_settings()
        rng = make_rng(seed=settings.rng_seed, secure=(settings.rng_seed is None))
        engine = BlackjackEngine(rules=BlackjackRules(), rng=rng)

        await self._wallet.debit(player_id, bet + perfect_pairs + twenty_one_three)

        state = engine.start_round(bet)

        side_bet_results: list[SideBetResult] = []
        if perfect_pairs > 0 or twenty_one_three > 0:
            p1 = state.player_hands[0].cards[0]
            p2 = state.player_hands[0].cards[1]
            dealer_up = state.dealer_hand.cards[0]

            if perfect_pairs > 0:
                r = evaluate_perfect_pairs(p1, p2, perfect_pairs)
                side_bet_results.append(r)
                return_pp = perfect_pairs + r.net_delta
                if return_pp > 0:
                    await self._wallet.credit(player_id, return_pp)

            if twenty_one_three > 0:
                r = evaluate_21_3(p1, p2, dealer_up, twenty_one_three)
                side_bet_results.append(r)
                return_21 = twenty_one_three + r.net_delta
                if return_21 > 0:
                    await self._wallet.credit(player_id, return_21)

        round_id = str(uuid.uuid4())
        _rounds[round_id] = (engine, player_id, side_bet_results, bet)

        if state.phase == GamePhase.SETTLED:
            await self._settle_wallet(player_id, bet, state)

        return round_id, state, side_bet_results

    async def apply_action(self, round_id: str, action: PlayerAction) -> BlackjackState:
        engine, player_id, side_bets, total_bet = self._get_round(round_id)

        if action in (PlayerAction.DOUBLE, PlayerAction.SPLIT):
            extra = engine.state.bet
            await self._wallet.debit(player_id, extra)
            total_bet += extra
            _rounds[round_id] = (engine, player_id, side_bets, total_bet)

        state = engine.apply_action(action)

        if state.phase == GamePhase.SETTLED:
            await self._settle_wallet(player_id, total_bet, state)

        return state

    def get_state(self, round_id: str) -> BlackjackState:
        engine, _, _, _ = self._get_round(round_id)
        return engine.state

    def get_side_bet_results(self, round_id: str) -> list[SideBetResult]:
        _, _, side_bets, _ = self._get_round(round_id)
        return side_bets

    def _get_round(self, round_id: str) -> tuple[BlackjackEngine, str, list[SideBetResult], int]:
        if round_id not in _rounds:
            raise RoundNotFoundError(f"Round {round_id} not found")
        return _rounds[round_id]

    async def _settle_wallet(self, player_id: str, total_bet: int, state: BlackjackState) -> None:
        delta = state.net_delta or 0
        return_amount = total_bet + delta
        if return_amount > 0:
            await self._wallet.credit(player_id, return_amount)
