from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    baccarat,
    blackjack,
    dice,
    health,
    hilo,
    keno,
    pachinko,
    players,
    poker,
    roulette,
    slots,
    toto,
    war,
)
from app.config.settings import get_settings
from app.logging_config import setup_logging
from app.persistence.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    setup_logging(debug=settings.debug)
    await init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(players.router, prefix="/api/v1")
    app.include_router(blackjack.router, prefix="/api/v1")
    app.include_router(roulette.router, prefix="/api/v1")
    app.include_router(baccarat.router, prefix="/api/v1")
    app.include_router(slots.router, prefix="/api/v1")
    app.include_router(war.router, prefix="/api/v1")
    app.include_router(poker.router, prefix="/api/v1")
    app.include_router(dice.router, prefix="/api/v1")
    app.include_router(hilo.router, prefix="/api/v1")
    app.include_router(keno.router, prefix="/api/v1")
    app.include_router(toto.router, prefix="/api/v1")
    app.include_router(pachinko.router, prefix="/api/v1")

    return app


app = create_app()
