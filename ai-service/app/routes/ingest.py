from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from app.services.ingestion import process_repository

router = APIRouter()

class IngestRequest(BaseModel):
    repoId: str
    githubUrl: str
    githubToken: Optional[str] = None
    defaultBranch: Optional[str] = "main"

@router.post("/ingest")
def ingest_repo(request: IngestRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        process_repository,
        request.repoId,
        request.githubUrl,
        request.githubToken,
        request.defaultBranch,
    )
    return {"status": "Ingestion started", "repoId": request.repoId}
