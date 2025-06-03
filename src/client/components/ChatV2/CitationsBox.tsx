import { Box, Paper, Typography } from '@mui/material'
import { FileSearchResult } from '../../../shared/types'
import { Message } from '../../types'
import Markdown from 'react-markdown'

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
  return (
    <Box sx={{ mt: 1 }}>
      <Typography>Searched for:</Typography>
      <Box display="flex" gap={2}>
        {fileSearchResult.queries.map((q, idx) => (
          <Typography variant="body2" key={idx}>
            "{q}"
          </Typography>
        ))}
      </Box>

      {fileSearchResult.results.map((result, key) => (
        <FileItemComponent key={key} fileItem={result} />
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
    <Box p={2}>
      {messageCitations.map((c, index) => (
        <MessageFileSearchResult key={index} fileSearchResult={fileSearchResult} />
      ))}
    </Box>
  )
}
