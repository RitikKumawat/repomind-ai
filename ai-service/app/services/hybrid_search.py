import os
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from google import genai
from google.genai import types
from rank_bm25 import BM25Okapi
from flashrank import Ranker, RerankRequest

qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
qdrant_client = QdrantClient(url=qdrant_url, check_compatibility=False)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

COLLECTION_NAME = "repomind_code"

# Initialize lightweight FlashRank cross-encoder for high-accuracy reranking
reranker = None
try:
    reranker = Ranker()
except Exception as e:
    print(f"Warning: FlashRank initialization deferred or fallback: {e}")

def get_query_embedding(text: str) -> List[float]:
    """Generates 768-dim embedding using Google gemini-embedding-001."""
    response = gemini_client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=768),
    )
    return response.embeddings[0].values

def tokenize_code(text: str) -> List[str]:
    """Tokenizes code for BM25 lexical matching."""
    # Split by identifier boundaries and non-alphanumeric chars
    tokens = re.findall(r"[A-Za-z0-9_]+", text.lower())
    return [t for t in tokens if len(t) > 1]

def hybrid_search_and_rerank(
    repo_id: str,
    query: str,
    top_candidates: int = 25,
    rerank_limit: int = 7,
) -> List[Dict[str, Any]]:
    """
    Executes advanced Hybrid Search (Dense Vector + BM25) followed by
    Cross-Encoder Re-Ranking using FlashRank.
    """
    # 1. Dense retrieval from Qdrant
    query_vector = get_query_embedding(query)
    dense_hits = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
        ),
        limit=top_candidates,
    )

    if not dense_hits:
        return []

    # 2. Prepare candidate pool
    candidates: List[Dict[str, Any]] = []
    corpus_tokens: List[List[str]] = []

    for idx, hit in enumerate(dense_hits):
        payload = hit.payload or {}
        content = payload.get("content", "")
        item = {
            "id": hit.id,
            "dense_score": hit.score,
            "file_path": payload.get("file_path", ""),
            "scope": payload.get("scope", ""),
            "start_line": payload.get("start_line", 1),
            "end_line": payload.get("end_line", 1),
            "language": payload.get("language", ""),
            "text": content,
            "raw_content": payload.get("raw_content", ""),
            "symbols": payload.get("symbols", []),
            "parent_context": payload.get("parent_context", ""),
        }
        candidates.append(item)
        corpus_tokens.append(tokenize_code(content + " " + " ".join(item["symbols"])))

    # 3. BM25 Lexical Ranking
    query_tokens = tokenize_code(query)
    if query_tokens and corpus_tokens:
        bm25 = BM25Okapi(corpus_tokens)
        bm25_scores = bm25.get_scores(query_tokens)
        # Normalize BM25 scores
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
        for i, score in enumerate(bm25_scores):
            # Reciprocal Rank / Weighted Fusion Score
            norm_bm25 = score / max_bm25
            candidates[i]["bm25_score"] = norm_bm25
            candidates[i]["hybrid_score"] = 0.6 * candidates[i]["dense_score"] + 0.4 * norm_bm25
    else:
        for item in candidates:
            item["bm25_score"] = 0.0
            item["hybrid_score"] = item["dense_score"]

    # Sort candidates by hybrid score
    candidates.sort(key=lambda x: x["hybrid_score"], reverse=True)

    # 4. Cross-Encoder Re-Ranking (FlashRank)
    if reranker and len(candidates) > 1:
        passages = [
            {"id": i, "text": c["text"], "meta": {"file_path": c["file_path"]}}
            for i, c in enumerate(candidates[:top_candidates])
        ]
        rerank_request = RerankRequest(query=query, passages=passages)
        reranked_results = reranker.rerank(rerank_request)

        final_ranked: List[Dict[str, Any]] = []
        for res in reranked_results[:rerank_limit]:
            orig_idx = res["id"]
            matched_candidate = candidates[orig_idx]
            matched_candidate["rerank_score"] = res.get("score", 0.0)
            final_ranked.append(matched_candidate)
        return final_ranked

    return candidates[:rerank_limit]

def lookup_symbol_exact(repo_id: str, symbol_name: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Direct symbol lookup in Qdrant payload."""
    symbol_clean = symbol_name.strip()
    hits = qdrant_client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(
            must=[
                FieldCondition(key="repo_id", match=MatchValue(value=repo_id)),
                FieldCondition(key="symbols", match=MatchValue(value=symbol_clean)),
            ]
        ),
        limit=limit,
    )[0]

    results = []
    for hit in hits:
        p = hit.payload or {}
        results.append({
            "file_path": p.get("file_path", ""),
            "scope": p.get("scope", ""),
            "start_line": p.get("start_line", 1),
            "end_line": p.get("end_line", 1),
            "content": p.get("content", ""),
            "raw_content": p.get("raw_content", ""),
        })
    return results
