from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from audio_transcription.api.config import load_settings
from audio_transcription.api.routers import batch, health, jobs, subtitles, transcribe, users, youtube

# AssemblyAI routes (disabled). Uncomment the next line and `include_router(assembly.router)` below to enable.
# from audio_transcription.api.routers import assembly

from audio_transcription.db.session import make_engine, make_session_factory


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.settings = load_settings()
    app.state.whisper_services = {}
    db_url = app.state.settings.database_url
    if db_url:
        app.state.engine = make_engine(db_url)
        app.state.session_factory = make_session_factory(app.state.engine)
    else:
        app.state.engine = None
        app.state.session_factory = None
    try:
        yield
    finally:
        engine = getattr(app.state, "engine", None)
        if engine is not None:
            engine.dispose()


def create_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(
        title="Audio Transcription API",
        description="HTTP API over Whisper, YouTube download, subtitles, and batch transcription.",
        version="0.1.0",
        lifespan=lifespan,
    )

    allow_origins = settings.cors_origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = "/api/v1"
    app.include_router(health.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(jobs.router, prefix=prefix)
    app.include_router(transcribe.router, prefix=prefix)
    app.include_router(youtube.router, prefix=prefix)
    app.include_router(subtitles.router, prefix=prefix)
    # app.include_router(assembly.router, prefix=prefix)  # AssemblyAI — pair with import above
    app.include_router(batch.router, prefix=prefix)

    @app.get("/", include_in_schema=False)
    def root_redirect():
        return RedirectResponse(url="/docs")

    return app


app = create_app()


def run_dev() -> None:
    import uvicorn

    uvicorn.run(
        "audio_transcription.api.main:app",
        host="0.0.0.0",
        port=int(__import__("os").environ.get("PORT", "8000")),
        reload=True,
    )
