from __future__ import annotations

import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from audio_transcription.api.deps import get_db
from audio_transcription.api.schemas import JobCreate, JobDashboardSummary, JobListResponse, JobPatch, JobRead
from audio_transcription.db.constants import JobSourceType, JobStatus
from audio_transcription.db.models.job import Job
from audio_transcription.db.models.user import User

router = APIRouter(prefix="/jobs", tags=["jobs"])

_STATUSES = {s.value for s in JobStatus}
_SOURCE_TYPES = {s.value for s in JobSourceType}
_TERMINAL = {JobStatus.completed.value, JobStatus.failed.value, JobStatus.cancelled.value}
_WHISPER_MODELS = frozenset({"tiny", "base", "small", "medium", "large"})


def _job_or_404(session: Session, job_id: uuid.UUID) -> Job:
    job = session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", response_model=JobRead, status_code=201)
def create_job(
    body: JobCreate,
    session: Session = Depends(get_db),
) -> Job:
    if body.source_type not in _SOURCE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source_type. Allowed: {sorted(_SOURCE_TYPES)}",
        )
    if body.whisper_model is not None and body.whisper_model.strip().lower() not in _WHISPER_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid whisper_model. Allowed: {sorted(_WHISPER_MODELS)}",
        )
    if body.user_id is not None and session.get(User, body.user_id) is None:
        raise HTTPException(status_code=400, detail="user_id does not exist")
    if body.parent_job_id is not None and session.get(Job, body.parent_job_id) is None:
        raise HTTPException(status_code=400, detail="parent_job_id does not exist")

    wm = body.whisper_model.strip().lower() if body.whisper_model else None
    job = Job(
        source_type=body.source_type,
        filename=body.filename,
        source_url=body.source_url,
        provider=body.provider,
        whisper_model=wm,
        language=body.language,
        user_id=body.user_id,
        parent_job_id=body.parent_job_id,
        status=JobStatus.queued.value,
    )
    session.add(job)
    session.flush()
    session.refresh(job)
    return job


@router.get("/summary", response_model=JobDashboardSummary)
def jobs_dashboard_summary(session: Session = Depends(get_db)) -> JobDashboardSummary:
    rows = session.execute(select(Job.status, func.count()).group_by(Job.status)).all()
    by_status: dict[str, int] = {s.value: 0 for s in JobStatus}
    for status, count in rows:
        by_status[str(status)] = int(count)
    total = sum(by_status.values())
    return JobDashboardSummary(total=total, by_status=by_status)


# Register list route before /{job_id} so /jobs is never matched as a UUID path.
@router.get("", response_model=JobListResponse)
def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: str | None = Query(None, description="Filter by job status"),
    user_id: uuid.UUID | None = Query(None, description="Filter by owning user"),
    q: str | None = Query(None, description="Search id, filename, or source URL (substring)"),
    session: Session = Depends(get_db),
) -> JobListResponse:
    stmt = select(Job)
    count_stmt = select(func.count()).select_from(Job)
    if status is not None:
        if status not in _STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status filter. Allowed: {sorted(_STATUSES)}",
            )
        stmt = stmt.where(Job.status == status)
        count_stmt = count_stmt.where(Job.status == status)
    if user_id is not None:
        stmt = stmt.where(Job.user_id == user_id)
        count_stmt = count_stmt.where(Job.user_id == user_id)
    if q is not None and (term := q.strip()):
        like = f"%{term}%"
        search_cond = or_(
            Job.filename.ilike(like),
            Job.source_url.ilike(like),
            cast(Job.id, String).ilike(like),
        )
        stmt = stmt.where(search_cond)
        count_stmt = count_stmt.where(search_cond)

    stmt = stmt.order_by(Job.created_at.desc()).limit(limit).offset(offset)
    rows = list(session.scalars(stmt).all())
    total = int(session.scalar(count_stmt) or 0)
    items = [JobRead.model_validate(r) for r in rows]
    return JobListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{job_id}/stream")
async def job_event_stream(job_id: uuid.UUID, request: Request) -> StreamingResponse:
    """Server-Sent Events: push job JSON until status is terminal (for live UI)."""
    factory = getattr(request.app.state, "session_factory", None)
    if factory is None:
        raise HTTPException(status_code=503, detail="Database is not configured. Set DATABASE_URL.")

    async def gen():
        while True:
            if await request.is_disconnected():
                break
            db = factory()
            try:
                job = db.get(Job, job_id)
                if job is None:
                    yield f"data: {json.dumps({'error': 'not_found'})}\n\n"
                    break
                payload = JobRead.model_validate(job).model_dump(mode="json")
                yield f"data: {json.dumps(payload)}\n\n"
                if job.status in _TERMINAL:
                    break
            finally:
                db.close()
            await asyncio.sleep(1.2)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.websocket("/{job_id}/ws")
async def job_websocket(websocket: WebSocket, job_id: uuid.UUID) -> None:
    """WebSocket: push job JSON until status is terminal (same payload as GET job)."""
    factory = getattr(websocket.app.state, "session_factory", None)
    if factory is None:
        await websocket.close(code=1011, reason="Database not configured")
        return
    await websocket.accept()
    try:
        while True:
            db = factory()
            try:
                job = db.get(Job, job_id)
                if job is None:
                    await websocket.send_json({"error": "not_found"})
                    break
                payload = JobRead.model_validate(job).model_dump(mode="json")
                await websocket.send_json(payload)
                if job.status in _TERMINAL:
                    break
            finally:
                db.close()
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        pass


@router.get("/{job_id}", response_model=JobRead)
def get_job(
    job_id: uuid.UUID,
    session: Session = Depends(get_db),
) -> Job:
    return _job_or_404(session, job_id)


@router.patch("/{job_id}", response_model=JobRead)
def patch_job(
    job_id: uuid.UUID,
    body: JobPatch,
    session: Session = Depends(get_db),
) -> Job:
    job = _job_or_404(session, job_id)
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        new_status = data["status"]
        if new_status not in _STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {sorted(_STATUSES)}",
            )
        if job.status in _TERMINAL and new_status != job.status:
            raise HTTPException(
                status_code=409,
                detail="Cannot change status of a job that is already completed, failed, or cancelled",
            )
    for key, value in data.items():
        setattr(job, key, value)
    session.add(job)
    session.flush()
    session.refresh(job)
    return job
