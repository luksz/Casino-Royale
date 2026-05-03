# Casino Royale — Build Plan

A local-first casino & card games web app. Backend in Python (FastAPI), frontend in React + TypeScript. Architected so each game is a pure, testable Python engine with a thin API and React UI on top.

> **For Claude Code:** Execute this plan top to bottom. Treat each phase as a milestone — finish and verify before moving on. Run tests after every meaningful change. Don't skip the foundation; the entire app's robustness depends on it.

---

## 1. Goals & Non-Goals

**Goals**
- Run entirely on localhost (no auth, no cloud, no real money).
- Multiple casino games sharing common primitives (cards, RNG, wallet).
- Clean separation: pure game engines → services → API → UI.
- Production-mindset code: typed, tested, structured logs, dependency injection.
- Pretty UI worthy of the name "Casino Royale" (deep felt green, gold, velvet red).

**Non-goals (for v1)**
- No multi-user / no real auth (single local "player profile" is enough).
- No real money, no payments, no KYC.
- No deployment infra (Docker is fine but not required to start).

---

## 2. Tech Stack

| Layer       | Choice                                                  | Why |
|-------------|---------------------------------------------------------|-----|
| Backend     | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2 (async)| Fast dev loop, async-friendly, strong typing |
| DB          | SQLite via `aiosqlite` (swap to Postgres later)         | Zero-setup local persistence |
| Logging     | `structlog`                                             | Structured logs from day one |
| Tests       | `pytest`, `pytest-asyncio`, `httpx`, `hypothesis`       | Standard + property-based for game invariants |
| Frontend    | React 18, TypeScript (strict), Vite, TailwindCSS        | Fast HMR, great DX, easy theming |
| State       | Zustand (client) + TanStack Query (server)              | Minimal boilerplate, server-state caching |
| Animations  | Framer Motion                                           | Card flips, chip movements |
| Routing     | React Router v6                                         | Standard |

---

## 3. Architecture

```
casino-royale/
├── backend/
│   ├── app/
│   │   ├── core/              # PURE game logic — no framework imports
│   │   │   ├── cards/         # Card, Suit, Rank, Shoe (shared primitives)
│   │   │   ├── rng/           # Seedable RNG abstraction
│   │   │   └── games/         # blackjack/, roulette/, poker/, etc.
│   │   ├── api/               # FastAPI routes, schemas, deps
│   │   ├── services/          # Wallet, Player, Game session orchestration
│   │   ├── persistence/       # SQLAlchemy models, repositories, DB engine
│   │   ├── config/            # pydantic-settings
│   │   ├── logging_config.py
│   │   └── main.py            # create_app() factory
│   ├── tests/
│   │   ├── unit/              # Pure logic tests
│   │   └── integration/       # API tests via httpx ASGI transport
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── games/             # One folder per game UI
│   │   ├── components/        # Card, Chip, Table, Dealer (shared)
│   │   ├── hooks/             # useGame, useWallet, useApi
│   │   ├── lib/               # api client, utils
│   │   ├── pages/             # Landing, Lobby, per-game pages
│   │   ├── types/             # Shared TS types (mirror Pydantic schemas)
│   │   └── store/             # Zustand stores
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── scripts/                   # dev helpers
├── README.md
└── Makefile
```

### Key architectural rules (enforce these)

1. **`core/` imports nothing from `api/`, `persistence/`, or any web framework.** Game engines must run in a unit test with no DB and no HTTP.
2. **All randomness flows through `core/rng/`.** Never `import random` directly in game code. This makes games deterministic in tests via seeding.
3. **Repository pattern for all DB access.** Services depend on repository interfaces, not on SQLAlchemy sessions.
4. **Money is always integer chips.** Never floats. The `WalletService` is the only code that mutates balances.
5. **Pydantic schemas at every API boundary** — both request validation and response serialization with `from_attributes=True`.
6. **App factory pattern** (`create_app()`) so tests can spin up isolated app instances with overridden dependencies.

---

## 4. Implementation Phases

### Phase 1 — Foundation (do this first, completely, before any game)

**Backend foundation**
1. Set up `pyproject.toml` with deps from the table above + dev extras (ruff, mypy, pytest-cov).
2. `app/config/settings.py` — `pydantic-settings` `Settings` class with: `app_name`, `environment`, `debug`, `database_url`, `cors_origins`, `starting_balance` (default 10_000), `rng_seed` (None for prod). Cached via `@lru_cache get_settings()`.
3. `app/logging_config.py` — `structlog` setup, console renderer in dev, JSON in prod.
4. `app/core/cards/card.py`:
   - `Suit` enum (CLUBS, DIAMONDS, HEARTS, SPADES) with `symbol` property (♣♦♥♠).
   - `Rank` enum (TWO..ACE) with `display` property ("10" for TEN).
   - `Card` frozen dataclass with `slots=True`, `__str__`, `code` property ("AS"), `from_code` classmethod.
