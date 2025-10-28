import { adminTest as test } from '../e2e/fixtures'
import { RagChunk, SearchInputParams } from '../src/shared/rag'

/**
 * Evaluation of the RAG retrieval functionality.
 */

const tests = [
  {
    name: 'Kokeen ajankohta',
    query: [
      'koe',
      'kurssikoe',
      'koe ajankohta',
      'kokeen ajankohta',
      'kokeen aikataulu',
      'koe alkaa',
      'ohjelmistotuotannon koe ajankohta',
      'ohjelmistotuotannon koe',
      'kokeen ajankohdat milloin voi tehdä kokeen ohjelmistotuotannon kurssi materiaali',
    ],
    expected: ['klo 13-16 A111 ja CHE A110 (sähköinen salitentti)'],
    source: 'etusivu.txt',
  },
  {
    name: 'Kurssin arviointi',
    query: [
      'pisteet',
      'kurssin pisteytys',
      'arviointi',
      'arviointiperusteet',
      'kurssin arviointi',
      'kurssin arvostelu',
      'miten kurssi arvioidaan',
      'miten kurssi pisteytetään',
      'miten kurssi arvostellaan',
      'arviointikriteerit',
      'arviointiperusteet ohjelmistotuotannon kurssi',
    ],
    expected: ['Kurssi koostuu kolmesta komponentista, luennoista, laskuharjoituksista ja miniprojektista.', 'Täysiin kurssipisteisiin riittää 90% monivalintakysymyspisteistä (mvp).'],
    source: 'osa0.txt',
  },
]

const testResults: { query: string, successRate: number }[] = []

test.afterAll(() => {
  const totalSuccessRate = testResults.reduce((acc, r) => acc + r.successRate, 0) / testResults.length
  testResults.push({
    query: '** Summary **',
    successRate: totalSuccessRate,
  })
  console.table(testResults.map(r => ({
    query: r.query,
    result: r.successRate === 1 ? '✅' : r.successRate > 0 ? '⚠️' : '❌',
    successRate: (r.successRate * 100).toFixed(0) + '%',
  })))
})

test.describe('RAG Retrieval evals', () => {
  for (const t of tests) {
    test(t.name, async ({ request }) => {
      for (const query of t.query) {
        const params: SearchInputParams = {
          query,
          curate: false,
          ft: true,
          rerank: false,
          vector: true,
        }
        const res = await request.post('/api/rag/indices/1097/search', {
          data: params,
        })
        const results = await res.json() as { results: RagChunk[]; timings: Record<string, number> }

        const { results: ragResults } = results

        const successesfulContents = t.expected.map((expectedText) => {
          return ragResults.some((chunk) => chunk.content.includes(expectedText))
        })

        const successes = successesfulContents.filter((s) => s).length
        const successRate = successes / t.expected.length
        
        testResults.push({
          query,
          successRate,
        })
      }
    })
  }
})
