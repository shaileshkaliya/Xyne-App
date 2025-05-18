import { chunkWithOverlap, embedChunk, indexChunkInVespa } from "./ragUtilities";

export async function ingestData(fullText: string, sourceId: string) {
  const chunks = chunkWithOverlap(fullText);
  const ingestionTasks: Promise<void>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = `${sourceId}-chunk-${i}`;

    const task = async () => {
      const embedding = await embedChunk(chunk);
      await indexChunkInVespa(chunkId, chunk, embedding);
      console.log(`Indexed: ${chunkId}`);
    };

    ingestionTasks.push(task());
  }

  await Promise.all(ingestionTasks);
}
