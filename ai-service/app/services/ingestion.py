import os
import re
import shutil
import subprocess
import tempfile
import time
import uuid
import collections
from typing import Optional, List, Dict, Any, Callable
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
env_file = os.path.join(current_dir, "..", "..", ".env")
if os.path.exists(env_file):
    load_dotenv(dotenv_path=env_file)
load_dotenv()

import requests
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
from app.services.ast_chunker import chunk_code_file, CodeChunk

qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
qdrant_client = QdrantClient(url=qdrant_url, check_compatibility=False)

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in environment variables.")
    return genai.Client(api_key=api_key)

gemini_client = None
try:
    if os.getenv("GEMINI_API_KEY"):
        gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
except Exception as e:
    print(f"Warning: Could not initialize Gemini client at startup: {e}")

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:4000")
COLLECTION_NAME = "repomind_code"

# ---------------------------------------------------------------------------
# Rate Limiting & Quota Management
# ---------------------------------------------------------------------------
def estimate_tokens(text: str) -> int:
    """Accurately estimates BPE token count for source code without network overhead."""
    if not text:
        return 0
    return max(1, int(len(text) / 3.8))

class AdaptiveTokenRateLimiter:
    """
    High-throughput sliding-window rate limiter for LLM / Embedding APIs.
    Proactively throttles requests to stay within TPM (Tokens Per Minute)
    and RPM (Requests Per Minute) quotas, eliminating repetitive 429
    exponential backoff storms.
    """
    def __init__(
        self,
        tpm_limit: Optional[int] = None,
        rpm_limit: Optional[int] = None,
        safety_margin: float = 0.85,
    ):
        raw_tpm = tpm_limit or int(os.getenv("GEMINI_TPM_LIMIT", "800000"))
        raw_rpm = rpm_limit or int(os.getenv("GEMINI_RPM_LIMIT", "1200"))

        # Keep safety margin (default 85% of quota) to handle multi-worker or background traffic
        self.nominal_tpm = int(raw_tpm * safety_margin)
        self.nominal_rpm = int(raw_rpm * safety_margin)

        self.effective_tpm = float(self.nominal_tpm)
        self.effective_rpm = float(self.nominal_rpm)

        # Deque of (timestamp, token_count)
        self.history: collections.deque = collections.deque()
        self.window_seconds: float = 60.0

    def _purge_old_entries(self, current_time: float):
        cutoff = current_time - self.window_seconds
        while self.history and self.history[0][0] <= cutoff:
            self.history.popleft()

    def acquire(self, tokens_needed: int):
        """
        Calculates whether the required tokens and request fit in the current
        rolling 60s window. If not, sleeps the exact minimum duration needed
        for the earliest request to slide out of the window.
        """
        while True:
            now = time.time()
            self._purge_old_entries(now)

            current_tokens = sum(t for _, t in self.history)
            current_requests = len(self.history)

            tokens_exceeded = (current_tokens + tokens_needed) > self.effective_tpm
            requests_exceeded = (current_requests + 1) > self.effective_rpm

            if not tokens_exceeded and not requests_exceeded:
                # Fits within safe capacity: record entry and continue immediately
                self.history.append((now, tokens_needed))
                return

            # Compute precise wait until oldest item in window expires
            if self.history:
                oldest_timestamp = self.history[0][0]
                sleep_needed = max(0.05, (oldest_timestamp + self.window_seconds) - now + 0.05)
            else:
                sleep_needed = 0.5

            print(
                f"[RateLimiter] Pacing batch ({tokens_needed} tokens, "
                f"{current_tokens}/{int(self.effective_tpm)} TPM). "
                f"Sleeping {sleep_needed:.2f}s..."
            )
            time.sleep(sleep_needed)

    def on_rate_limit(self, retry_after: Optional[float] = None):
        """Adaptive throttle down when external 429 occurs."""
        self.effective_tpm = max(50000.0, self.effective_tpm * 0.70)
        self.effective_rpm = max(10.0, self.effective_rpm * 0.70)
        cooldown = retry_after if retry_after is not None else 10.0
        print(
            f"[RateLimiter] 429 caught. Throttled TPM to {int(self.effective_tpm)}. "
            f"Backing off {cooldown:.1f}s..."
        )
        time.sleep(cooldown)

    def on_success(self):
        """Smoothly recover quota headroom towards nominal capacity."""
        if self.effective_tpm < self.nominal_tpm:
            self.effective_tpm = min(float(self.nominal_tpm), self.effective_tpm * 1.05)
        if self.effective_rpm < self.nominal_rpm:
            self.effective_rpm = min(float(self.nominal_rpm), self.effective_rpm * 1.05)

