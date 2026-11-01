import os
import json
import re
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from google import genai
from app.services.route_extractor import extract_routes_from_code

qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
qdrant_client = QdrantClient(url=qdrant_url, check_compatibility=False)
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
COLLECTION_NAME = "repomind_code"

def get_repo_chunks_sample(repo_id: str, limit: int = 400) -> List[Dict[str, Any]]:
    """Retrieves representative code snippets from Qdrant for a repository, prioritizing core files."""
    try:
        results = qdrant_client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(
                must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
            ),
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )
        points = results[0]
        all_payloads = [p.payload for p in points if p.payload]

        setup_keys = ["readme", "package.json", "docker", "env", "requirement", "go.mod", "cargo.toml"]
        entry_keys = ["main.ts", "main.py", "app.module.ts", "app.py", "server.ts", "page.tsx", "layout.tsx"]
        core_keys = ["resolver", "controller", "service", "router", "schema", "model"]

        setup_chunks = []
        entry_chunks = []
        core_chunks = []
        other_chunks = []

        for p in all_payloads:
            fpath = p.get("file_path", "").lower()
            if any(k in fpath for k in setup_keys):
                setup_chunks.append(p)
            elif any(k in fpath for k in entry_keys):
                entry_chunks.append(p)
            elif any(k in fpath for k in core_keys):
                core_chunks.append(p)
            else:
                other_chunks.append(p)

        return setup_chunks + entry_chunks + core_chunks[:35] + other_chunks[:20]
    except Exception as e:
        print(f"Error fetching Qdrant chunks for {repo_id}: {e}")
        return []

def get_repo_api_chunks(repo_id: str, limit: int = 1500) -> List[Dict[str, Any]]:
    """Retrieves chunks prioritizing API controllers, GraphQL resolvers, and route definitions across all pages."""
    try:
        all_payloads = []
        next_offset = None
        while len(all_payloads) < limit:
            results = qdrant_client.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=Filter(
                    must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
                ),
                limit=min(250, limit - len(all_payloads)),
                offset=next_offset,
                with_payload=True,
                with_vectors=False,
            )
            points, next_offset = results
            for p in points:
                if p.payload:
                    all_payloads.append(p.payload)
            if not next_offset or not points:
                break

        api_keywords = ["resolver", "controller", "router", "route", "api", "endpoint", "handler", "websocket", "config", "resource"]

        backend_chunks = []
        other_chunks = []
        for p in all_payloads:
            fpath = p.get("file_path", "").lower()
            if any(test_kw in fpath for test_kw in [".spec.", ".test.", "_test.", "tests/"]):
                continue
            if any(kw in fpath for kw in api_keywords):
                backend_chunks.append(p)
            else:
                other_chunks.append(p)

        return backend_chunks + other_chunks[:100]
    except Exception as e:
        print(f"Error fetching API chunks for {repo_id}: {e}")
        return []

