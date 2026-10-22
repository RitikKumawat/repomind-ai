
# RepoMind AI — PRD & System Design

## Product Overview
RepoMind AI is an AI-powered repository intelligence platform that analyzes GitHub repositories and automatically generates architecture insights, API documentation, onboarding guides, and conversational codebase exploration using RAG and agent workflows.

---

# Core Features

## 1. GitHub Repository Import
- Clone public repositories
- Parse supported files
- Extract metadata
- Generate embeddings

## 2. AI Codebase Chat
Example questions:
- How does authentication work?
- Explain API flow
- Where is JWT validation implemented?

## 3. API Documentation Generator
Automatically detects:
- Express routes
- NestJS controllers
- SpringBoot controllers

Generates:
- endpoint summaries
- request/response payloads
- auth requirements

## 4. Architecture Summary
AI-generated:
- service explanation
- project structure
- module interactions
- dependency overview

## 5. Developer Onboarding Guide
Generates:
- setup instructions
- important modules
- request lifecycle
- environment variable overview

---

# System Architecture

Frontend:
- Next.js
- TailwindCSS
- shadcn/ui

Backend:
- NestJS API Gateway
- Python FastAPI AI Service

AI Stack:
- LangChain
- LangGraph
- RAG
- Embeddings
- Vector Search

Databases:
- PostgreSQL
- Qdrant
- Redis

Infrastructure:
- Docker
- Vercel
- Railway
- Render

---

# High-Level Architecture

```text
                    ┌──────────────────┐
                    │   Next.js UI     │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ NestJS API Layer │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
 ┌──────▼──────┐     ┌──────▼───────┐    ┌──────▼──────┐
 │ Repo Service│     │ Chat Service │    │ Auth Service│
 │ NestJS      │     │ Python AI    │    │ NestJS      │
 └─────────────┘     └──────┬───────┘    └─────────────┘
                             │
                    ┌────────▼─────────┐
                    │ LangGraph Agents │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
 ┌──────▼──────┐    ┌────────▼────────┐   ┌──────▼──────┐
 │ PostgreSQL  │    │ Qdrant VectorDB │   │ Redis Cache │
 └─────────────┘    └─────────────────┘   └─────────────┘
```

---

# RAG Pipeline

```text
User Query
    ↓
Embedding Generation
    ↓
Vector Similarity Search
    ↓
Top-K Chunks Retrieved
    ↓
Context Compression
    ↓
LLM Prompt
    ↓
AI Response
```

---

# LangGraph Workflow

```text
User Query
   ↓
Intent Detection
   ↓
 ┌─────────────┬──────────────┬─────────────┐
 ▼             ▼              ▼
API Agent   Architecture   Code Agent
            Agent
```

---

# Database Design

## users
- id
- email
- created_at

## repositories
- id
- user_id
- github_url
- repo_name
- status

## repository_files
- id
- repo_id
- file_path
- language
- chunk_count

## chats
- id
- repo_id
- user_query
- ai_response

---

# Chunking Strategy

- Chunk by function/class boundaries
- Fallback to token-based chunking
- Chunk overlap: 100 tokens
- Chunk size: 800–1200 tokens

---

# Deployment Stack

Frontend:
- Vercel

Backend:
- Render
- Railway

Databases:
- Neon PostgreSQL
- Upstash Redis
- Qdrant Cloud

---

# Weekly Roadmap

## Week 1
- Monorepo setup
- Next.js setup
- NestJS setup
- FastAPI setup

## Week 2
- GitHub repo cloning
- File parsing
- Metadata extraction

## Week 3
- Embeddings pipeline
- Qdrant integration
- Chunking strategy

## Week 4
- AI chat
- Retrieval pipeline
- Streaming responses

## Week 5
- API documentation generator
- Route parser
- Markdown generation

## Week 6
- LangGraph workflows
- Deployment
- Final polish

---

# Resume Highlights

- Built AI-powered repository intelligence platform
- Implemented RAG-based semantic code search
- Generated automated API documentation
- Designed scalable ingestion pipeline
- Integrated LangChain and LangGraph
- Used vector embeddings with Qdrant
