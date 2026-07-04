from datetime import datetime

from pydantic import BaseModel, field_validator


class PlayerCreateRequest(BaseModel):
    display_name: str

    @field_validator("display_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("display_name cannot be empty")
        return v


class PlayerResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    display_name: str
    balance: int
    created_at: datetime
    updated_at: datetime


class BalanceResponse(BaseModel):
    player_id: str
    balance: int
