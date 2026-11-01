from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.insights_generator import (
    generate_architecture_insights,
    generate_api_docs,
    generate_onboarding_guide,
)

router = APIRouter()

class InsightRequest(BaseModel):
    repoId: str
    branch: Optional[str] = "main"

@router.post("/insights/architecture")
def get_architecture(request: InsightRequest) -> Dict[str, Any]:
    return generate_architecture_insights(request.repoId, request.branch)

@router.post("/insights/api-docs")
def get_api_docs(request: InsightRequest) -> Dict[str, Any]:
    endpoints = generate_api_docs(request.repoId, request.branch)
    return {"endpoints": endpoints}

@router.post("/insights/onboarding")
def get_onboarding(request: InsightRequest) -> Dict[str, Any]:
    guide = generate_onboarding_guide(request.repoId, request.branch)
    return {"markdown": guide}
