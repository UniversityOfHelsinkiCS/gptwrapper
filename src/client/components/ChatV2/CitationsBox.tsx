import { Box, Chip, Paper, Typography, Button, Drawer } from '@mui/material'
import type { FileSearchCompletedData, FileSearchResultData } from '../../../shared/types'
import type { Message } from '../../types'
import Markdown from 'react-markdown'
import { useRagIndex } from '../../hooks/useRagIndex'
import { useFileSearchResults } from './api'
import { useTranslation } from 'react-i18next'
import { ShortText, Subject } from '@mui/icons-material'
import { useState } from 'react'

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
  const { data: results, isSuccess: isResultsSuccess, error } = useFileSearchResults(fileSearchResult.id)
  const { t } = useTranslation()
  const [sourceModalOpen, setSourceModalOpen] = useState<boolean>(false)
  const isExpired = error?.status === 404

  return (
    <Box>
      <Box
        gap={1}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          pl: 2,
        }}
      >
        <Typography>{t('chat:searchTerms')}</Typography>
        {fileSearchResult.queries.map((q, idx) => (
          <Chip
            key={idx}
            label={q}
            sx={{
              width: 'fit-content',
              padding: 0.4,
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
      {isResultsSuccess && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', pl: 2.5 }}>
            {results.map((result, idx) => (
              <FileItemComponent key={idx} fileItem={result} cutOff={true} />
            ))}
          </Box>
        </>
      )}

      {isExpired && <Typography color="error">File search results expired</Typography>}
      <Box sx={{ position: 'sticky', bottom: 0, background: '#FFF', mt: 0.1, pl: 2.5 }}>
        <Button variant="outlined" startIcon={<Subject />} onClick={() => setSourceModalOpen(true)} sx={{ borderRadius: 4, mt: 2, mb: 2 }}>
          Lue lisää
        </Button>
      </Box>
      <SourceModal open={sourceModalOpen} setOpen={setSourceModalOpen} results={results} />
    </Box>
  )
}

const SourceModal = ({ open, setOpen, results }: { open: boolean; setOpen: any; results: any[] | undefined }) => {
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
        <Typography variant="h5">Lähdemateriaalit</Typography>
        {results?.map((result, idx) => <FileItemComponent key={idx} fileItem={result} />)}
      </Box>
      <Box sx={{ position: 'sticky', bottom: 0, background: '#FFF', p: 1 }}>
        <Button variant="outlined" startIcon={<ShortText />} onClick={() => setOpen(false)} sx={{ borderRadius: 4, mt: 2, mb: 2 }}>
          Lue vähemmän
        </Button>
      </Box>
    </Drawer>
  )
}

export const CitationsBox = ({ messages, fileSearchResult }: { messages: Message[]; fileSearchResult?: FileSearchCompletedData }) => {
  const messageCitations = [...messages.map((m) => m.fileSearchResult).filter(Boolean)] as FileSearchCompletedData[]

  if (fileSearchResult && !messageCitations.includes(fileSearchResult)) {
    messageCitations.push(fileSearchResult)
  }

  return (
    <Box sx={{ mr: 2.5 }}>
      {messageCitations.map((c, key) => (
        <MessageFileSearchResult key={key} fileSearchResult={c} />
      ))}
    </Box>
  )
}
