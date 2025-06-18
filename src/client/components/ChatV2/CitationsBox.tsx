import { Box, Paper, Typography } from '@mui/material'
import type { FileSearchResult } from '../../../shared/types'
import type { Message } from '../../types'
import Markdown from 'react-markdown'
import { useRagIndex } from '../../hooks/useRagIndex'

type FileItem = FileSearchResult['results'][number]

const FileItemComponent = ({ fileItem }: { fileItem: FileItem }) => {
  return (
    <Paper sx={{ p: 1, mt: 2 }}>
      <Typography variant="body2" color="textSecondary">
        {fileItem.filename} (score: {fileItem.score})
      </Typography>
      <Markdown>{fileItem.text}</Markdown>
    </Paper>
  )
}

const MessageFileSearchResult = ({ fileSearchResult }: { fileSearchResult: FileSearchResult }) => {
  const { ragIndex, isSuccess } = useRagIndex(fileSearchResult.ragIndexId)

  return (
    <Box sx={{ mt: 1 }}>
      <Typography>{isSuccess ? ragIndex.metadata.name : '...'}</Typography>
      <Typography>Searched for:</Typography>
      <Box display="flex" gap={2}>
        {fileSearchResult.queries.map((q, idx) => (
          <Typography variant="body2" key={idx}>
            "{q}"
          </Typography>
        ))}
      </Box>

      {fileSearchResult.results.map((result, idx) => (
        <FileItemComponent key={idx} fileItem={result} />
      ))}
    </Box>
  )
}

export const CitationsBox = ({ messages, fileSearchResult }: { messages: Message[]; fileSearchResult?: FileSearchResult }) => {
  const messageCitations = [...messages.map((m) => m.fileSearchResult).filter(Boolean)]
  if (fileSearchResult) {
    messageCitations.push(fileSearchResult)
  }

  return (
    <Box>
      {messageCitations.map((c, key) => (
        <MessageFileSearchResult key={key} fileSearchResult={c} />
      ))}
    </Box>
  )
}
