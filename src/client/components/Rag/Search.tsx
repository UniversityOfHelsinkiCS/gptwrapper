import { useState } from 'react'
import { RagIndexAttributes } from '../../../shared/types'
import { RagChunk, SearchInputParams } from '../../../shared/rag'
import apiClient from '../../util/apiClient'
import { Alert, Box, Checkbox, Chip, Divider, Fade, FormControlLabel, LinearProgress, Paper, TextField, Typography } from '@mui/material'
import { InsertDriveFileOutlined } from '@mui/icons-material'
import { BlueButton, OutlineButtonBlue } from '../ChatV2/general/Buttons'
import { useTranslation } from 'react-i18next'
import useCurrentUser from '../../hooks/useCurrentUser'

export const Search = ({ ragIndex }: { ragIndex: RagIndexAttributes }) => {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const [query, setQuery] = useState('')
  const [vector, setVector] = useState(true)
  const [ft, setFt] = useState(true)
  const [rerank, setRerank] = useState(true)
  const [curate, setCurate] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [results, setResults] = useState<{ results: RagChunk[]; timings: Record<string, number> }>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const searchParams: SearchInputParams = {
      query,
      vector,
      ftExact: ft,
      ftSubstring: ft,
      ftAnd: ft,
      ftOr: ft,
      rerank,
      curate,
    }
    setIsLoading(true)
    setShowAll(false)
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
    <Box my="2rem" display="flex" gap="1rem" sx={{ flexDirection: 'column' }}>
      <Alert severity="info">{t('rag:searchDescription')}</Alert>

      <form onSubmit={handleSubmit} style={{ flex: 1 }}>
        <Box display="flex" gap="1rem" alignItems="stretch">
          <TextField autoFocus type="text" value={query} onChange={handleInputChange} label={t('rag:searchQueryLabel')} />
          <BlueButton type="submit" disabled={!query.trim()} sx={{ px: '2.5rem' }}>
            {t('rag:searchButton')}
          </BlueButton>
        </Box>
        {user?.isAdmin && (
          <Paper variant="outlined" sx={{ p: '1rem', borderRadius: '0.5rem', mt: '1.5rem', bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary">
              {t('rag:advancedOptionsLabel')}
            </Typography>
            <Box display="flex" flexWrap="wrap" columnGap="1.5rem">
              <FormControlLabel control={<Checkbox checked={vector} onChange={(e) => setVector(e.target.checked)} />} label={t('rag:useSemanticSearch')} />
              <FormControlLabel control={<Checkbox checked={ft} onChange={(e) => setFt(e.target.checked)} />} label={t('rag:useKeywordSearch')} />
              <FormControlLabel control={<Checkbox checked={rerank} onChange={(e) => setRerank(e.target.checked)} />} label={t('rag:useReranking')} />
              <FormControlLabel control={<Checkbox checked={curate} onChange={(e) => setCurate(e.target.checked)} />} label={t('rag:useCuration')} />
            </Box>
          </Paper>
        )}
      </form>
      <Box flex={2}>
        {isLoading && <LinearProgress />}
        {user?.isAdmin && (
          <Fade in={!!results?.timings}>
            {results?.timings ? (
              <Paper variant="outlined" sx={{ p: '1rem', borderRadius: '0.5rem', mb: '2rem', maxWidth: 'fit-content' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('rag:timingsTitle')}
                </Typography>
                {Object.entries(results?.timings ?? {}).map(([key, value]) => (
                  <Typography key={key} variant="body2" color="text.secondary">
                    {t('rag:timingEntry', { key, value })}
                  </Typography>
                ))}
                <Typography variant="body2" fontWeight="bold" mt="0.5rem">
                  {t('rag:timingsTotal', { value: totalTime })}
                </Typography>
              </Paper>
            ) : (
              <div />
            )}
          </Fade>
        )}
        <Fade in={!!results?.results}>
          {results?.results ? (
            <Box my="1rem">
              {results.results.length === 0 ? (
                <Alert severity="error">{t('rag:searchNoResults')}</Alert>
              ) : (
                <Typography variant="h6" mb="1rem">
                  {t('rag:resultsTitle')}
                </Typography>
              )}
              <Box data-testid="rag-search-results" display="flex" flexDirection="column" gap="1rem">
                {(showAll ? results.results : results.results.slice(0, 3)).map((chunk, idx) => (
                  <Paper key={chunk.id} variant="outlined" sx={{ p: '1rem', borderRadius: '0.5rem' }}>
                    <Box display="flex" alignItems="center" gap="0.5rem" mb="0.5rem">
                      <Box
                        sx={{
                          flexShrink: 0,
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '50%',
                          bgcolor: 'action.selected',
                          color: 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<InsertDriveFileOutlined />}
                        label={chunk.metadata?.ragFileName ?? t('rag:unknownSource')}
                      />
                    </Box>
                    <Divider sx={{ mb: '0.75rem' }} />
                    <Typography whiteSpace="pre-line" variant="body2">
                      {chunk.content}
                    </Typography>
                  </Paper>
                ))}
              </Box>
              {results.results.length > 3 && (
                <Box mt="1rem">
                  <OutlineButtonBlue onClick={() => setShowAll((prev) => !prev)}>
                    {showAll ? t('rag:showFewerResults') : t('rag:showAllResults', { count: results.results.length })}
                  </OutlineButtonBlue>
                </Box>
              )}
            </Box>
          ) : (
            <div />
          )}
        </Fade>
      </Box>
    </Box>
  )
}
