import os
import json
from typing import TypedDict, List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
from langgraph.graph import StateGraph, END
from google import genai
from app.services.hybrid_search import (
    hybrid_search_and_rerank,
    lookup_symbol_exact,
)

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class AgentState(TypedDict, total=False):
    repo_id: str
    query: str
    conversation_history: Optional[List[Dict[str, str]]]
    decomposed_queries: List[str]
    retrieved_chunks: List[Dict[str, Any]]
    is_sufficient: bool
    iteration_count: int
    missing_context_reason: Optional[str]
    final_response: str
    citations: List[Dict[str, Any]]

def analyze_and_decompose_node(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes user intent and generates HyDE queries or decomposed sub-queries,
    incorporating prior conversation context for multi-turn coherence.
    """
    query = state["query"]
    history = state.get("conversation_history") or []
    history_context = ""
    if history:
        recent = history[-4:]
        history_context = "Recent conversation context:\n" + "\n".join(
            [f"{h.get('role', 'user').capitalize()}: {h.get('content', '')}" for h in recent]
        ) + "\n\n"

    prompt = f"""You are a senior codebase intelligence agent analyzing a developer query.
{history_context}Current Developer Query: "{query}"

Analyze this query in light of any previous conversation context and output a JSON array of 1 to 2 targeted search queries.
- Include the core semantic concept.
- If the user asks about an implementation, flow, or refers to previous items (e.g. "what does line 15 do", "explain that function", "how to test it"), resolve references into concrete code keywords/identifiers.

Respond ONLY with a JSON array of strings, e.g. ["authentication jwt validate token", "user entity password hash"]."""

    try:
        res = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        text = res.text.strip()
        # Parse JSON array
        if "[" in text and "]" in text:
            start = text.index("[")
            end = text.rindex("]") + 1
            queries = json.loads(text[start:end])
            if isinstance(queries, list) and queries:
                return {"decomposed_queries": [query] + queries[:2]}
    except Exception as e:
        print(f"Query decomposition error: {e}")

    return {"decomposed_queries": [query]}

def retrieve_and_rerank_node(state: AgentState) -> Dict[str, Any]:
    """
    Executes hybrid dense + BM25 search and cross-encoder reranking across all search queries.
    """
    repo_id = state["repo_id"]
    queries = state.get("decomposed_queries") or [state["query"]]
    existing_chunks = {c["id"]: c for c in state.get("retrieved_chunks", [])}

    for q in queries:
        hits = hybrid_search_and_rerank(repo_id, q, top_candidates=20, rerank_limit=6)
        for hit in hits:
            existing_chunks[hit["id"]] = hit

    all_chunks = list(existing_chunks.values())
    # Sort by rerank score / hybrid score
    all_chunks.sort(key=lambda x: x.get("rerank_score", x.get("hybrid_score", 0)), reverse=True)

    return {
        "retrieved_chunks": all_chunks[:8],
        "iteration_count": state.get("iteration_count", 0) + 1,
    }

def crag_evaluator_node(state: AgentState) -> Dict[str, Any]:
    """
    Corrective RAG (CRAG) node: Evaluates whether retrieved code is sufficient to answer the query.
    If incomplete, detects missing symbol/file to perform a second hop.
    """
    chunks = state.get("retrieved_chunks", [])
    query = state["query"]
    iteration = state.get("iteration_count", 1)

    if not chunks:
        return {"is_sufficient": False, "missing_context_reason": "No code chunks found in vector index"}

    # If we already did a reflection hop, conclude
    if iteration >= 2:
        return {"is_sufficient": True}

    snippets_summary = "\n".join([
        f"- File: {c['file_path']} (Scope: {c['scope']}), Symbols: {', '.join(c.get('symbols', []))}"
        for c in chunks[:5]
    ])

    eval_prompt = f"""You are a code evaluator in a Corrective RAG pipeline.
Developer Query: "{query}"

Retrieved Context Summary:
{snippets_summary}

Determine if this context is sufficient to accurately answer the developer's question.
If yes, reply with JSON: {{"sufficient": true}}
If no (e.g., missing critical definition, service, or imported class), reply with JSON: {{"sufficient": false, "missing_symbol": "<exact symbol name to lookup>"}}"""

    try:
        res = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=eval_prompt,
        )
        text = res.text.strip()
        if "{" in text and "}" in text:
            start = text.index("{")
            end = text.rindex("}") + 1
            data = json.loads(text[start:end])
            is_suff = data.get("sufficient", True)
            if not is_suff and data.get("missing_symbol"):
                missing = data["missing_symbol"]
                # Perform immediate symbol lookup
                symbol_hits = lookup_symbol_exact(state["repo_id"], missing)
                if symbol_hits:
                    updated_chunks = chunks + symbol_hits
                    return {"retrieved_chunks": updated_chunks[:10], "is_sufficient": True}
                return {"is_sufficient": False, "decomposed_queries": [f"{missing} definition"]}
            return {"is_sufficient": is_suff}
    except Exception as e:
        print(f"CRAG evaluation error: {e}")

    return {"is_sufficient": True}

def should_continue_retrieval(state: AgentState) -> str:
    """Conditional edge routing."""
    if not state.get("is_sufficient", True) and state.get("iteration_count", 0) < 2:
        return "retrieve"
    return "synthesize"

def build_synthesis_prompt(
    query: str,
    chunks: List[Dict[str, Any]],
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    context_blocks = []
    for c in chunks:
        file_path = c.get("file_path", "unknown")
        start_l = c.get("start_line", 1)
        end_l = c.get("end_line", 1)
        scope = c.get("scope", "Module")
        raw_code = c.get("raw_content", c.get("text", ""))

        context_blocks.append(
            f"=== [File: {file_path}] [Lines: {start_l}-{end_l}] [Scope: {scope}] ===\n{raw_code}\n"
        )

    context_str = "\n".join(context_blocks)

    history_str = ""
    if conversation_history:
        recent = conversation_history[-6:]
        history_str = "Prior Conversation History:\n" + "\n".join(
            [f"{h.get('role', 'user').capitalize()}: {h.get('content', '')}" for h in recent]
        ) + "\n\n"

    return f"""You are RepoMind AI, an expert software architecture and codebase intelligence assistant.
Answer the developer's question using ONLY the provided repository context.
Explain clearly with code citations in the format `file_path:L<start>-L<end>`.

{history_str}Repository Context:
{context_str}

Developer Question:
{query}

Format your response in professional GitHub-style Markdown:
1. Direct, concise answer.
2. Step-by-step architectural / lifecycle explanation with code snippets.
3. Citations of all relevant files and line ranges.
If the information is not present in the context, accurately state that it is not covered in the provided codebase context."""

def synthesize_response_node(state: AgentState) -> Dict[str, Any]:
    """
    Grounded code synthesis with line and file citations.
    """
    chunks = state.get("retrieved_chunks", [])
    query = state["query"]
    history = state.get("conversation_history")

    if not chunks:
        return {
            "final_response": "I could not find any relevant code in this repository to answer your question. Make sure the repository ingestion has completed.",
            "citations": [],
        }

    citations = [
        {
            "filePath": c.get("file_path", "unknown"),
            "startLine": c.get("start_line", 1),
            "endLine": c.get("end_line", 1),
            "scope": c.get("scope", "Module"),
        }
        for c in chunks
    ]

    synthesis_prompt = build_synthesis_prompt(query, chunks, history)

    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=synthesis_prompt,
    )

    return {
        "final_response": response.text,
        "citations": citations,
    }

# Build LangGraph State Machine
workflow = StateGraph(AgentState)
workflow.add_node("analyze", analyze_and_decompose_node)
workflow.add_node("retrieve", retrieve_and_rerank_node)
workflow.add_node("crag_evaluate", crag_evaluator_node)
workflow.add_node("synthesize", synthesize_response_node)

workflow.set_entry_point("analyze")
workflow.add_edge("analyze", "retrieve")
workflow.add_edge("retrieve", "crag_evaluate")
workflow.add_conditional_edges(
    "crag_evaluate",
    should_continue_retrieval,
    {
        "retrieve": "retrieve",
        "synthesize": "synthesize",
    },
)
workflow.add_edge("synthesize", END)

# Compile graph
agentic_rag_app = workflow.compile()

def run_agentic_rag(
    repo_id: str,
    message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Entry point for executing the non-streaming Agentic RAG pipeline."""
    initial_state: AgentState = {
        "repo_id": repo_id,
        "query": message,
        "conversation_history": conversation_history or [],
        "decomposed_queries": [],
        "retrieved_chunks": [],
        "is_sufficient": False,
        "iteration_count": 0,
        "missing_context_reason": None,
        "final_response": "",
        "citations": [],
    }

    final_state = agentic_rag_app.invoke(initial_state)
    return {
        "response": final_state.get("final_response", ""),
        "citations": final_state.get("citations", []),
    }

def stream_agentic_rag(
    repo_id: str,
    message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
):
    """
    Generator streaming Server-Sent Events (SSE) representing agent reasoning trace,
    citations, and token-by-token response.
    """
    try:
        # Step 1: Query analysis & HyDE decomposition
        yield f"event: status\ndata: {json.dumps({'step': 'analyzing', 'message': 'Analyzing query intent & generating HyDE search vectors...'})}\n\n"
        state: AgentState = {
            "repo_id": repo_id,
            "query": message,
            "conversation_history": conversation_history or [],
            "decomposed_queries": [],
            "retrieved_chunks": [],
            "is_sufficient": False,
            "iteration_count": 0,
            "missing_context_reason": None,
            "final_response": "",
            "citations": [],
        }

        decompose_res = analyze_and_decompose_node(state)
        state.update(decompose_res)

        # Step 2: Hybrid Retrieval (Dense 768-dim + BM25)
        yield f"event: status\ndata: {json.dumps({'step': 'retrieving', 'message': 'Hybrid Dense (gemini-embedding-001) + Sparse BM25 retrieval across code chunks...'})}\n\n"
        retrieve_res = retrieve_and_rerank_node(state)
        state.update(retrieve_res)

        # Step 3: FlashRank Cross-Encoder Re-Ranking & CRAG Evaluation
        yield f"event: status\ndata: {json.dumps({'step': 'reranking', 'message': 'FlashRank cross-encoder re-ranking & CRAG context evaluation...'})}\n\n"
        crag_res = crag_evaluator_node(state)
        state.update(crag_res)

        if not state.get("is_sufficient", True) and state.get("iteration_count", 0) < 2:
            yield f"event: status\ndata: {json.dumps({'step': 'evaluating', 'message': 'Expanding search scope for missing symbols...'})}\n\n"
            retrieve_res2 = retrieve_and_rerank_node(state)
            state.update(retrieve_res2)

        chunks = state.get("retrieved_chunks", [])
        citations = []
        for c in chunks:
            citations.append({
                "filePath": c.get("file_path", "unknown"),
                "startLine": c.get("start_line", 1),
                "endLine": c.get("end_line", 1),
                "scope": c.get("scope", "Module"),
            })

        # Step 4: Emit citations
        yield f"event: citations\ndata: {json.dumps(citations)}\n\n"

        if not chunks:
            no_code_msg = "I could not find any relevant code in this repository to answer your question. Make sure the repository ingestion has completed."
            yield f"event: token\ndata: {json.dumps({'text': no_code_msg})}\n\n"
            yield f"event: done\ndata: {json.dumps({'finishReason': 'stop'})}\n\n"
            return

        # Step 5: Streaming Synthesis
        yield f"event: status\ndata: {json.dumps({'step': 'synthesizing', 'message': f'Synthesizing answer grounded on {len(citations)} code citations...'})}\n\n"
        synthesis_prompt = build_synthesis_prompt(message, chunks, conversation_history)

        stream = gemini_client.models.generate_content_stream(
            model="gemini-2.5-flash",
            contents=synthesis_prompt,
        )

        for chunk in stream:
            if chunk.text:
                yield f"event: token\ndata: {json.dumps({'text': chunk.text})}\n\n"

        yield f"event: done\ndata: {json.dumps({'finishReason': 'stop'})}\n\n"

    except Exception as e:
        err_msg = f"An error occurred during agentic RAG processing: {str(e)}"
        print(f"stream_agentic_rag error: {e}")
        yield f"event: error\ndata: {json.dumps({'error': err_msg})}\n\n"
        yield f"event: done\ndata: {json.dumps({'finishReason': 'error'})}\n\n"
