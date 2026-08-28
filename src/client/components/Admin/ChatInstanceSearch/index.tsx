import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import debounce from 'lodash/debounce'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getLanguageValue } from '@shared/utils'
import useCourse from '../../../hooks/useCourse'
import CoursePreview from '../../ChatV2/CoursePreview'
import useChatInstanceSearch, { CHAT_INSTANCE_SEARCH_DEFAULT_LIMIT, CHAT_INSTANCE_SEARCH_MIN_LENGTH } from './useChatInstanceSearch'

const ChatInstanceSearch = () => {
  const { t, i18n } = useTranslation()
  const { language } = i18n

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [previewCourseId, setPreviewCourseId] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(CHAT_INSTANCE_SEARCH_DEFAULT_LIMIT)

  const setDebounced = useMemo(() => debounce((value: string) => setDebouncedSearch(value.trim()), 300), [])

  useEffect(() => () => setDebounced.cancel(), [setDebounced])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
    setDebounced(value)
  }

  const clearSearch = () => {
    setDebounced.cancel()
    setSearch('')
    setDebouncedSearch('')
    setPage(0)
  }

  const {
    results: chatInstances,
    count,
    isFetching,
  } = useChatInstanceSearch({ search: debouncedSearch, language, limit: rowsPerPage, offset: page * rowsPerPage })
  const { data: previewCourse } = useCourse(previewCourseId)

  const hasQuery = debouncedSearch.length >= CHAT_INSTANCE_SEARCH_MIN_LENGTH

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder={t('admin:chatInstanceSearchPlaceholder')}
          size="small"
          sx={{ minWidth: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={clearSearch} aria-label={t('common:close')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {hasQuery && isFetching && <CircularProgress size={24} />}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {t('admin:chatInstanceSearchLanguageHint')}
      </Typography>

      {!hasQuery && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('admin:chatInstanceSearchHint')}
        </Typography>
      )}

      {hasQuery && !isFetching && chatInstances?.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('admin:chatInstanceSearchNoResults')}
        </Typography>
      )}

      {hasQuery && !!chatInstances?.length && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('stats:courseCodes')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('stats:courseNameInfo')}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{t('stats:courseTerms')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatInstances.map((chatInstance) => (
                <TableRow key={chatInstance.id} onClick={() => setPreviewCourseId(chatInstance.id)} sx={{ cursor: 'pointer' }} hover>
                  <TableCell align="left">
                    <Typography>{chatInstance.codes.join(', ')}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography>{getLanguageValue(chatInstance.name, language)}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography>{chatInstance.terms.map((term) => getLanguageValue(term.label, language)).join(', ')}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            rowsPerPageOptions={[25, 50, 100]}
            count={count ?? -1}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10))
              setPage(0)
            }}
            labelRowsPerPage={t('admin:rowsPerPage')}
          />
        </TableContainer>
      )}

      <Dialog open={Boolean(previewCourseId)} onClose={() => setPreviewCourseId(undefined)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={() => setPreviewCourseId(undefined)} aria-label={t('common:close')}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>{previewCourse && <CoursePreview course={previewCourse} />}</DialogContent>
      </Dialog>
    </Box>
  )
}

export default ChatInstanceSearch
