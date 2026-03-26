from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.head("/health")
def health_head() -> Response:
    """Render and some load balancers probe with HEAD — must not return 405."""
    return Response(status_code=200)
