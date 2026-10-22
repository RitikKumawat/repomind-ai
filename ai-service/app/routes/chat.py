from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.agentic_rag import run_agentic_rag

router = APIRouter()

class ChatRequest(BaseModel):
    repoId: str
    message: str

class CitationItem(BaseModel):
    filePath: str
    startLine: int
    endLine: int
    scope: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    citations: List[CitationItem] = []

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    result = run_agentic_rag(request.repoId, request.message)
    return {
        "response": result.get("response", ""),
        "citations": result.get("citations", []),
    }