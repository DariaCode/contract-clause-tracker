"""FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import annotations, documents, labels
from .seed import seed_documents, seed_labels


@asynccontextmanager
async def lifespan(app: FastAPI):
    # For a small app we create tables on startup instead of running Alembic
    # migrations. Swap in Alembic when the schema starts to evolve.
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_labels(db)
        seed_documents(db)
    yield


app = FastAPI(
    title="Contract Clause Tracker API",
    version="0.1.0",
    description="Upload contracts, label sentences, and track labels across documents.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(labels.router)
app.include_router(annotations.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
