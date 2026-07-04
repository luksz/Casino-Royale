import uuid
from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.persistence.database import Base


def _now() -> datetime:
    return datetime.now(UTC)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    display_name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    balance: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )
