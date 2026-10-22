import os
import re
import uuid
from dataclasses import dataclass, field
from typing import List, Optional
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    Language,
)

EXT_TO_LANGUAGE = {
    ".py": Language.PYTHON,
    ".js": Language.JS,
    ".jsx": Language.JS,
    ".ts": Language.TS,
    ".tsx": Language.TS,
    ".go": Language.GO,
    ".java": Language.JAVA,
    ".rs": Language.RUST,
    ".md": Language.MARKDOWN,
    ".html": Language.HTML,
}

@dataclass
class CodeChunk:
    id: str
    file_path: str
    language: str
    scope: str
    content: str
    raw_content: str
    start_line: int
    end_line: int
    symbols: List[str] = field(default_factory=list)
    parent_context: str = ""

def extract_file_imports(content: str, language: str) -> List[str]:
    """Extracts top-level module imports for context injection."""
    imports = []
    lines = content.splitlines()[:50]  # Check first 50 lines
    for line in lines:
        stripped = line.strip()
        if language in ("ts", "js"):
            if stripped.startswith("import ") or stripped.startswith("const ") and "require(" in stripped:
                imports.append(stripped)
        elif language == "py":
            if stripped.startswith("import ") or stripped.startswith("from "):
                imports.append(stripped)
        elif language == "go":
            if stripped.startswith("import ") or stripped.startswith("\""):
                imports.append(stripped)
    return imports[:8]

def extract_symbols_and_scope(chunk_text: str, language: str) -> tuple[str, List[str]]:
    """Identifies primary symbols (classes, functions, interfaces) and scope."""
    symbols = []
    scope_parts = []

    # Detect classes
    class_matches = re.findall(r"(?:class|interface|struct|type)\s+([A-Za-z0-9_]+)", chunk_text)
    if class_matches:
        symbols.extend(class_matches)
        scope_parts.append(f"Class/Type: {class_matches[0]}")

    # Detect functions/methods
    func_matches = re.findall(
        r"(?:def|function|async\s+function|func|public|private|protected)?\s*([A-Za-z0-9_]+)\s*\([^)]*\)",
        chunk_text
    )
    for fn in func_matches:
        if fn not in ("if", "for", "while", "switch", "catch", "return") and fn not in symbols:
            symbols.append(fn)
            if len(scope_parts) < 2:
                scope_parts.append(f"Method: {fn}")

    scope = " > ".join(scope_parts) if scope_parts else "Module Scope"
    return scope, symbols

def chunk_code_file(file_path: str, content: str) -> List[CodeChunk]:
    """
    Syntax-aware semantic chunking.
    Splits code along language AST constructs, preserving breadcrumbs and scope.
    """
    ext = os.path.splitext(file_path)[1].lower()
    lang_enum = EXT_TO_LANGUAGE.get(ext)
    lang_name = ext.lstrip(".") or "txt"

    # Use specialized language separators if supported
    if lang_enum:
        splitter = RecursiveCharacterTextSplitter.from_language(
            language=lang_enum,
            chunk_size=900,
            chunk_overlap=120,
        )
    else:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=900,
            chunk_overlap=120,
            separators=["\n\n", "\n", " ", ""],
        )

    raw_chunks = splitter.split_text(content)
    if not raw_chunks:
        return []

    file_imports = extract_file_imports(content, lang_name)
    import_header = ", ".join(file_imports[:5]) if file_imports else "None"

    chunks: List[CodeChunk] = []
    lines = content.splitlines()
    total_lines = len(lines)

    current_search_idx = 0

    for i, raw_chunk in enumerate(raw_chunks):
        scope, symbols = extract_symbols_and_scope(raw_chunk, lang_name)

        # Estimate line numbers
        start_line = 1
        end_line = total_lines
        first_line = raw_chunk.splitlines()[0].strip() if raw_chunk.splitlines() else ""
        if first_line:
            for line_idx in range(current_search_idx, total_lines):
                if first_line in lines[line_idx]:
                    start_line = line_idx + 1
                    current_search_idx = line_idx
                    break
        chunk_line_count = len(raw_chunk.splitlines())
        end_line = min(total_lines, start_line + chunk_line_count)

        # Build context-enriched content
        enriched_content = (
            f"[File]: {file_path}\n"
            f"[Language]: {lang_name}\n"
            f"[Scope]: {scope}\n"
            f"[Lines]: {start_line}-{end_line}\n"
            f"[Imports]: {import_header}\n\n"
            f"{raw_chunk}"
        )

        parent_context = f"File: {file_path} (Lines {start_line}-{end_line}), Scope: {scope}"

        chunks.append(
            CodeChunk(
                id=str(uuid.uuid4()),
                file_path=file_path,
                language=lang_name,
                scope=scope,
                content=enriched_content,
                raw_content=raw_chunk,
                start_line=start_line,
                end_line=end_line,
                symbols=symbols,
                parent_context=parent_context,
            )
        )

    return chunks
