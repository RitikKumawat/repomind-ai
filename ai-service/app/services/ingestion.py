import os
import requests
import uuid
import time
from typing import Optional, List, Dict, Any, Callable
from dotenv import load_dotenv

load_dotenv()
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from google import genai
from google.genai import types
from app.services.ast_chunker import chunk_code_file

qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
qdrant_client = QdrantClient(url=qdrant_url, check_compatibility=False)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:4000")
COLLECTION_NAME = "repomind_code"

def ensure_collection_exists():
    try:
        qdrant_client.get_collection(COLLECTION_NAME)
    except Exception:
        try:
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE),
            )
        except Exception as e:
            print(f"Warning: Could not connect to Qdrant or create collection: {e}")

def send_status_webhook(
    repo_id: str,
    status: str,
    indexing_phase: str,
    total_files: int = 0,
    total_chunks: int = 0,
    processed_chunks: int = 0,
    error_message: Optional[str] = None,
):
    """Notifies the NestJS API gateway of ingestion lifecycle progress."""
    webhook_url = f"{API_GATEWAY_URL}/repo/webhook/status"
    payload = {
        "repoId": repo_id,
        "status": status,
        "indexingPhase": indexing_phase,
        "totalFiles": total_files,
        "totalChunks": total_chunks,
        "processedChunks": processed_chunks,
        "errorMessage": error_message,
    }
    try:
        requests.post(webhook_url, json=payload, timeout=5)
    except Exception as e:
        print(f"Failed to send webhook to {webhook_url}: {e}")

import re

def get_embeddings_batch(
    texts: List[str],
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> List[List[float]]:
    """
    Generates embeddings using Google gemini-embedding-001 (768-dim) in true batches.
    Handles Gemini API rate limits (429 RESOURCE_EXHAUSTED) with automated wait-and-retry.
    """
    if not texts:
        return []

    embeddings: List[List[float]] = []
    # Gemini embedContent supports passing a list of contents in one HTTP call.
    # Batch size 25 reduces total API calls by ~96%, avoiding the 100 requests/minute quota.
    batch_size = 25

    for i in range(0, len(texts), batch_size):
        raw_batch = texts[i : i + batch_size]
        # Ensure no empty contents
        batch = [t if (t and t.strip()) else " " for t in raw_batch]

        max_retries = 5
        base_delay = 25.0

        for attempt in range(max_retries):
            try:
                res = gemini_client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=batch,
                    config=types.EmbedContentConfig(output_dimensionality=768),
                )
                if res.embeddings:
                    for emb in res.embeddings:
                        embeddings.append(emb.values)
                # Successful call: inform progress callback
                if on_progress:
                    on_progress(len(embeddings), len(texts))
                # Subtle breather between batches to prevent quota bursts
                time.sleep(0.5)
                break
            except Exception as e:
                err_str = str(e)
                print(f"Embedding batch {i // batch_size + 1} attempt {attempt + 1}/{max_retries} failed: {err_str}")
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    retry_match = re.search(r"retry\s+(?:in\s+)?(\d+(?:\.\d+)?)s?", err_str, re.IGNORECASE)
                    if retry_match:
                        wait_time = float(retry_match.group(1)) + 2.0
                    else:
                        wait_time = base_delay * (attempt + 1)
                    print(f"Rate limit hit (429 RESOURCE_EXHAUSTED). Sleeping for {wait_time:.1f}s before retrying...")
                    time.sleep(wait_time)
                else:
                    if attempt == max_retries - 1:
                        raise e
                    time.sleep(2 * (attempt + 1))
        else:
            raise RuntimeError(f"Failed to generate embeddings after {max_retries} attempts.")

    return embeddings

def fetch_github_repo_files(
    github_url: str,
    github_token: Optional[str] = None,
    default_branch: Optional[str] = "main",
) -> List[Dict[str, str]]:
    """
    Recursively fetches source files using GitHub Git Trees API.
    Ignores binaries, lockfiles, and images.
    """
    clean_url = github_url.rstrip("/").replace(".git", "")
    parts = clean_url.split("/")
    if len(parts) < 2:
        return []
    owner, repo = parts[-2], parts[-1]

    headers = {"Accept": "application/vnd.github+json"}
    token = github_token or os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"

    branch = default_branch or "main"
    api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    response = requests.get(api_url, headers=headers, timeout=20)

    # Fallback to HEAD if specified branch fails
    if response.status_code != 200:
        api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
        response = requests.get(api_url, headers=headers, timeout=20)

    if response.status_code != 200:
        print(f"GitHub API Tree fetch failed ({response.status_code}): {response.text}")
        return []

    tree = response.json().get("tree", [])

    valid_extensions = {
        ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
        ".go", ".java", ".rs", ".md", ".json", ".yaml", ".yml",
        ".html", ".css", ".scss", ".sql", ".sh"
    }

    ignored_files = {
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "poetry.lock", "Cargo.lock", "go.sum"
    }

    files = []
    for item in tree:
        if item.get("type") == "blob":
            path = item.get("path", "")
            basename = os.path.basename(path)
            ext = os.path.splitext(path)[1].lower()

            if basename in ignored_files or any(p.startswith(".") for p in path.split("/")):
                continue

            if ext in valid_extensions:
                raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
                raw_res = requests.get(raw_url, headers=headers, timeout=15)
                if raw_res.status_code == 200:
                    files.append({
                        "path": path,
                        "content": raw_res.text,
                    })

    return files

