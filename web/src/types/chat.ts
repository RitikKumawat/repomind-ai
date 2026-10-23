export interface CitationItem {
  filePath: string;
  startLine: number;
  endLine: number;
  scope?: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[] | null;
  createdAt?: string;
}

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReasoningStep {
  step: 'analyzing' | 'retrieving' | 'reranking' | 'evaluating' | 'synthesizing' | 'error';
  message: string;
  timestamp: number;
}