5. `app/core/cards/shoe.py`:
   - `build_standard_deck() -> list[Card]` (52 cards).
   - `Shoe(rng, decks=1)` with `draw()`, `draw_many(n)`, `reshuffle()`, `__len__`, `penetration` property.
   - Raises `EmptyShoeError` on draw from empty.
6. `app/core/rng/rng.py`:
   - `RNG` Protocol with `shuffle`, `randint`, `random`, `choice`.
   - `SeededRNG(seed)` wrapping `random.Random` for tests.
   - `SecureRNG()` wrapping `secrets.SystemRandom` for prod.
   - `make_rng(seed=None, secure=False)` factory.
7. `app/persistence/database.py` — async SQLAlchemy engine, `async_sessionmaker`, `Base`, `get_session` FastAPI dep, `init_db()`.
8. `app/persistence/models/player.py` — `Player` model: `id` (UUID str PK), `display_name` (unique), `balance` (BigInteger), `created_at`, `updated_at`.
9. `app/persistence/repositories/player_repository.py` — `PlayerRepository` with `create`, `get`, `get_by_name`, `update_balance`, `list_all`. Raises `PlayerNotFoundError`.
10. `app/services/wallet_service.py` — `WalletService` with `credit`, `debit`, `get_balance`. Validates amounts > 0, raises `InsufficientFundsError`. Returns `WalletTransaction` dataclass.
11. `app/services/player_service.py` — `PlayerService.create_player(display_name)` enforces uniqueness, uses `starting_balance` from settings.
12. `app/api/dependencies.py` — `Annotated[T, Depends(...)]` providers for session, repos, services.
13. `app/api/schemas/` — `player.py` (`PlayerCreateRequest`, `PlayerResponse`, `BalanceResponse`), `common.py` (`HealthResponse`, `ErrorResponse`).
14. `app/api/routes/health.py` — `GET /health`.
15. `app/api/routes/players.py` — `POST /players`, `GET /players`, `GET /players/{id}`, `GET /players/{id}/balance`. Map domain exceptions to HTTP codes.
16. `app/main.py` — `create_app()` factory: configures CORS, includes routers under `/api/v1`, lifespan hook for `init_db()` and logging setup.

**Backend tests (write these alongside code, not after)**
- `tests/conftest.py` — fixtures: in-memory SQLite engine, session, repo, ASGI test `client` with dependency overrides.
- `tests/unit/core/test_cards.py` — Card immutability, code roundtrip, Shoe count/draw/reshuffle/penetration, same-seed-same-order property.
- `tests/unit/core/test_rng.py` — Determinism with seed, factory behavior.
- `tests/unit/services/test_wallet_service.py` — credit/debit/insufficient funds/invalid amounts.
- `tests/integration/api/test_players.py` — create player (201), duplicate (409), get/list/balance, validation errors (422).

**Acceptance criteria for Phase 1:** `pytest` passes, `uvicorn app.main:app --reload` boots, `GET /api/v1/health` returns 200, `POST /api/v1/players` creates a player with starting balance.

**Frontend foundation**
1. `package.json` with deps: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zustand`, `framer-motion`, `clsx`, `tailwind-merge`, `lucide-react`. Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, ESLint.
2. `vite.config.ts` — `@` alias to `./src`, dev server on 5173, proxy `/api` → `http://127.0.0.1:8000`.
3. `tsconfig.json` — strict mode, `paths` for `@/*`.
4. `tailwind.config.js` — custom palette:
   ```js
   colors: {
     felt:  { 500: '#0f7a3e', 700: '#0a5a2d', 900: '#053b1d' },
     gold:  { 400: '#f4c542', 500: '#d4a017', 600: '#a47d10' },
     royal: { 500: '#8b1a2b', 700: '#5a0e1d' },
     ivory: '#f7f3e8',
   }
   ```
   Fonts: Playfair Display (display) + Inter (body).