def sanitize_mermaid(chart: str) -> str:
    """Sanitizes generated Mermaid diagram to prevent syntax parse errors."""
    if not chart:
        return "graph TD\n    Client[Client Application] --> API[Backend API]\n    API --> DB[(Database)]"

    lines = []
    for raw_line in chart.strip().splitlines():
        line = raw_line.strip()
        # Remove any surrounding markdown backticks
        if line.startswith("```"):
            continue

        # Convert trailing sequence-style colon to pipe edge label: A --> B : label -> A -->|label| B
        colon_edge = re.match(r"^([^-\n]+(?:-->|--\>|-\.->|==>|--o)\s*[^:\n]+?)\s*:\s*([^:\n]+)$", line)
        if colon_edge:
            left_part = colon_edge.group(1).strip()
            label = colon_edge.group(2).strip()
            arrow_match = re.search(r"(-->|--\>|-\.->|==>|--o)\s*(.+)$", left_part)
            if arrow_match:
                arrow = arrow_match.group(1)
                target = arrow_match.group(2).strip()
                source = left_part[:arrow_match.start()].strip()
                line = f"{source} {arrow}|{label}| {target}"

        # Convert "-- label -->" to "-->|label|"
        dash_edge = re.match(r"^([^-\n]+)\s*--\s*([^-\n]+?)\s*-->\s*(.+)$", line)
        if dash_edge:
            source = dash_edge.group(1).strip()
            label = dash_edge.group(2).strip()
            target = dash_edge.group(3).strip()
            line = f"{source} -->|{label}| {target}"

        # Normalize connector --o to --> for compatibility across all mermaid flowchart renderers
        line = re.sub(r"\s+--o\|", " -->|", line)
        line = re.sub(r"\s+--o\s+", " --> ", line)

        # Quote unquoted pipe edge labels: |WebSocket (STOMP)| -> |"WebSocket (STOMP)"|
        def quote_pipe_label(m):
            label_text = m.group(1).strip()
            if label_text.startswith('"') and label_text.endswith('"'):
                return f'|{label_text}|'
            clean_label = label_text.replace('"', "'")
            return f'|"{clean_label}"|'

        line = re.sub(r'\|([^|\n]+)\|', quote_pipe_label, line)

        # Auto-quote unquoted node labels:
        # e.g. [Frontend UI (Next.js/React)] -> ["Frontend UI (Next.js/React)"]
        line = re.sub(r'(?<![\(\[])\[([^\(\[\"\]\n]*[\(\)\/:\,\.][^\)\]\"\n]*)\](?![\)\]])', r'["\1"]', line)

        # Fix subgraph spaces: subgraph Backend Services -> subgraph Backend_Services["Backend Services"]
        subgraph_match = re.match(r"^subgraph\s+([A-Za-z0-9_]+)\s+([A-Za-z0-9_\s]+)$", line)
        if subgraph_match and "[" not in line and '"' not in line:
            full_title = f"{subgraph_match.group(1)} {subgraph_match.group(2)}".strip()
            safe_id = re.sub(r"[^A-Za-z0-9_]", "_", full_title)
            line = f"subgraph {safe_id}[\"{full_title}\"]"

        lines.append(f"    {line}" if not line.startswith("graph") and not line.startswith("flowchart") and not line.startswith("subgraph") and not line.startswith("end") else line)

    result = "\n".join(lines).strip()
    if not result.startswith("graph") and not result.startswith("flowchart"):
        result = f"graph TD\n{result}"
    return result

