import { useState } from 'react'
import { RagIndexAttributes } from '../../../shared/types'
import { RagChunk, SearchInputParams, SearchParams } from '../../../shared/rag'
import apiClient from '../../util/apiClient'
import { Box, Checkbox, Fade, FormControl, FormControlLabel, Grow, LinearProgress, TextField, Typography, Zoom } from '@mui/material'
import { OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { amber, green, blue } from '@mui/material/colors'
import { useTranslation } from 'react-i18next'

const TimeLineColors = [blue[200], amber[300], green[300]]

export const Search = ({ ragIndex }: { ragIndex: RagIndexAttributes }) => {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [vector, setVector] = useState(true)
  const [ft, setFt] = useState(true)
  const [rerank, setRerank] = useState(true)
  const [curate, setCurate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{ results: RagChunk[]; timings: Record<string, number> }>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const searchParams: SearchInputParams = {
      query,
      vector,
      ft,
      rerank,
      curate,
    }
    setIsLoading(true)
    setResults(undefined)
    const response = await apiClient.post<{ results: RagChunk[]; timings: Record<string, number> }>(`/rag/indices/${ragIndex.id}/search`, searchParams)

    setResults(response.data)
    setIsLoading(false)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }

  const totalTime = Object.values(results?.timings ?? {}).reduce((acc, curr) => acc + curr, 0)

  return (
    <Box my="2rem" display="flex" gap="1rem">
      <form onSubmit={handleSubmit} style={{ flex: 1 }}>
        <FormControl>
          <TextField type="text" value={query} onChange={handleInputChange} label="Search Query" />
          <FormControlLabel control={<Checkbox checked={vector} onChange={(e) => setVector(e.target.checked)} />} label="Use semantic search" />
          <FormControlLabel control={<Checkbox checked={ft} onChange={(e) => setFt(e.target.checked)} />} label="Use keyword search" />
          <FormControlLabel control={<Checkbox checked={rerank} onChange={(e) => setRerank(e.target.checked)} />} label="Use reranking" />
          <FormControlLabel control={<Checkbox checked={curate} onChange={(e) => setCurate(e.target.checked)} />} label="Use curation" />
        </FormControl>
        <OutlineButtonBlue type="submit">Search</OutlineButtonBlue>
        <Typography variant="body2" mt="2rem">
          {t('rag:searchDescription')}
        </Typography>
      </form>
      <Box flex={2}>
        {isLoading && <LinearProgress />}
        <Fade in={!!results?.timings}>
          {results?.timings ? (
            <Box mb="2rem" width="80%">
              <Typography variant="h6">Timings</Typography>
              <Box display="flex">
                {Object.entries(results?.timings ?? {}).map(([key, value], idx) => (
                  <Zoom
                    in={true}
                    key={key}
                    style={{ width: `${(value / totalTime) * 100}%`, minWidth: '1rem', whiteSpace: 'nowrap' }}
                    timeout={{ enter: 1000 + idx * 1000 }}
                  >
                    <div>
                      {key}: {value} ms
                      <Box width="100%" height="1rem" bgcolor={TimeLineColors[idx % TimeLineColors.length]} border="1px solid black" borderRadius="1rem" />
                    </div>
                  </Zoom>
                ))}
              </Box>
            </Box>
          ) : (
            <div />
          )}
        </Fade>
        <Fade in={!!results?.results}>
          {results?.results ? (
            <Box my="1rem">
              <Typography variant="h6" mb="1rem">
                Results
              </Typography>
              <Box data-testid="rag-search-results">
                {results?.results?.map((chunk) => (
                  <Box key={chunk.id} my="1rem">
                    <Typography variant="subtitle2" color="text.secondary">
                      Source: {chunk.metadata?.ragFileName ?? 'unknown'}
                    </Typography>
                    <Typography whiteSpace="pre-line" variant="body2">
                      {chunk.content}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <div />
          )}
        </Fade>
      </Box>
    </Box>
  )
}