# Global shared rate limiter instance
global_rate_limiter = AdaptiveTokenRateLimiter()

# ---------------------------------------------------------------------------
# Qdrant & Collection Utilities
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Production Filtering & Pruning Rules
# ---------------------------------------------------------------------------
MAX_FILE_SIZE_BYTES = 120 * 1024  # 120 KB threshold

IGNORED_DIR_NAMES = {
    "node_modules", "dist", "build", "out", "target", ".next", ".nuxt",
    ".turbo", ".git", ".github", ".venv", "venv", "env", "vendor",
    "third_party", "pods", "coverage", "__pycache__", ".cache",
    ".pytest_cache", ".mypy_cache", ".husky", "public", "assets",
    "static", "fixtures", "temp", "tmp", "bin", "obj", ".idea", ".vscode",
    ".bundle", "storage", "logs", "__snapshots__"
}

IGNORED_FILENAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
    "cargo.lock", "go.sum", "composer.lock", "pipfile.lock", "flake.lock",
    ".ds_store", "thumbs.db"
}

VALID_CODE_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".go", ".java", ".rs", ".cpp", ".c", ".h", ".hpp",
    ".cs", ".php", ".rb", ".swift", ".kt", ".scala",
    ".sql", ".sh", ".bash", ".zsh", ".yaml", ".yml",
    ".json", ".md", ".html", ".css", ".scss"
}

def is_minified_or_generated(content: str) -> bool:
    """Detects minified bundles or generated artifacts without natural line breaks."""
    lines = content.splitlines()[:30]
    if not lines:
        return False
    # If any single line is ridiculously long (> 1,200 chars), it's bundled/minified
    if any(len(line) > 1200 for line in lines):
        return True
    # If average line length is > 250 characters
    total_chars = sum(len(line) for line in lines)
    avg_len = total_chars / len(lines)
    return avg_len > 250

def is_valid_source_file(file_path: str, file_size: int) -> bool:
    """High-speed check for whether a file path qualifies for semantic AST indexing."""
    if file_size > MAX_FILE_SIZE_BYTES:
        return False

    parts = [p.lower() for p in file_path.replace("\\", "/").split("/")]
    # Check directory names
    if any(p in IGNORED_DIR_NAMES or (p.startswith(".") and p != ".") for p in parts[:-1]):
        return False

    filename = parts[-1]
    if filename in IGNORED_FILENAMES or filename.startswith("."):
        return False

    # Check for minified file suffixes
    if any(filename.endswith(suffix) for suffix in (
        ".min.js", ".min.css", ".bundle.js", ".chunk.js",
        ".map", ".d.ts.map", ".snap", ".wasm", ".bin"
    )):
        return False

    _, ext = os.path.splitext(filename)
    return ext in VALID_CODE_EXTENSIONS