def generate_architecture_insights(repo_id: str, branch: Optional[str] = "main") -> Dict[str, Any]:
    """Generates structured architecture summary and Mermaid.js diagram."""
    chunks = get_repo_chunks_sample(repo_id, limit=400)
    if not chunks:
        return {
            "overview": "No repository files found. Ingestion may still be pending.",
            "systemType": "Unknown",
            "frameworks": [],
            "techStack": [],
            "mermaidDiagram": "graph TD\n    A[Codebase] --> B[No Chunks Found]",
            "modules": [],
            "keyWorkflows": [],
        }

    # Group sample files by path
    files_summary = []
    seen_files = set()
    for c in chunks:
        fpath = c.get("file_path", "")
        if fpath and fpath not in seen_files:
            seen_files.add(fpath)
            content_preview = c.get("raw_content", "")[:250].replace("\n", " ")
            files_summary.append(f"- {fpath} (Scope: {c.get('scope', 'Module')}): {content_preview}")

    summary_text = "\n".join(files_summary[:45])

    prompt = f"""You are a Principal Software Architect.
Analyze the following codebase file list and representative snippets to generate an architecture summary.

Repository Files & Code Context:
{summary_text}

Output a strictly valid JSON object with the following schema:
{{
  "overview": "Clear 2-3 sentence summary of what this application does, its core business domain, and architecture style.",
  "systemType": "e.g. Monorepo / Microservices / Fullstack Application / REST API",
  "frameworks": ["List of core frameworks used, e.g. NestJS, FastAPI, Next.js, React, Spring Boot"],
  "techStack": ["List of key technologies, databases, and tools, e.g. PostgreSQL, Qdrant, Docker, Redis, STOMP"],
  "mermaidDiagram": "A valid Mermaid.js graph TD diagram representing system components, databases, and data flow. Use valid mermaid syntax, no markdown formatting inside the string, e.g. graph TD\\n    Client[Client UI] --> Gateway[API Gateway]\\n    Gateway --> DB[(PostgreSQL)]",
  "modules": [
    {{
      "name": "Module or Service Name",
      "type": "Frontend / Backend / AI / Database / Shared",
      "description": "What this module is responsible for",
      "files": ["key file paths in this module"]
    }}
  ],
  "keyWorkflows": [
    {{
      "title": "Workflow Name (e.g. Authentication, Ingestion, or Order Processing)",
      "steps": ["Step 1 explanation", "Step 2 explanation", "Step 3 explanation"]
    }}
  ]
}}

CRITICAL MERMAID SYNTAX RULES:
1. Wrap any node label containing parentheses, slashes, or special characters in double quotes:
   CORRECT: Frontend["Frontend UI (Next.js/React)"]
   INCORRECT: Frontend[Frontend UI (Next.js/React)]
2. Wrap ANY edge label containing parentheses, brackets, slashes, or special characters in double quotes:
   CORRECT: Client -->|"WebSocket (STOMP)"| VehicleService
   CORRECT: Client -->|REST API| Gateway
   INCORRECT: Client --o|WebSocket (STOMP)| VehicleService
   INCORRECT: Client --> Gateway : REST API
3. Always use standard directed flowchart arrows: -->, -.->, or ==> (do not use --o).
4. Subgraph titles with spaces must have an alphanumeric ID:
   CORRECT: subgraph Backend_Services["Backend Services"]
   INCORRECT: subgraph Backend Services
5. Node IDs must consist only of alphanumeric characters and underscores (e.g. Client_UI, VehicleService, DB_Postgres).

Ensure the JSON is strictly valid, and return ONLY the JSON object."""

    try:
        res = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        text = res.text.strip()
        if "{" in text and "}" in text:
            start = text.index("{")
            end = text.rindex("}") + 1
            data = json.loads(text[start:end])
            raw_diag = data.get("mermaidDiagram", "")
            data["mermaidDiagram"] = sanitize_mermaid(raw_diag)
            return data
    except Exception as e:
        print(f"Error generating architecture insights: {e}")

    return {
        "overview": "Multi-tier application providing backend API services, storage, and web client interfaces.",
        "systemType": "Fullstack Application",
        "frameworks": ["NestJS", "FastAPI", "Next.js"],
        "techStack": ["PostgreSQL", "Qdrant", "Docker"],
        "mermaidDiagram": "graph TD\n    Frontend[Web Frontend] --> Gateway[API Gateway]\n    Gateway --> Service[AI Service]\n    Gateway --> DB[(PostgreSQL)]\n    Service --> Vector[(Qdrant Vector DB)]",
        "modules": [
            {"name": "API Gateway", "type": "Backend", "description": "Routing and business orchestration", "files": ["api/src/main.ts"]},
            {"name": "Web Frontend", "type": "Frontend", "description": "Interactive user interface", "files": ["web/src/app/page.tsx"]},
        ],
        "keyWorkflows": [
            {"title": "Request Flow", "steps": ["User sends request", "API routes to service", "Response streamed to client"]}
        ],
    }

