from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.agentic_rag import run_agentic_rag, stream_agentic_rag

router = APIRouter()

class ChatRequest(BaseModel):
    repoId: str
    message: str
    conversationHistory: Optional[List[Dict[str, str]]] = []

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
    result = run_agentic_rag(
        request.repoId,
        request.message,
        request.conversationHistory,
    )
    return {
        "response": result.get("response", ""),
        "citations": result.get("citations", []),
    }

@router.post("/chat/stream")
def chat_stream(request: ChatRequest):
    return StreamingResponse(
        stream_agentic_rag(
            request.repoId,
            request.message,
            request.conversationHistory,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )