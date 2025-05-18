import axios from 'axios';

export function chunkWithOverlap(
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

export async function embedChunk(text: string): Promise<number[]> {
  const res = await axios.post('http://localhost:11434/api/embeddings', {
    model: 'nomic-embed-text',
    prompt: text,
  });
  return res.data.embedding;
}

export async function indexChunkInVespa(
  chunkId: string,
  chunk: string,
  embedding: number[],
) {
  const doc = {
    id: `id:rag_doc:rag_doc::${chunkId}`,
    fields: {
      content: chunk,
      embedding: embedding,
    },
  };

  const encodedId = encodeURIComponent(chunkId);
  const url = `http://localhost:8080/document/v1/rag_doc/rag_doc/docid/${encodedId}`;
  await axios.post(url, doc);
}

export async function searchChunks(query: string): Promise<string[]> {
  const embedding = await embedChunk(query);

  const response = await axios.post('http://localhost:8080/search/', {
    yql: 'select text from sources * where ([{"targetNumHits":5}]nearestNeighbor(embedding, query_embedding));',
    hits: 5,
    ranking: {
      features: {
        query: {
          query_embedding: embedding,
        },
      },
    },
  });

  return (response.data.root.children || []).map((hit: any) => hit.fields.text);
}

export async function generateAnswer(
  contexts: string[],
  question: string,
): Promise<string> {
  const prompt = `
  You are a helpful assistant. Answer the question using the context below.
  
  Context:
  ${contexts.join('\n\n')}
  
  Question:
  ${question}
  
  Answer:
  `;

  const res = await axios.post('http://localhost:11434/api/generate', {
    model: 'llama3',
    prompt: prompt,
    stream: false,
  });

  return res.data.response.trim();
}

async function queryVespa(queryText: string, topK = 5) {
  const vespaUrl = 'http://localhost:8080/search/';

  const queryBody = {
    yql: `select * from sources * where userQuery();`,
    query: queryText,
    hits: topK,
  };

  try {
    const response = await axios.post(vespaUrl, queryBody, {
      headers: { 'Content-Type': 'application/json' },
    });

    const hits = response.data.root.children || [];
    return hits.map((hit: any) => hit.fields.content);
  } catch (error) {
    console.error('Error querying Vespa:', error);
    return [];
  }
}

async function generateAnswerWithLLM(
  query: string,
  contextChunks: string[],
): Promise<string> {
  const context = contextChunks.join('\n\n');

  const prompt = `
You are an AI assistant. Use the following context to answer the question as accurately as possible.

Context:
${context}

Question: ${query}
Answer:
  `;

  try {
    const response = await axios.post(
      'http://localhost:11434/api/chat',
      {
        model: 'phi3', // ✅ using the local phi3 model
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data.message.content.trim();
  } catch (error: any) {
    console.error(
      'Error calling Ollama phi3 model:', error.message || error,
    );
    return 'Error generating answer with local phi3 model.';
  }
}

export async function answerUserQuery(query: string) {
  const contextChunks = await queryVespa(query);
  if (contextChunks.length === 0) {
    return "Sorry, I couldn't find any relevant information.";
  }

  const answer = await generateAnswerWithLLM(query, contextChunks);
  return answer;
}
