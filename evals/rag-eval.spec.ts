import { cases } from './testCases.ts'
import type { SearchInputParams } from '../src/shared/rag.ts'

/**
 * Evaluation of the RAG retrieval functionality.
 */
const TEST_RAG_ID = 1098

const params: Omit<SearchInputParams, "query">[] = [{
  ftExact: true,
  ftSubstring: false,
  ftAnd: false,
  ftOr: false,
  vector: true,
  vectorK: 10,
  rerank: true,
  rerankK: 15,
  curate: false,
}]

function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

const caseResults = await Promise.all(cases.map(async ({ name, searchStrings, expected }) => {
  const queryResults: {
    query: string, 
    result: {
      expected: string,
      findings: number[],
    }[]
  }[] = []

  for (const query of searchStrings) {
    const queryResult: typeof queryResults[number] = {
      query,
      result: [],
    }

    const res = await fetch(`http://localhost:3000/api/rag/indices/${TEST_RAG_ID}/search`, {
      body: JSON.stringify({ ...params[0], query }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-index': '0',
        'x-test-user-role': 'admin',
      },
    })
    const results = (await res.json()) as { results: Record<string, any>[]; timings: Record<string, number> }

    const { results: ragResults } = results

    for (const expect of expected) {
      const expectResult: typeof queryResult.result[number] = {
        expected: expect,
        findings: [],
      }
      for (const ragChunk of ragResults) {
        const content = normalizeWhitespace(ragChunk.content.toLowerCase())
        const normExpect = normalizeWhitespace(expect.toLowerCase())
        expectResult.findings.push(content.includes(normExpect) ? 1 : 0)
      }
      queryResult.result.push(expectResult)
    }

    queryResults.push(queryResult)
  }

  return {
    name,
    queryResults,
  }
}))

// Save as JSON
import { writeFileSync } from 'fs'

const fileName = `./evals/results-${Date.now()}.json`
writeFileSync(fileName, JSON.stringify(caseResults, null, 2))

console.log(`RAG evaluation completed. Results saved to ${fileName}`)