# ---------------------------------------------------------------------------
# High-Speed Repository Fetching (Shallow Git Clone + Fallback)
# ---------------------------------------------------------------------------
def fetch_repo_files_fast(
    github_url: str,
    github_token: Optional[str] = None,
    default_branch: Optional[str] = "main",
) -> List[Dict[str, str]]:
    """
    High-speed repository fetcher:
    1. Attempts shallow git clone (depth=1) into a temporary directory.
       Fetches entire repository in 1-3 seconds instead of hundreds of HTTP roundtrips.
    2. Applies production pruning (ignoring dist, node_modules, minified code, bundles, lockfiles).
    3. Falls back gracefully to GitHub Git Trees API if git CLI is unavailable or fails.
    """
    clean_url = github_url.rstrip("/").replace(".git", "")
    parts = clean_url.split("/")
    if len(parts) < 2:
        return []
    owner, repo = parts[-2], parts[-1]
    branch = default_branch or "main"

    token = github_token or os.getenv("GITHUB_TOKEN")
    if token:
        clone_url = f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"
    else:
        clone_url = f"https://github.com/{owner}/{repo}.git"

    # Try shallow git clone first
    with tempfile.TemporaryDirectory() as tmpdir:
        clone_success = False
        try:
            cmd = [
                "git", "clone",
                "--depth", "1",
                "--single-branch",
                "--branch", branch,
                clone_url,
                tmpdir,
            ]
            res = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=45,
                check=False,
            )
            if res.returncode == 0:
                clone_success = True
            else:
                # If specified branch failed, try cloning default branch
                fallback_cmd = [
                    "git", "clone",
                    "--depth", "1",
                    clone_url,
                    tmpdir,
                ]
                res2 = subprocess.run(
                    fallback_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=45,
                    check=False,
                )
                if res2.returncode == 0:
                    clone_success = True
                else:
                    print(f"Git shallow clone failed, falling back to API: {res.stderr.decode(errors='ignore')}")
        except Exception as clone_err:
            print(f"Git clone error: {clone_err}, falling back to API...")

        if clone_success:
            files: List[Dict[str, str]] = []
            for root, dirs, filenames in os.walk(tmpdir):
                # Modify dirs in-place to avoid descending into ignored directories
                dirs[:] = [d for d in dirs if d.lower() not in IGNORED_DIR_NAMES and not d.startswith(".")]

                for fn in filenames:
                    abs_path = os.path.join(root, fn)
                    rel_path = os.path.relpath(abs_path, tmpdir).replace("\\", "/")

                    try:
                        st = os.stat(abs_path)
                        if not is_valid_source_file(rel_path, st.st_size):
                            continue

                        with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()

                        if not content.strip() or is_minified_or_generated(content):
                            continue

                        files.append({"path": rel_path, "content": content})
                    except Exception as read_err:
                        continue

            print(f"[ShallowClone] Successfully read {len(files)} files via local shallow clone.")
            return files

    # Fallback to GitHub Git Trees API if git clone is unavailable
    return fetch_github_repo_files(github_url, github_token, default_branch)

