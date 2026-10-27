from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import close_pool, init_pool
from app.routes import save


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool(settings.database_url)
    try:
        yield
    finally:
        await close_pool()


# The interactive docs list every route, so production doesn't serve them.
_docs_off = settings.env == "production"
app = FastAPI(
    title="FORMA API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None if _docs_off else "/docs",
    redoc_url=None if _docs_off else "/redoc",
    openapi_url=None if _docs_off else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=False,
    allow_methods=["GET", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(save.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
