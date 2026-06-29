import { useState, type ReactNode } from 'react'
import { RagIndexAttributes } from '../../../shared/types'
import { RagChunk, SearchInputParams } from '../../../shared/rag'
import apiClient from '../../util/apiClient'
import { Alert, Box, Checkbox, Collapse, Divider, FormControlLabel, IconButton, InputBase, LinearProgress, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { AccessTime, ExpandLess, ExpandMore, InsertDriveFileOutlined, Search as SearchIcon, Tune } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import useCurrentUser from '../../hooks/useCurrentUser'

export const Search = ({ ragIndex }: { ragIndex: RagIndexAttributes }) => {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [vector, setVector] = useState(true)
  const [ft, setFt] = useState(true)
  const [rerank, setRerank] = useState(true)
  const [curate, setCurate] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [results, setResults] = useState<{ results: RagChunk[]; timings: Record<string, number> }>()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!query.trim()) return
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
    setSearchedQuery(query)
    setResults(undefined)
    const response = await apiClient.post<{ results: RagChunk[]; timings: Record<string, number> }>(`/rag/indices/${ragIndex.id}/search`, searchParams)

    setResults(response.data)
    setIsLoading(false)
  }

  const totalTime = Object.values(results?.timings ?? {}).reduce((acc, curr) => acc + curr, 0)

  // Wrap occurrences of the searched term so teachers can see why a chunk matched.
  const highlightMatches = (text: string): ReactNode => {
    const term = searchedQuery.trim()
    if (!term) return text
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
    return parts.map((part, idx) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <Box
          component="mark"
          key={idx}
          sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16), color: 'primary.dark', px: '2px', borderRadius: '2px', fontWeight: 500 }}
        >
          {part}
        </Box>
      ) : (
        part
      ),
    )
  }

  const allResults = results?.results ?? []
  const visibleResults = showAll ? allResults : allResults.slice(0, 3)

  return (
    <Box my="0.5rem" display="flex" flexDirection="column" gap="18px">
      <Alert severity="info">{t('rag:searchDescription')}</Alert>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          bgcolor: 'grey.100',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '28px',
          height: '56px',
          pl: '18px',
          pr: '8px',
        }}
      >
        <SearchIcon sx={{ color: 'action.active', flex: '0 0 auto' }} />
        <InputBase autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('rag:searchQueryLabel')} sx={{ flex: 1, fontSize: '16px' }} />
        <IconButton
          type="submit"
          disabled={!query.trim()}
          sx={{
            flex: '0 0 auto',
            width: 40,
            height: 40,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
          }}
        >
          <SearchIcon fontSize="small" />
        </IconButton>
      </Box>

      {user?.isAdmin && (
        <Box>
          <Box
            role="button"
            onClick={() => setAdminOpen((open) => !open)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '20px',
              px: '14px',
              py: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Tune sx={{ fontSize: 18, color: 'action.active' }} />
            <Typography variant="body2" fontWeight={500}>
              {t('rag:advancedOptionsLabel')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · {t('rag:adminOnly')}
            </Typography>
            {adminOpen ? <ExpandLess sx={{ color: 'action.active' }} /> : <ExpandMore sx={{ color: 'action.active' }} />}
          </Box>

          <Collapse in={adminOpen}>
            <Box mt="12px" sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Box display="flex" flexWrap="wrap" sx={{ columnGap: '28px' }}>
                <FormControlLabel control={<Checkbox checked={vector} onChange={(e) => setVector(e.target.checked)} />} label={t('rag:useSemanticSearch')} />
                <FormControlLabel control={<Checkbox checked={ft} onChange={(e) => setFt(e.target.checked)} />} label={t('rag:useKeywordSearch')} />
                <FormControlLabel control={<Checkbox checked={rerank} onChange={(e) => setRerank(e.target.checked)} />} label={t('rag:useReranking')} />
                <FormControlLabel control={<Checkbox checked={curate} onChange={(e) => setCurate(e.target.checked)} />} label={t('rag:useCuration')} />
              </Box>

              {results?.timings && (
                <>
                  <Divider />
                  <Box display="flex" alignItems="center" flexWrap="wrap" gap="18px">
                    <Box display="flex" alignItems="center" gap="6px">
                      <AccessTime sx={{ fontSize: 16, color: 'action.active' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                        {t('rag:timingsTitle')}
                      </Typography>
                    </Box>
                    {Object.entries(results.timings).map(([key, value]) => (
                      <Typography key={key} variant="caption" color="text.secondary">
                        {key} <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{t('rag:msValue', { value })}</Box>
                      </Typography>
                    ))}
                    <Typography variant="caption" fontWeight={600}>
                      {t('rag:timingsTotalShort')} <Box component="span" sx={{ fontFamily: 'monospace' }}>{t('rag:msValue', { value: totalTime })}</Box>
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {isLoading && <LinearProgress />}

      {results && allResults.length > 0 && (
        <Box data-testid="rag-search-results">
          <Box display="flex" alignItems="baseline" justifyContent="space-between" gap="12px" sx={{ pb: '6px', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={500}>
              {t('rag:resultsTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ flex: '0 0 auto' }}>
              {t('rag:resultsCount', { count: allResults.length })}
            </Typography>
          </Box>

          <Box display="flex" flexDirection="column">
            {visibleResults.map((chunk, idx) => (
              <Box
                key={chunk.id}
                sx={{ display: 'flex', gap: '14px', py: '16px', borderBottom: idx < visibleResults.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}
              >
                <Typography sx={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: 'primary.main', flex: '0 0 auto', pt: '1px' }}>#{idx + 1}</Typography>
                <Box minWidth={0} display="flex" flexDirection="column" gap="6px">
                  <Box display="flex" alignItems="center" gap="6px" sx={{ color: 'text.disabled', minWidth: 0 }}>
                    <InsertDriveFileOutlined sx={{ fontSize: 14, flex: '0 0 auto' }} />
                    <Typography variant="caption" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chunk.metadata?.ragFileName ?? t('rag:unknownSource')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" whiteSpace="pre-line" sx={{ lineHeight: 1.6, color: 'text.secondary' }}>
                    {highlightMatches(chunk.content)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {allResults.length > 3 && (
            <Box
              role="button"
              onClick={() => setShowAll((prev) => !prev)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                p: '12px',
                cursor: 'pointer',
                color: 'primary.main',
                fontSize: '14px',
                fontWeight: 500,
                borderTop: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) },
              }}
            >
              {showAll ? t('rag:showFewerResults') : t('rag:showAllResults', { count: allResults.length })}
              {showAll ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>
          )}
        </Box>
      )}

      {results && allResults.length === 0 && <Alert severity="error">{t('rag:searchNoResults', { query: searchedQuery })}</Alert>}
    </Box>
  )
}
