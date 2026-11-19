import os
from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.chat import router as chat_router
from app.routes.ingest import router as ingest_router
from app.routes.insights import router as insights_router
from app.services.ingestion import notify_shutdown_abort

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Runs during shutdown (Ctrl+C, SIGTERM)
    notify_shutdown_abort()

app = FastAPI(
    title="Repo Mind AI Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    chat_router,
    prefix="/ai",
    tags=["AI"],
)

app.include_router(
    ingest_router,
    prefix="/ai",
    tags=["AI"],
)

app.include_router(
    insights_router,
    prefix="/ai",
    tags=["AI"],
)

@app.get("/")
def root():
    return {
        "message": "RepoMind AI Service is running"
    }   


@app.get("/health")
def health():
    return {
        "status": "ok"
    }