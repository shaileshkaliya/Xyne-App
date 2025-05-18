export const OLLAMA_EMBEDDING_URI = 'http://localhost:11434/api/embeddings'
export const OLLAMA_TEXT_GENERATION_URI = 'http://localhost:11434/api/generate'
export const VESPA_DOCUMENT_INSERT_URI = (id: string) => `http://localhost:8080/document/v1/default/rag_doc/docid/${id}`
export const VESPA_SEARCH_URI = 'http://localhost:8080/search'


export const AUTH_ENDPOINT = '/auth'
export const OAUTH_CALLBACK_ENDPOINT = '/auth/callback'
export const CHAT_ENDPOINT = '/chat'