5. `index.html` — Google Fonts preconnect, root div, mount `/src/main.tsx`.
6. `src/index.css` — Tailwind layers, body bg with felt-green radial gradient, reusable `.btn-primary`, `.btn-ghost`, `.card-surface` classes.
7. `src/main.tsx` — `StrictMode` + `QueryClientProvider` + `BrowserRouter` + `<App />`.
8. `src/App.tsx` — header (Casino Royale wordmark in Playfair gold), nav links, `<Routes>`, footer.
9. `src/lib/api.ts` — typed fetch wrapper: `apiGet<T>(path)`, `apiPost<T>(path, body)`. Throws `ApiError` with status + detail. Base URL `/api/v1`.
10. `src/types/api.ts` — TS types mirroring Pydantic schemas (`Player`, `BalanceResponse`, etc.). Keep in sync manually for now — codegen later.
11. `src/hooks/usePlayer.ts` — TanStack Query hooks for create/get player, get balance.
12. `src/store/sessionStore.ts` — Zustand store: `currentPlayerId`, `setPlayer`, `clearPlayer`. Persist to `localStorage`.
13. `src/pages/LandingPage.tsx` — hero section, "Create Profile" CTA → form → POST creates player → store ID → navigate to lobby.
14. `src/pages/LobbyPage.tsx` — grid of game tiles (Blackjack enabled, others "Coming Soon"). Show current balance from API in the header.

**Acceptance criteria for Phase 1 frontend:** `npm run dev`, landing page loads, can create a profile, lobby shows balance.

---

### Phase 2 — Blackjack (the template for every other game)

This is the hardest game architecturally. Get it right and the rest are variations.

1. `app/core/games/blackjack/hand.py`:
   - `BlackjackHand` class. `add_card(card)`. `value` property handles soft/hard aces (return best total ≤ 21, else lowest). `is_blackjack`, `is_bust`, `is_soft` properties.
2. `app/core/games/blackjack/rules.py`:
   - `BlackjackRules` dataclass: `deck_count=6`, `dealer_hits_soft_17=False`, `blackjack_payout=Fraction(3,2)`, `double_after_split=True`, `surrender_allowed=True`, `max_splits=3`.
3. `app/core/games/blackjack/state.py`:
   - `GamePhase` enum: `BETTING, DEALING, PLAYER_TURN, DEALER_TURN, SETTLED`.
   - `PlayerAction` enum: `HIT, STAND, DOUBLE, SPLIT, SURRENDER`.
   - `Outcome` enum: `PLAYER_BLACKJACK, PLAYER_WIN, PUSH, DEALER_WIN, PLAYER_BUST, SURRENDER`.
   - `BlackjackState` dataclass: phase, player hands (list, for splits), dealer hand, current hand index, bet, available actions.
4. `app/core/games/blackjack/engine.py`:
   - `BlackjackEngine(rules, rng)`. Methods: `start_round(bet)`, `legal_actions()`, `apply_action(action)`, `settle() -> dict[Outcome, int]` (returns net chip delta per hand).
   - Pure: takes inputs, returns new states. No I/O.
5. **Tests** (do these before the API layer):
   - Unit tests for hand value (especially soft aces: A,6 = 17 soft / A,6,5 = 12 hard).
   - State machine tests: invalid action in wrong phase raises.
   - Property-based test with Hypothesis: across N random rounds, total chips in system (player + house) is invariant.
   - Specific scenarios: dealer blackjack, player surrender, split aces, double down bust.
6. `app/services/blackjack_service.py` — orchestrates a round: holds in-memory `dict[round_id, BlackjackEngine]`, debits bet on start, credits payout on settle. Uses `WalletService` for all chip moves.
7. `app/api/schemas/blackjack.py` — `StartRoundRequest`, `ActionRequest`, `RoundStateResponse` (serializes hands as card codes, current phase, legal actions).
8. `app/api/routes/blackjack.py`:
   - `POST /blackjack/rounds` — start round (body: player_id, bet) → `RoundStateResponse`.
   - `POST /blackjack/rounds/{round_id}/action` — apply action.
   - `GET /blackjack/rounds/{round_id}` — fetch current state.
9. **Frontend Blackjack**:
   - `src/components/cards/PlayingCard.tsx` — SVG card with rank/suit, face-down variant, `flipped` prop, framer-motion flip animation.
   - `src/components/cards/Hand.tsx` — fans cards out, shows total.
   - `src/components/casino/Chip.tsx` — colored chips by denomination (1, 5, 25, 100, 500).
   - `src/components/casino/BetControl.tsx` — chip stack to drag/click for bet sizing.
   - `src/components/casino/Table.tsx` — felt background, dealer slot, player slot.
   - `src/games/blackjack/BlackjackTable.tsx` — wires state from API, renders Table + Hands + ActionBar.
   - `src/games/blackjack/ActionBar.tsx` — Hit/Stand/Double/Split/Surrender buttons, only enabled if in `legal_actions`.
   - `src/games/blackjack/useBlackjack.ts` — hook: starts round, posts actions, polls/refetches state.
   - Add route `/games/blackjack` in `App.tsx`, link from lobby tile.

