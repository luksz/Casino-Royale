from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    app_name: str


class ErrorResponse(BaseModel):
    detail: str
