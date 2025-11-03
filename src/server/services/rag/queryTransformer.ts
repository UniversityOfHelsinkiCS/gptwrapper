import { ChatPromptTemplate } from "@langchain/core/prompts"
import { getAzureChatOpenAI } from "../langchain/azure"
import { z } from "zod/v4"
import logger from "../../util/logger"

export type TransformQueryOptions = {
  generateSynonyms?: boolean
}

/**
 * Querytransformer takes in a raw search string and transforms it into multiple query variants.
 */
export const transformQuery = async (rawQuery: string, options: TransformQueryOptions = {}): Promise<string[]> => {
  if (options.generateSynonyms) {
    const synonyms = await generateSynonyms(rawQuery)
    return Array.from(new Set([rawQuery, ...synonyms]))
  }
  return [rawQuery]
}

const generateSynonyms = async (query: string): Promise<string[]> => {
  let inputTokens = 0;
  let outputTokens = 0;

  const model = getAzureChatOpenAI({ name: "gpt-4o-mini", temperature: 0.7, streaming: false })
    .withStructuredOutput(SynonymOutputSchema, { name: 'SynonymGenerator', method: 'json_mode' })
    .withConfig({ 
      callbacks: [{ handleLLMEnd(output,) {
        const tokenUsage = output.llmOutput?.tokenUsage as { promptTokens: number; completionTokens: number; totalTokens: number; } | undefined;
        if (tokenUsage) {
          inputTokens += tokenUsage.promptTokens;
          outputTokens += tokenUsage.completionTokens;
        }
      }, }]
    })

  const promptTemplate = ChatPromptTemplate.fromMessages<{ query: string }>([
    [
      "system",
      "You are an expert at generating normalized, alternative search strings for raw user-supplied search queries. Given a user query, your task is to provide alternative phrasings that capture the same intent while using lemmatization and query normalization.",
    ],
    // ["human", "Generate a list of 2 to 4 normalized alternative search strings for the following search query: \"\""],
    // ["assistant", ],
    ["human", "Generate a list of 2 to 4 normalized alternative search strings for the following search query: \"{query}\""],
  ]);

  const synonymGenerator = promptTemplate.pipe(model)

  const response = await synonymGenerator.invoke({
    query,
  });

  logger.info('SynonymGeneration', {
    query,
    synonyms: response.synonyms,
    inputTokens,
    outputTokens,
  });

  return response.synonyms;
}

const SynonymOutputSchema = z.object({
  synonyms: z.array(z.string()).min(1).max(5).describe("A list of synonyms or alternative phrasings for the input query."),
})