**Acceptance criteria for Phase 2:** Can play full rounds end-to-end. Balance persists. Rules are correct (3:2 BJ payout, dealer plays out properly, splits work).

---

### Phase 3 — Roulette

Different paradigm — pure RNG, no card state, but rich betting UI.

1. `app/core/games/roulette/wheel.py` — `EuropeanWheel` (single zero, 37 pockets), `spin(rng) -> int`. Optional: `AmericanWheel`.
2. `app/core/games/roulette/bets.py` — `BetType` enum (STRAIGHT, SPLIT, STREET, CORNER, RED, BLACK, ODD, EVEN, LOW, HIGH, DOZEN, COLUMN). `Bet` dataclass with `bet_type`, `numbers`, `amount`. `payout(winning_number) -> int`.
3. `app/core/games/roulette/engine.py` — accept bets, spin, settle.
4. Tests: payout correctness for every bet type (straight 35:1, red/black 1:1, dozen 2:1, etc.).
5. API: `POST /roulette/spin` with bets array → result + payouts.
6. UI: classic table layout (numbers grid + outside bets), chips drag to bet, spin animation, ball lands on number.

---

### Phase 4 — Poker (Five Card Draw → Texas Hold'em)

1. `app/core/games/poker/evaluator.py` — hand evaluator. Easiest path: integrate `treys` library. Educational path: implement your own (rank histogram + suit detection for flush + straight detection). Returns `HandRank` enum + tiebreaker tuple.
2. Five Card Draw first (single round of betting + draw + showdown vs simple AI bots).
3. Texas Hold'em second (preflop/flop/turn/river, betting rounds, side pots).
4. Bot opponents: simple equity-based decisions for v1, leave room for smarter strategies later.

---

### Phase 5 — Baccarat, Craps, Slots, War

Once the engine pattern is established these go fast. Slots is mostly UI/animation work over a simple weighted-RNG engine.

---

### Phase 6 — Polish

- Persistent stats per game (hands played, win rate, biggest pot).
- Daily login bonus.
- Sound effects (chip clack, card flip, win fanfare).
- Multiple table themes.
- Achievements / unlockables.
- WebSocket support for live multi-seat tables (future).

---

## 5. Quality Bar

Run these before committing any phase:

```bash
# Backend
cd backend
pytest                           # all tests pass
ruff check .                     # no lint errors
mypy app                         # no type errors

# Frontend
cd frontend
npm run typecheck                # tsc clean
npm run lint                     # eslint clean
npm run build                    # production build succeeds
```

**Property-based test invariants to enforce** (using Hypothesis):
- Conservation of chips: player_balance_delta + house_balance_delta == 0 across any round.
- Shoe never returns more cards than it contains.
- Hand value calculation is deterministic for the same card sequence.
- All bet payouts match published casino odds tables exactly.

---

## 6. Run Scripts

`Makefile` at repo root:
```makefile
.PHONY: install dev test lint clean

install:
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest

lint:
	cd backend && ruff check . && mypy app
	cd frontend && npm run lint && npm run typecheck
```

Two-terminal dev workflow: `make dev-backend` in one, `make dev-frontend` in the other. Frontend at http://localhost:5173, backend at http://localhost:8000, API docs at http://localhost:8000/docs.

`.env.example` at backend root:
```
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=sqlite+aiosqlite:///./casino_royale.db
STARTING_BALANCE=10000
RNG_SEED=
```

`.gitignore` at repo root: `__pycache__/`, `*.pyc`, `.pytest_cache/`, `.coverage`, `*.db`, `node_modules/`, `dist/`, `.env`, `.venv/`, `*.egg-info/`.

---

## 7. Order of Operations for Claude Code

1. Scaffold directories per Section 3.
2. Build Phase 1 backend foundation. **Run `pytest` — must pass before continuing.**
3. Build Phase 1 frontend foundation. **Run `npm run dev` and verify landing page works.**
4. Build Phase 2 Blackjack engine + tests. **Property-based tests must pass.**
5. Build Phase 2 Blackjack API + UI. **Play a full round end-to-end.**
6. Stop and demo. Don't move to Phase 3 until Blackjack feels good.
7. Phase 3+ as separate sessions.

---

## 8. Things Not To Do

- Don't put game logic in route handlers. Routes are thin adapters.
- Don't `import random` in game code — always go through `core/rng`.
- Don't use floats for money. Integer chips only.
- Don't skip tests for game engines — payouts being wrong is the worst possible bug.
- Don't add WebSockets, auth, or Docker until v1 plays well as an HTTP+SQLite localhost app.
- Don't hand-roll a poker hand evaluator unless you want to. `treys` is fine.
