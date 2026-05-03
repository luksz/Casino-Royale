from fastapi import APIRouter

from app.api.schemas.common import HealthResponse
from app.config.settings import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(app_name=settings.app_name)