ACTIVE_INGESTION_IDS: set = set()

def notify_shutdown_abort():
    """Notifies API gateway that running ingestion jobs were aborted due to server shutdown."""
    for repo_id in list(ACTIVE_INGESTION_IDS):
        try:
            send_status_webhook(
                repo_id,
                "FAILED",
                "FAILED",
                error_message="AI service worker was shut down or restarted.",
            )
        except Exception as e:
            print(f"Error notifying shutdown abort for {repo_id}: {e}")

def process_repository(
    repo_id: str,
    github_url: str,
    github_token: Optional[str] = None,
    default_branch: Optional[str] = "main",
):
    """
    Full end-to-end repository ingestion pipeline:
    1. Fetch repo files (Git tree)
    2. AST Syntax-Aware Semantic Chunking
    3. Generate Embeddings & Enrich Metadata
    4. Upsert into Qdrant
    5. Webhook status notifications
    """
    print(f"Starting advanced ingestion for {repo_id}: {github_url}")
    ACTIVE_INGESTION_IDS.add(repo_id)
    ensure_collection_exists()
    send_status_webhook(repo_id, "IN_PROGRESS", "FETCHING")

    try:
        files = fetch_github_repo_files(github_url, github_token, default_branch)
        if not files:
            send_status_webhook(
                repo_id,
                "FAILED",
                "FAILED",
                error_message="Could not fetch files from repository. Check URL and access permissions."
            )
            return

        total_files = len(files)
        send_status_webhook(repo_id, "IN_PROGRESS", "PARSING", total_files=total_files)

        all_chunks = []
        for f in files:
            file_chunks = chunk_code_file(f["path"], f["content"])
            all_chunks.extend(file_chunks)

        total_chunks = len(all_chunks)
        send_status_webhook(
            repo_id,
            "IN_PROGRESS",
            "INDEXING",
            total_files=total_files,
            total_chunks=total_chunks,
            processed_chunks=0,
        )

        def on_embedding_progress(processed: int, total: int):
            send_status_webhook(
                repo_id,
                "IN_PROGRESS",
                "INDEXING",
                total_files=total_files,
                total_chunks=total_chunks,
                processed_chunks=processed,
            )

        # Batch embed and upsert into Qdrant
        points: List[PointStruct] = []
        chunk_texts = [c.content for c in all_chunks]
        embeddings = get_embeddings_batch(chunk_texts, on_progress=on_embedding_progress)

        for chunk, embedding in zip(all_chunks, embeddings):
            points.append(
                PointStruct(
                    id=chunk.id,
                    vector=embedding,
                    payload={
                        "repo_id": repo_id,
                        "file_path": chunk.file_path,
                        "language": chunk.language,
                        "scope": chunk.scope,
                        "start_line": chunk.start_line,
                        "end_line": chunk.end_line,
                        "content": chunk.content,
                        "raw_content": chunk.raw_content,
                        "symbols": chunk.symbols,
                        "parent_context": chunk.parent_context,
                    },
                )
            )

        if points:
            # Wipe previous index points for this repo (e.g. from a prior branch)
            try:
                qdrant_client.delete(
                    collection_name=COLLECTION_NAME,
                    points_selector=Filter(
                        must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
                    ),
                )
            except Exception as e:
                print(f"Info: Point cleanup for {repo_id}: {e}")

            batch_size = 50
            for i in range(0, len(points), batch_size):
                qdrant_client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=points[i : i + batch_size],
                )

        print(f"Finished ingestion for {repo_id}: {total_files} files, {total_chunks} chunks.")
        send_status_webhook(
            repo_id,
            "READY",
            "READY",
            total_files=total_files,
            total_chunks=total_chunks,
            processed_chunks=total_chunks,
        )

    except Exception as e:
        print(f"Ingestion failed for {repo_id}: {e}")
        send_status_webhook(
            repo_id,
            "FAILED",
            "FAILED",
            error_message=str(e),
        )
    finally:
        ACTIVE_INGESTION_IDS.discard(repo_id)
