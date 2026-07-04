# Casino Royale

A local-first casino web app with eleven fully playable games. Backend in Python (FastAPI), frontend in React + TypeScript. Each game is a pure, tested engine with a thin API and animated UI on top.

![Casino Royale](https://img.shields.io/badge/status-playable-gold) ![Python](https://img.shields.io/badge/python-3.11+-blue) ![React](https://img.shields.io/badge/react-18-blue) ![Tests](https://img.shields.io/badge/tests-42%20passing-green)

---

## Games

### Casino Games

| Game | Description |
|------|-------------|
| 🃏 **Blackjack** | Full rules — Hit, Stand, Double, Split, Surrender. 3:2 on naturals. Perfect Pairs + 21+3 side bets. |
| 🎡 **Roulette** | European wheel (single zero). All bet types: straight, dozens, columns, red/black, odd/even. |
| 🎴 **Baccarat** | Punto Banco with full third-card drawing rules. Player / Banker / Tie. 5% banker commission. |
| ⚔️ **Casino War** | Higher card wins. Ties trigger War — an equal raise goes up (2× stake at risk), burn three, deal again. War win pays the original bet; tie-after-tie pays a 2× bonus. |
| ♠️ **Five Card Draw** | Vs a bot opponent. Click cards to discard and draw. Bot uses pair/flush-draw AI. |

### Games

| Game | Description |
|------|-------------|
| 🎰 **Slots** | 3-reel weighted RNG. Six symbols, up to 200× on triple sevens. Pair of cherries or sevens pays a consolation. |
| 🎲 **Dice** | Roll two dice, Over/Under 7 style. Bet on High (8+), Low (6−), Seven (4:1), Any Double (4:1), Odd, or Even (7 pushes; doubles lose Even). |
| 🃏 **Hi-Lo** | Deal a card, then guess Higher or Lower. Live per-card odds shown on each button. Correct guesses multiply your stake — cash out any time. |
| 🔢 **Keno** | Pick 1–10 numbers. Choose how many are drawn (5–40) from a pool of 80. Must match at least half your picks to win. Dynamic payouts via hypergeometric odds with 25% house edge. |
| 🎱 **Toto** | Lottery-style. Pick 6 from 49. Draw 6 main numbers + 1 bonus. Seven prize tiers from 15× (3 matches) up to 100,000× jackpot. Quick Pick supported. |
| 🎳 **Pachinko** | Drop balls through a peg board (Plinko-style). Choose 8/12/16 rows and Low/Medium/High risk. Multipliers up to 1000× on high risk. 1–5 balls per drop, animated slot-by-slot. Spam-drop supported — queue multiple drops without waiting. |

### House Edge

Every game has been audited so the house always has a real (but fair) edge:

| Game | House edge |
|------|-----------|
| Blackjack | ~0.5% (basic strategy) |
| Baccarat | 1.1–1.2% (Player/Banker) |
| Casino War | ~2.3% |
| Roulette | 2.7% (European) |
| Hi-Lo | ~4% per guess |
| Slots | ~6.4% |
| Dice | 16.7% (classic Over/Under 7 odds, all bets) |
| Keno | ~25% |
| Toto | ~49% (RTP ~51%, typical lottery) |
| Pachinko | ~1–5% depending on rows/risk |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2 (async) |
| Database | SQLite via `aiosqlite` (zero-setup) |
| Testing | `pytest`, `pytest-asyncio`, `httpx`, `hypothesis` |
| Frontend | React 18, TypeScript (strict), Vite, TailwindCSS |
| State | Zustand (client) + TanStack Query (server) |
| Animations | Framer Motion |

---

## Quick Start

You need:

- Python 3.11+
- Node.js 18+
- npm

From a fresh clone, install the backend and frontend dependencies:

```bash
# From the repository root
cd backend
python3.11 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env

cd ../frontend
npm ci
```

Start the app in two terminal windows.

Terminal 1 - backend:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Terminal 2 - frontend:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173. The API docs are available at http://localhost:8001/docs.

The frontend proxies `/api` requests to `http://127.0.0.1:8001`, so keep the backend on port `8001` unless you also update `frontend/vite.config.ts`.

The SQLite database is created automatically at `backend/casino_royale.db` the first time the backend starts.

---

## Project Structure

```
Casino Royale/
├── backend/
│   ├── app/
│   │   ├── core/              # Pure game engines — no framework imports
│   │   │   ├── cards/         # Card, Suit, Rank, Shoe
│   │   │   ├── rng/           # Seedable RNG (SeededRNG / SecureRNG)
│   │   │   └── games/         # blackjack, roulette, baccarat, slots, war, poker, dice, hilo, keno, toto, pachinko
│   │   ├── api/               # FastAPI routes + Pydantic schemas
│   │   ├── services/          # Wallet, Player, game session orchestration
│   │   ├── persistence/       # SQLAlchemy models + repositories
│   │   ├── config/            # pydantic-settings
│   │   └── main.py            # create_app() factory
│   ├── tests/
│   │   ├── unit/              # Pure logic tests + property-based (Hypothesis)
│   │   └── integration/       # API tests via httpx ASGI transport
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── games/             # One folder per game UI
│   │   ├── components/        # PlayingCard, Hand, Chip, BetControl
│   │   ├── hooks/             # usePlayer, useBlackjack
│   │   ├── lib/               # Typed fetch wrapper, utils
│   │   ├── pages/             # LandingPage, LobbyPage
│   │   ├── store/             # Zustand session store (persisted to localStorage)
│   │   └── types/             # TypeScript types mirroring Pydantic schemas
│   └── package.json
└── Makefile
```

---

## Running Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

42 tests — unit tests for every game engine, property-based invariant tests (Hypothesis), and integration tests against the full API.

Frontend checks:

```bash
cd frontend
npm run typecheck
npm run lint
```

---

## Architecture Principles

- **`core/` imports nothing from `api/` or `persistence/`** — game engines run in unit tests with no DB and no HTTP.
- **All randomness flows through `core/rng/`** — never `import random` in game code. Seeded RNG makes games deterministic in tests.
- **Money is always integer chips** — never floats. `WalletService` is the only code that mutates balances.
- **Repository pattern** — services depend on repository interfaces, not SQLAlchemy sessions directly.
- **App factory pattern** — `create_app()` lets tests spin up isolated instances with dependency overrides.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=sqlite+aiosqlite:///./casino_royale.db
STARTING_BALANCE=10000
RNG_SEED=
```

Leave `RNG_SEED` empty for cryptographically secure randomness in production. Set it to any integer for deterministic/reproducible games (useful for testing).

If your shell already exports one of these names, it can override `.env`. For example, `DEBUG` must be `true` or `false`; unset it if your shell uses a different value:

```bash
unset DEBUG
```

---

## Makefile

The Makefile is a convenience wrapper after the Python virtual environment and Node dependencies are installed.

```bash
make install        # Install Python and Node dependencies after backend/.venv exists
make dev-backend    # Start backend on port 8001
make dev-frontend   # Start frontend on port 5173
make test           # Run pytest
make lint           # ruff + mypy + eslint + tsc
```
