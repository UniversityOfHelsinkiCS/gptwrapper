import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getAzureChatOpenAI } from "../langchain/azure";
import { z } from "zod/v4";
import logger from "src/server/util/logger";

const CurationOutputSchema = z.object({
  reason: z.string().min(1).max(500).describe("A brief explanation of the relevance score assigned to the document."),
  relevanceScore: z.number().min(0).max(1).describe("A score from 0 to 1 indicating the relevance of the document to the user query."),
  shouldBeIncluded: z.boolean().describe("Indicates whether the document should be included in the final curated list."),
})

/**
 * Curates a list of documents based on their relevance to a user query. Approx token cost is 2000 input + 500 output.
 * @param documents The documents to curate.
 * @param query The user query to evaluate against the documents.
 * @returns A list of curated documents, sorted by relevance.
 */
export const curateDocuments = async (documents: Document[], query: string) => {
  let inputTokens = 0;
  let outputTokens = 0;

  const model = getAzureChatOpenAI({ name: "gpt-4o-mini", temperature: 0, streaming: false })
    .withStructuredOutput(CurationOutputSchema, { name: 'Curator', method: 'json_mode' })
    .withConfig({ 
      callbacks: [{ handleLLMEnd(output,) {
        const tokenUsage = output.llmOutput?.tokenUsage as { promptTokens: number; completionTokens: number; totalTokens: number; } | undefined;
        if (tokenUsage) {
          inputTokens += tokenUsage.promptTokens;
          outputTokens += tokenUsage.completionTokens;
        }
      }, }]
    })

  const promptTemplate = ChatPromptTemplate.fromMessages<{ documentName: string, content: string, query: string }>([
    [
      "system",
      "You are an expert at evaluating the relevance of documents to user search queries. Given a user query and a document, your task is to rate document's relevance to the query and decide whether to include it in the curated list.",
    ],
    ["human", "Document {documentName}:\n\"{content}\"\n\nUser Query: \"{query}\"\n\nRate the relevance of the document to the user query and decide if it should be included."],
  ]);

  const curator = promptTemplate.pipe(model)

  const curatedResults = await Promise.all(documents.map(async (doc) => {
    const response = await curator.invoke({
      documentName: doc.metadata.ragFileName || "Unnamed Document",
      content: doc.pageContent,
      query,
    });

    return {
      document: doc,
      relevanceScore: response.relevanceScore,
      reason: response.reason,
      shouldBeIncluded: response.shouldBeIncluded,
    };
  }));

  const newDocuments = curatedResults.filter(r => r.shouldBeIncluded).sort((a, b) => b.relevanceScore - a.relevanceScore).map(r => r.document);

  logger.info(`Curation LLM call ended.`, { query, inputTokens, outputTokens, numDocuments: documents.length, numCuratedDocuments: newDocuments.length });

  return newDocuments;
};
