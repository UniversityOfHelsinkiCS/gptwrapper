import { useState } from 'react'
import { RagIndexAttributes } from '../../../shared/types'
import { RagChunk } from '../../../shared/rag'
import apiClient from '../../util/apiClient'

export const Search = ({ ragIndex }: { ragIndex: RagIndexAttributes }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RagChunk[]>([])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const response = await apiClient.post<RagChunk[]>(`/rag/indices/${ragIndex.id}/search`, {
      query,
    })

    setResults(response.data ?? [])
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={query} onChange={handleInputChange} />
      <button type="submit">Search</button>
      <ul>
        {results.map((chunk) => (
          <li key={chunk.id}>{chunk.content}</li>
        ))}
      </ul>
    </form>
  )
}
