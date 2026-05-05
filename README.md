# Casino Royale

A local-first casino web app with ten fully playable games. Backend in Python (FastAPI), frontend in React + TypeScript. Each game is a pure, tested engine with a thin API and animated UI on top.

![Casino Royale](https://img.shields.io/badge/status-playable-gold) ![Python](https://img.shields.io/badge/python-3.11+-blue) ![React](https://img.shields.io/badge/react-18-blue) ![Tests](https://img.shields.io/badge/tests-42%20passing-green)

---

## Games

### Casino Games

| Game | Description |
|------|-------------|
| 🃏 **Blackjack** | Full rules — Hit, Stand, Double, Split, Surrender. 3:2 on naturals. Perfect Pairs + 21+3 side bets. |
| 🎡 **Roulette** | European wheel (single zero). All bet types: straight, dozens, columns, red/black, odd/even. |
| 🎴 **Baccarat** | Punto Banco with full third-card drawing rules. Player / Banker / Tie. 5% banker commission. |
| ⚔️ **Casino War** | Higher card wins. Ties trigger War — burn three, deal again. |
| ♠️ **Five Card Draw** | Vs a bot opponent. Click cards to discard and draw. Bot uses pair/flush-draw AI. |

### Games

| Game | Description |
|------|-------------|
| 🎰 **Slots** | 3-reel weighted RNG. Six symbols, up to 100× on triple sevens. |
| 🎲 **Dice** | Roll two dice. Bet on High (8+), Low (6−), Seven, Any Double, Odd, or Even. |
| 🃏 **Hi-Lo** | Deal a card, then guess Higher or Lower. Correct guesses multiply your stake — cash out any time. |
| 🔢 **Keno** | Pick 1–10 numbers. Choose how many are drawn (5–40) from a pool of 80. Dynamic payouts via hypergeometric odds with 25% house edge. |
| 🎱 **Toto** | Lottery-style. Pick 6 from 49. Draw 6 main numbers + 1 bonus. Seven prize tiers from 45:1 (3 matches) up to 49,999:1 jackpot. Quick Pick supported. |

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

You need Python 3.11+ and Node 18+.

### 1. Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

API docs available at http://localhost:8001/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

> **Note:** If port 8000 is in use by another project, the backend defaults to **8001**. The Vite proxy is already configured to match.

---

## Project Structure

```
Casino Royale/
├── backend/
│   ├── app/
│   │   ├── core/              # Pure game engines — no framework imports
│   │   │   ├── cards/         # Card, Suit, Rank, Shoe
│   │   │   ├── rng/           # Seedable RNG (SeededRNG / SecureRNG)
│   │   │   └── games/         # blackjack, roulette, baccarat, slots, war, poker, dice, hilo, keno, toto
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

---

## Makefile

```bash
make dev-backend    # Start backend on port 8001
make dev-frontend   # Start frontend on port 5173
make test           # Run pytest
make lint           # ruff + mypy + eslint + tsc
```