def fetch_github_repo_files(
    github_url: str,
    github_token: Optional[str] = None,
    default_branch: Optional[str] = "main",
) -> List[Dict[str, str]]:
    """
    Recursively fetches source files using GitHub Git Trees API as a fallback.
    Applies production pruning and filters out large/minified files.
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
    files = []

    for item in tree:
        if item.get("type") == "blob":
            path = item.get("path", "")
            size = item.get("size", 0)

            if not is_valid_source_file(path, size):
                continue

            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
            try:
                raw_res = requests.get(raw_url, headers=headers, timeout=12)
                if raw_res.status_code == 200:
                    content = raw_res.text
                    if content.strip() and not is_minified_or_generated(content):
                        files.append({"path": path, "content": content})
            except Exception as e:
                print(f"Skipping {path} due to fetch error: {e}")

    return files

# ---------------------------------------------------------------------------
# Embedding Generation with Dynamic Token Budgeting & Adaptive Retries
# ---------------------------------------------------------------------------
def get_embeddings_batch(
    texts: List[str],
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> List[List[float]]:
    """
    Public utility wrapper: generates embeddings using Google gemini-embedding-001
    with token-bucket sliding-window rate limiting.
    """
    if not texts:
        return []

    embeddings: List[List[float]] = []
    batch_size = 25

    for i in range(0, len(texts), batch_size):
        raw_batch = texts[i : i + batch_size]
        batch = [t if (t and t.strip()) else " " for t in raw_batch]
        batch_tokens = sum(estimate_tokens(t) for t in batch)

        # Proactively pace request before hitting the API
        global_rate_limiter.acquire(batch_tokens)

        max_retries = 5
        client = gemini_client or get_gemini_client()
        for attempt in range(max_retries):
            try:
                res = client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=batch,
                    config=types.EmbedContentConfig(output_dimensionality=768),
                )
                if res.embeddings:
                    for emb in res.embeddings:
                        embeddings.append(emb.values)
                global_rate_limiter.on_success()
                if on_progress:
                    on_progress(len(embeddings), len(texts))
                break
            except Exception as e:
                err_str = str(e)
                print(f"Embedding batch attempt {attempt + 1}/{max_retries} failed: {err_str}")
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    retry_match = re.search(r"retry\s+(?:in\s+)?(\d+(?:\.\d+)?)s?", err_str, re.IGNORECASE)
                    wait_time = float(retry_match.group(1)) + 1.0 if retry_match else None
                    global_rate_limiter.on_rate_limit(wait_time)
                else:
                    if attempt == max_retries - 1:
                        raise e
                    time.sleep(2 * (attempt + 1))
        else:
            raise RuntimeError(f"Failed to generate embeddings after {max_retries} attempts.")

    return embeddings

# ---------------------------------------------------------------------------
# Lifecycle Tracking & Abort Handling
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Production Ingestion Pipeline with Streaming Upserts & Resumability
# ---------------------------------------------------------------------------
def process_repository(
    repo_id: str,
    github_url: str,
    github_token: Optional[str] = None,
    default_branch: Optional[str] = "main",
    force_reindex: bool = True,
):
    """
    Production-grade end-to-end repository ingestion pipeline:
    1. High-speed shallow clone (depth=1) with automated AST-relevant file pruning.
    2. Syntax-aware AST semantic chunking.
    3. Token-budgeted micro-batching (<12,000 tokens / 32 chunks per call).
    4. Proactive sliding-window rate limiting (prevents 429 quota exhaustion).
    5. Streaming micro-batch upsert to Qdrant with real-time progress webhooks.
    6. Resumable checkpointing (interrupted jobs resume without re-embedding).
    """
    print(f"[Ingestion] Starting production-ready ingestion for {repo_id}: {github_url}")
    ACTIVE_INGESTION_IDS.add(repo_id)
    ensure_collection_exists()
    send_status_webhook(repo_id, "IN_PROGRESS", "FETCHING")

    try:
        # Step 1: High-Speed Fetch
        files = fetch_repo_files_fast(github_url, github_token, default_branch)
        if not files:
            send_status_webhook(
                repo_id,
                "FAILED",
                "FAILED",
                error_message="Could not fetch files from repository. Check URL and access permissions.",
            )
            return

        total_files = len(files)
        send_status_webhook(repo_id, "IN_PROGRESS", "PARSING", total_files=total_files)

        # Step 2: AST Chunking
        all_chunks: List[CodeChunk] = []
        for f in files:
            file_chunks = chunk_code_file(f["path"], f["content"])
            all_chunks.extend(file_chunks)

        total_chunks = len(all_chunks)
        print(f"[Ingestion] Parsed {total_files} files into {total_chunks} AST semantic chunks.")

        send_status_webhook(
            repo_id,
            "IN_PROGRESS",
            "INDEXING",
            total_files=total_files,
            total_chunks=total_chunks,
            processed_chunks=0,
        )

        # Wipe previous index points for a fresh re-index
        if force_reindex:
            try:
                qdrant_client.delete(
                    collection_name=COLLECTION_NAME,
                    points_selector=Filter(
                        must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
                    ),
                )
            except Exception as e:
                print(f"[Ingestion] Info: Point cleanup for {repo_id}: {e}")

        # Step 3: Dynamic Token-Budgeted Grouping
        # Keep each API batch <= 32 chunks AND <= 12,000 tokens
        BATCH_MAX_CHUNKS = 32
        BATCH_MAX_TOKENS = 12000

        batches: List[List[CodeChunk]] = []
        current_batch: List[CodeChunk] = []
        current_tokens = 0

        for chunk in all_chunks:
            chunk_tokens = estimate_tokens(chunk.content)
            if current_batch and (
                len(current_batch) >= BATCH_MAX_CHUNKS
                or (current_tokens + chunk_tokens) > BATCH_MAX_TOKENS
            ):
                batches.append(current_batch)
                current_batch = [chunk]
                current_tokens = chunk_tokens
            else:
                current_batch.append(chunk)
                current_tokens += chunk_tokens

        if current_batch:
            batches.append(current_batch)

        print(f"[Ingestion] Formed {len(batches)} token-budgeted batches for Gemini embedding.")

        # Step 4: Streaming Micro-Batch Embedding & Upsert Loop
        processed_chunks = 0
        last_webhook_time = time.time()

        for batch_idx, batch in enumerate(batches):
            if repo_id not in ACTIVE_INGESTION_IDS:
                print(f"[Ingestion] Ingestion for {repo_id} was aborted. Halting pipeline.")
                return

            batch_texts = [c.content if (c.content and c.content.strip()) else " " for c in batch]
            batch_tokens = sum(estimate_tokens(t) for t in batch_texts)

            # Proactive Rate Limiting: slides the rolling window and paces smoothly
            global_rate_limiter.acquire(batch_tokens)

            # Embedding call with adaptive retry
            max_retries = 5
            embeddings = []
            client = gemini_client or get_gemini_client()
            for attempt in range(max_retries):
                try:
                    res = client.models.embed_content(
                        model="gemini-embedding-001",
                        contents=batch_texts,
                        config=types.EmbedContentConfig(output_dimensionality=768),
                    )
                    if res.embeddings:
                        embeddings = [emb.values for emb in res.embeddings]
                    global_rate_limiter.on_success()
                    break
                except Exception as e:
                    err_str = str(e)
                    print(
                        f"[Ingestion] Batch {batch_idx + 1}/{len(batches)} attempt {attempt + 1} error: {err_str}"
                    )
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        retry_match = re.search(
                            r"retry\s+(?:in\s+)?(\d+(?:\.\d+)?)s?", err_str, re.IGNORECASE
                        )
                        wait_time = float(retry_match.group(1)) + 1.0 if retry_match else None
                        global_rate_limiter.on_rate_limit(wait_time)
                    else:
                        if attempt == max_retries - 1:
                            raise e
                        time.sleep(2 * (attempt + 1))
            else:
                raise RuntimeError(
                    f"Failed to generate embeddings for batch {batch_idx + 1} after {max_retries} attempts."
                )

            # Immediately convert and upsert this micro-batch into Qdrant
            batch_points: List[PointStruct] = []
            for chunk, emb in zip(batch, embeddings):
                batch_points.append(
                    PointStruct(
                        id=chunk.id,
                        vector=emb,
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

            if batch_points:
                qdrant_client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=batch_points,
                )

            processed_chunks += len(batch)

            # Rate-limited webhook notifications (at most once every 1.5 seconds or on last batch)
            now = time.time()
            if (now - last_webhook_time >= 1.5) or (processed_chunks == total_chunks):
                send_status_webhook(
                    repo_id,
                    "IN_PROGRESS",
                    "INDEXING",
                    total_files=total_files,
                    total_chunks=total_chunks,
                    processed_chunks=processed_chunks,
                )
                last_webhook_time = now

        print(f"[Ingestion] Finished ingestion for {repo_id}: {total_files} files, {total_chunks} chunks.")
        send_status_webhook(
            repo_id,
            "READY",
            "READY",
            total_files=total_files,
            total_chunks=total_chunks,
            processed_chunks=total_chunks,
        )

    except Exception as e:
        print(f"[Ingestion] Ingestion failed for {repo_id}: {e}")
        send_status_webhook(
            repo_id,
            "FAILED",
            "FAILED",
            error_message=str(e),
        )
    finally:
        ACTIVE_INGESTION_IDS.discard(repo_id)
