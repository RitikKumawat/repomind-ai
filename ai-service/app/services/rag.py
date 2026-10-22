from app.services.ingestion import get_embeddings, qdrant_client, COLLECTION_NAME, gemini_client
from qdrant_client.models import Filter, FieldCondition, MatchValue

def generate_rag_response(repo_id: str, message: str) -> str:
    # 1. Embed query
    query_vector = get_embeddings(message)
    
    # 2. Search Qdrant
    search_result = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="repo_id",
                    match=MatchValue(value=repo_id)
                )
            ]
        ),
        limit=5
    )
    
    # 3. Construct Context
    context = ""
    for hit in search_result:
        path = hit.payload.get("file_path", "unknown")
        content = hit.payload.get("content", "")
        context += f"--- File: {path} ---\n{content}\n\n"
        
    if not context:
        context = "No relevant code found in this repository."
        
    # 4. Construct Prompt
    prompt = f"""You are a helpful AI assistant specialized in answering questions about code repositories.
Use the following context from the repository to answer the user's question. If the answer cannot be found in the context, state that you don't know based on the provided code.

Context:
{context}

User Question:
{message}
"""

    # 5. Get AI Response
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )
    
    return response.text
