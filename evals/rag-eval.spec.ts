import { cases } from './testCases.ts'

/**
 * Evaluation of the RAG retrieval functionality.
 */
const TEST_RAG_ID = 1098

const allTestResults = {} as Record<
  string,
  {
    results: { query: string; successRate: number; wasteRate: number; valueRate: number; rankScore: number }[]
    expects: Set<string>
  }
>

for (const { name, searchStrings, expected, source } of cases) {
  const result = {
    results: [] as { query: string; successRate: number; wasteRate: number; valueRate: number; rankScore: number }[],
    expects: new Set<string>(),
  }
  allTestResults[name] = result

  for (const query of searchStrings) {
    const params = {
      query,
      curate: false,
      ft: true,
      rerank: true,
      vector: true,
    }
    const res = await fetch(`http://localhost:3000/api/rag/indices/${TEST_RAG_ID}/search`, {
      body: JSON.stringify(params),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-user-index': '0',
        'x-test-user-role': 'admin',
      },
    })
    const results = (await res.json()) as { results: Record<string, any>[]; timings: Record<string, number> }

    const { results: ragResults } = results

    // console.log(ragResults.map((r) => r.content).join('\n---\n'))

    let waste = 0
    let value = 0
    let rankScore = 0

    const expectsNotFound = [...expected]
    const expectsFound = [] as { expect: string; rank: number }[]

    ragResults.forEach((ragChunk, idx) => {
      let isWaste = true
      for (const expect of expected) {
        if (ragChunk.content.toLowerCase().includes(expect.toLowerCase())) {
          isWaste = false

          expectsFound.push({ expect, rank: idx + 1 })
          expectsNotFound.splice(expectsNotFound.indexOf(expect), 1)
        }
      }
      if (isWaste) {
        waste += 1
      } else {
        value += 1
        rankScore += 1 / (idx + 1)
      }
    })

    const successRate = expectsFound.length / expected.length
    const wasteRate = waste / ragResults.length
    const valueRate = value / ragResults.length

    result.results.push({
      query,
      successRate,
      wasteRate,
      valueRate,
      rankScore,
    })

    expected.forEach((expectedText) => result.expects.add(expectedText))
  }
}

for (const [caseName, { results: testResults, expects }] of Object.entries(allTestResults)) {
  console.log(`\n=== ${caseName} ===`)
  console.log('Trying to find:')
  console.log(`- ${Array.from(expects).join('\n- ')}`)

  const totalSuccessRate = testResults.reduce((acc, r) => acc + r.successRate, 0) / testResults.length
  const totalWasteRate = testResults.reduce((acc, r) => acc + r.wasteRate, 0) / testResults.length
  const totalValueRate = testResults.reduce((acc, r) => acc + r.valueRate, 0) / testResults.length
  const totalRankScore = testResults.reduce((acc, r) => acc + r.rankScore, 0) / testResults.length

  testResults.push({
    query: '** Summary **',
    successRate: totalSuccessRate,
    wasteRate: totalWasteRate,
    valueRate: totalValueRate,
    rankScore: totalRankScore,
  })
  console.table(
    testResults.map((r) => ({
      query: r.query,
      result: r.successRate === 1 ? '✅' : r.successRate > 0 ? '⚠️' : '❌',
      successRate: (r.successRate * 100).toFixed(0) + '%',
      valuableResults: (r.valueRate * 100).toFixed(0) + '%',
      rankScore: (r.rankScore * 100).toFixed(0),
    })),
  )
}
