from pydantic import BaseModel

class ActionPayload(BaseModel):
    """Payload model for execution requests submitted to /action."""
    type: str
    target: str | None = None
    url: str | None = None
    cmd: str | None = None
    value: int | None = None
    delta: int | None = None
    host: str | None = None
    command: str | None = None
