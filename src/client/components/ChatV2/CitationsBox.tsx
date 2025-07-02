import { Box, Chip, Paper, Typography, Button, Drawer, Skeleton } from '@mui/material'
import type { FileSearchCompletedData, FileSearchResultData } from '../../../shared/types'
import type { Message } from '../../types'
import Markdown from 'react-markdown'
import { useFileSearchResults } from './api'
import { useTranslation } from 'react-i18next'
import { ShortText, Subject } from '@mui/icons-material'
import { useEffect, useRef, useState } from 'react'

const FileItemComponent = ({ fileItem, cutOff = false }: { fileItem: FileSearchResultData; cutOff?: boolean }) => {
  return (
    <Paper sx={{ p: 2, pt: 1, mt: 2 }}>
      <Typography variant="body1" fontWeight={300}>
        <Markdown>{cutOff ? fileItem.text?.substring(0, 200) + '...' : fileItem.text}</Markdown>
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 300, fontStyle: 'oblique' }}>
        {fileItem.filename} (score: {fileItem.score})
      </Typography>
    </Paper>
  )
}

const MessageFileSearchResult = ({ fileSearchResult }: { fileSearchResult: FileSearchCompletedData }) => {
  const { data: results, isSuccess: isResultsSuccess } = useFileSearchResults(fileSearchResult.id)
  const { t } = useTranslation()
  const [sourceModalOpen, setSourceModalOpen] = useState<boolean>(false)
  const isExpired = isResultsSuccess && 'expired' in results
  const arrayResults = Array.isArray(results) ? results : []

  return (
    <Box sx={{ pl: 2.5, mb: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography>{t('chat:searchTerms')}</Typography>
        {fileSearchResult.queries.map((q, idx) => (
          <Chip
            key={idx}
            label={q}
            sx={{
              width: 'fit-content',
              p: 0.4,
              borderRadius: 2,
              fontWeight: '600',
              height: 'auto',
              '& .MuiChip-label': {
                display: 'block',
                whiteSpace: 'normal',
              },
            }}
            color="primary"
          />
        ))}
      </Box>
      {isResultsSuccess && !('expired' in results) && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {results.map((result, idx) => (
            <FileItemComponent key={idx} fileItem={result} cutOff={true} />
          ))}
        </Box>
      )}

      {isExpired && <Typography color="error">File search results expired</Typography>}
      <Box sx={{ mt: 1 }}>
        <Button variant="outlined" startIcon={<Subject />} onClick={() => setSourceModalOpen(true)} sx={{ borderRadius: 4, mt: 2, mb: 2 }}>
          {t('chat:readMore')}
        </Button>
      </Box>
      <SourceModal open={sourceModalOpen} setOpen={setSourceModalOpen} results={arrayResults} />
    </Box>
  )
}

const SourceModal = ({ open, setOpen, results }: { open: boolean; setOpen: any; results: any[] | undefined }) => {
  const { t } = useTranslation()
  return (
    <Drawer
      anchor="right"
      sx={{ zIndex: 1400 }}
      open={open}
      onClose={() => setOpen(false)}
      slotProps={{
        paper: {
          sx: {
            width: '80%',
            maxWidth: '80%',
            pt: 2,
            pl: 2,
            alignContent: 'right',
          },
        },
      }}
    >
      <Box sx={{ p: 2, gap: 2 }}>
        <Typography variant="h5">{t('chat:sources')}</Typography>
        {results?.map((result, idx) => <FileItemComponent key={idx} fileItem={result} />)}
      </Box>
      <Box sx={{ position: 'sticky', bottom: 0, background: '#FFF', p: 1 }}>
        <Button variant="outlined" startIcon={<ShortText />} onClick={() => setOpen(false)} sx={{ borderRadius: 4, mt: 2, mb: 2 }}>
          {t('chat:readLess')}
        </Button>
      </Box>
    </Drawer>
  )
}

export const CitationsBox = ({
  messages,
  fileSearchResult,
  isFileSearching,
}: {
  messages: Message[]
  fileSearchResult?: FileSearchCompletedData
  isFileSearching: boolean
}) => {
  const messageCitations = [...messages.map((m) => m.fileSearchResult).filter(Boolean)] as FileSearchCompletedData[]
  const { t } = useTranslation()
  if (fileSearchResult && !messageCitations.includes(fileSearchResult)) {
    messageCitations.push(fileSearchResult)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ p: 3 }}>
        {t('chat:sources')}
      </Typography>
      <Box sx={{ mr: 2.5 }}>
        {messageCitations.map((c, key) => (
          <MessageFileSearchResult key={key} fileSearchResult={c} />
        ))}
      </Box>
      {isFileSearching && (
        <Box
          sx={{
            width: '95%',
            display: 'flex',
            flexDirection: 'column',
            pl: 2.5,
            mr: 2,
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Skeleton sx={{ borderRadius: 5, flex: 2 }} height={'3rem'} />
              <Skeleton sx={{ borderRadius: 5, flex: 1 }} height={'3rem'} />
            </Box>
            <Skeleton sx={{ borderRadius: 5 }} height={'3rem'} />
          </Box>

          <Skeleton variant="rounded" height={'15rem'} />
          <Skeleton variant="rounded" height={'15rem'} />
          <Skeleton variant="rounded" height={'15rem'} />
        </Box>
      )}
    </Box>
  )
}

export const FileSearchInfo = ({
  isFileSearching,
  fileSearchResult,
  messages,
  ragDisplay,
}: {
  isFileSearching: boolean
  fileSearchResult?: FileSearchCompletedData
  messages: Message[]
  ragDisplay: boolean
  toggleRagDisplay: () => void
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }, 500)
    }
  }, [fileSearchResult, isFileSearching, messages.length, ragDisplay])

  if (!ragDisplay) {
    return
  }

  return (
    <Box
      ref={scrollRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 300,
        borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
        overflowY: 'auto',
        mr: '8px',
      }}
    >
      <CitationsBox messages={messages} fileSearchResult={fileSearchResult} isFileSearching={isFileSearching} />
    </Box>
  )
}