def generate_api_docs(repo_id: str, branch: Optional[str] = "main") -> List[Dict[str, Any]]:
    """Detects API routes (REST, GraphQL, and WebSocket) and generates enriched endpoint documentation."""
    chunks = get_repo_api_chunks(repo_id, limit=1500)
    detected_endpoints: List[Dict[str, Any]] = []

    # Group chunks by file_path and reconstruct full file contents in line order
    from collections import defaultdict
    files_chunks: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for c in chunks:
        fpath = c.get("file_path", "")
        if fpath:
            files_chunks[fpath].append(c)

    seen_signatures = set()

    for fpath, fchunks in files_chunks.items():
        fchunks.sort(key=lambda x: x.get("start_line", 0))
        assembled_content = "\n".join(c.get("raw_content", "") for c in fchunks)
        lang = fchunks[0].get("language", "ts")
        routes = extract_routes_from_code(fpath, assembled_content, language=lang)
        for r in routes:
            sig = f"{r['method']} {r['path']}"
            if sig not in seen_signatures:
                seen_signatures.add(sig)
                detected_endpoints.append(r)

    # Fallback to LLM if pattern extraction found 0 endpoints
    if not detected_endpoints and files_chunks:
        backend_samples = []
        for fpath, fchunks in list(files_chunks.items())[:8]:
            fchunks.sort(key=lambda x: x.get("start_line", 0))
            raw = "\n".join(c.get("raw_content", "") for c in fchunks)[:3000]
            backend_samples.append(f"--- File: {fpath} ---\n{raw}")

        fallback_prompt = f"""Analyze the following code files from a software project and extract any exposed API endpoints (REST routes, GraphQL queries/mutations, or RPC/WebSocket procedures):

{chr(10).join(backend_samples)}

Respond ONLY with a JSON array of objects with the schema:
[
  {{
    "method": "GET" | "POST" | "PUT" | "DELETE" | "QUERY" | "MUTATION" | "SUBSCRIPTION" | "WS",
    "path": string (e.g. "/api/v1/users" or "/graphql (query: userProfile)" or "/ws"),
    "summary": string,
    "description": string,
    "handler": string,
    "authRequired": boolean,
    "authType": "Bearer JWT" | "Public",
    "filePath": string,
    "startLine": 1,
    "endLine": 20
  }}
]"""
        try:
            res = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=fallback_prompt,
            )
            text = res.text.strip()
            if "[" in text and "]" in text:
                start = text.index("[")
                end = text.rindex("]") + 1
                parsed = json.loads(text[start:end])
                if isinstance(parsed, list):
                    detected_endpoints = parsed
        except Exception as fallback_err:
            print(f"Fallback endpoint extraction error: {fallback_err}")

    if not detected_endpoints:
        return []

    # Sort endpoints by file and path
    detected_endpoints.sort(key=lambda e: (e.get("filePath", ""), e.get("path", "")))

    # Enrich detected endpoints using Gemini (up to 75 endpoints)
    endpoints_to_enrich = detected_endpoints[:75]
    endpoints_summary = json.dumps([
        {
            "method": e["method"],
            "path": e["path"],
            "handler": e.get("handler", "handler"),
            "filePath": e["filePath"],
            "authRequired": e.get("authRequired", False),
            "parameters": e.get("parameters", []),
        }
        for e in endpoints_to_enrich
    ], indent=2)

    prompt = f"""You are an API technical documentation writer.
Enrich the following list of detected HTTP, WebSocket, and GraphQL endpoints extracted from code files:

Detected Endpoints:
{endpoints_summary}

For each endpoint, provide:
- summary: A concise 1-sentence description of what this endpoint or operation does
- description: Detailed explanation of the operation, its purpose, and business context
- authRequired: boolean
- authType: "Bearer JWT" or "Public" or "API Key"
- parameters: array of {{ "name": "...", "in": "path"|"query"|"body"|"graphql_arg", "type": "string"|"number"|"object"|"boolean", "required": true|false, "description": "..." }}
- requestBodySchema: brief JSON schema or example if it accepts input arguments or body, or null
- responseSchema: brief JSON schema or example return payload, or null

Respond ONLY with a JSON array of objects matching the original endpoints in order."""

    try:
        res = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        text = res.text.strip()
        if "[" in text and "]" in text:
            start = text.index("[")
            end = text.rindex("]") + 1
            enriched = json.loads(text[start:end])
            if isinstance(enriched, list) and len(enriched) > 0:
                merged = []
                for i, orig in enumerate(detected_endpoints):
                    enr = enriched[i] if i < len(enriched) else {}
                    merged.append({
                        "method": orig["method"],
                        "path": orig["path"],
                        "summary": enr.get("summary", orig.get("summary", f"{orig['method']} {orig['path']}")),
                        "description": enr.get("description", orig.get("description", "")),
                        "authRequired": enr.get("authRequired", orig.get("authRequired", False)),
                        "authType": enr.get("authType", orig.get("authType", "Bearer JWT")),
                        "parameters": enr.get("parameters", orig.get("parameters", [])),
                        "requestBodySchema": enr.get("requestBodySchema", None),
                        "responseSchema": enr.get("responseSchema", None),
                        "filePath": orig["filePath"],
                        "startLine": orig.get("startLine", 1),
                        "endLine": orig.get("endLine", 1),
                    })
                return merged
    except Exception as e:
        print(f"Error enriching API docs: {e}")

    return detected_endpoints

