import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { OLLAMA_EMBEDDING_URI, OLLAMA_TEXT_GENERATION_URI, VESPA_DOCUMENT_INSERT_URI, VESPA_SEARCH_URI } from '../utils/constants';

export function chunkText(
  text: string,
  chunkSize: number = 800,
  overlap: number = 100,
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    chunks.push(chunkWords.join(' '));
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

/**
 * Embed a chunk of text using Ollama.
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await axios.post(OLLAMA_EMBEDDING_URI, {
    model: 'nomic-embed-text',
    prompt: text,
  });
  return response.data.embedding;
}

/**
 * Push a chunk with embedding to Vespa.
 */
async function addToVespa(id: string, content: string, embedding: number[]) {
  const payload = {
    fields: {
      id,
      content,
      embedding,
    },
  };

  await axios.post(VESPA_DOCUMENT_INSERT_URI(id), payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  console.log(`✅ Ingested chunk as document: ${id}`);
}

/**
 * Main ingestion function to be imported and called from fetchGoogleDocsAsString.
 */
export async function ingestData(documentText: string, baseId: string): Promise<void> {
  const chunks = chunkText(documentText, 500);

  await Promise.all(
    chunks.map(async (chunk, i) => {
      const embedding = await getEmbedding(chunk);
      const docId = encodeURIComponent(`${baseId}-${i}-${uuidv4()}`);
      await addToVespa(docId, chunk, embedding);
    })
  );
}

export async function searchFromVespa(queryEmbedding: number[], topK = 5): Promise<string[]> {
  const body = {
    yql: `select content from sources * where ([{"targetNumHits":${topK}}]nearestNeighbor(embedding, query_embedding));`,
    hits: topK,
    query_embedding: {
      values: queryEmbedding,
    },
  };

  const response = await fetch(VESPA_SEARCH_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  const hits = result.root.children || [];
  return hits.map((hit: any) => hit.fields.content); // returns top `content` strings
}

export async function answerFromQuery(userQuery: string): Promise<string> {
  // Step 1: Generate embedding from query
  const queryEmbedding = await getEmbedding(userQuery);

  // Step 2: Search in Vespa for similar documents
  const topDocs = await searchFromVespa(queryEmbedding, 5);
  const context = topDocs.join('\n---\n');

  // Step 3: Generate final answer using LLM
  const prompt = `Answer the following question using the context below.\n\nContext:\n${context}\n\nQuestion: ${userQuery}\nAnswer:`;

  const llmResponse = await axios.post(OLLAMA_TEXT_GENERATION_URI, {
    model: 'phi3',
    prompt: prompt,
    stream: false,
  });

  return llmResponse.data.response.trim();
}
