import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import create_app
from app.persistence.database import Base, get_session
from app.persistence.repositories.player_repository import PlayerRepository
from app.services.player_service import PlayerService
from app.services.wallet_service import WalletService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DB_URL)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session(engine):
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s


@pytest_asyncio.fixture
def player_repo(session: AsyncSession) -> PlayerRepository:
    return PlayerRepository(session)


@pytest_asyncio.fixture
def player_service(player_repo: PlayerRepository) -> PlayerService:
    return PlayerService(player_repo)


@pytest_asyncio.fixture
def wallet_service(player_repo: PlayerRepository) -> WalletService:
    return WalletService(player_repo)


@pytest_asyncio.fixture
async def client(engine):
    app = create_app()
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session():
        async with factory() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