def generate_onboarding_guide(repo_id: str, branch: Optional[str] = "main") -> str:
    """Generates an authentic developer onboarding handbook and setup guide using repository manifests."""
    chunks = get_repo_chunks_sample(repo_id, limit=400)
    files_overview = []
    seen_files = set()

    setup_keys = ["readme", "package.json", "docker", "env", "requirement", "go.mod", "cargo.toml", "main.ts", "app.module.ts", "main.py"]

    for c in chunks:
        fpath = c.get("file_path", "")
        fpath_lower = fpath.lower()
        if any(key in fpath_lower for key in setup_keys):
            content = c.get("raw_content", "")[:1200]
            files_overview.append(f"--- File: {fpath} ---\n{content}")
            seen_files.add(fpath)

    # If few setup files found, include top code entrypoints
    if len(files_overview) < 5:
        for c in chunks:
            fpath = c.get("file_path", "")
            if fpath not in seen_files:
                content = c.get("raw_content", "")[:600]
                files_overview.append(f"--- File: {fpath} ---\n{content}")
                seen_files.add(fpath)
            if len(files_overview) >= 15:
                break

    context = "\n\n".join(files_overview[:20])

    prompt = f"""You are a Staff Software Engineer creating an authentic, comprehensive Developer Onboarding Handbook for a new engineer joining this specific repository.
Base your instructions strictly on the actual project code, package scripts, Docker configurations, and READMEs provided below.

Repository Code & Manifests:
{context}

Generate a comprehensive, GitHub-style Markdown onboarding guide covering:
# 🚀 Developer Onboarding & Quickstart Guide

## 1. Project Overview & Architecture
State the exact purpose of the system, backend frameworks (e.g., NestJS, GraphQL, Mongoose, Fastify, Django), frontend frameworks (e.g., Next.js, React, Mantine), and background queues or vector databases used.

## 2. Prerequisites & Dependencies
List the exact runtimes and services needed (e.g. Node version, Docker containers for Redis, MongoDB, ChromaDB, Python versions).

## 3. Local Setup & Installation
Provide exact copy-pasteable terminal commands to clone, install dependencies for each service (backend/frontend), and start backing services (Docker). Use bash code blocks:
```bash
# Setup commands
```

## 4. Environment Variables Configuration
A clear markdown table with Environment Variable, Description, Default Value, and Required (Yes/No), based on what is used in the configuration files.

## 5. Running & Developing
List the actual npm/yarn/pip scripts found in the package manifests for:
- Starting development mode (e.g., `npm run start:dev`, `npm run dev`)
- Running tests (e.g., `npm run test`)
- Code generation or linting (e.g., `npm run codegen`, `npm run lint`)

## 6. Key Code Entrypoints
Table of the top critical files for a new engineer to explore first (entrypoints, routers, resolvers, app modules).

Format with GitHub alerts (> [!TIP], > [!IMPORTANT]), clean markdown tables, and code blocks."""

    try:
        res = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return res.text.strip()
    except Exception as e:
        print(f"Error generating onboarding guide: {e}")
        return f"""# 🚀 Developer Onboarding Guide

## 1. Project Overview
This repository contains application services indexed by RepoMind AI.

## 2. Prerequisites
- Docker & Docker Compose
- Node.js (v18+)

## 3. Local Setup
```bash
# Start background database services
docker compose up -d

# Install dependencies and start development servers
npm install
npm run dev
```

## 4. Environment Variables
Check `.env.example` in each service directory for configuration values.
"""
