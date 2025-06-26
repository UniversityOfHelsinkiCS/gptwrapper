import { Box, Paper, Typography } from '@mui/material'
import type { FileSearchCompletedData, FileSearchResultData } from '../../../shared/types'
import type { Message } from '../../types'
import Markdown from 'react-markdown'
import { useRagIndex } from '../../hooks/useRagIndex'
import { useFileSearchResults } from './api'

const FileItemComponent = ({ fileItem }: { fileItem: FileSearchResultData }) => {
  return (
    <Paper sx={{ p: 1, mt: 2 }}>
      <Typography variant="body2" color="textSecondary">
        {fileItem.filename} (score: {fileItem.score})
      </Typography>
      <Markdown>{fileItem.text}</Markdown>
    </Paper>
  )
}

const MessageFileSearchResult = ({ fileSearchResult }: { fileSearchResult: FileSearchCompletedData }) => {
  const { data: ragIndex, isSuccess } = useRagIndex(fileSearchResult.ragIndexId)
  const { data: results, isSuccess: isResultsSuccess, error } = useFileSearchResults(fileSearchResult.id)
  const isExpired = error?.status === 404

  return (
    <Box sx={{ mt: 1 }}>
      <Typography>{isSuccess ? ragIndex.metadata.name : '...'}</Typography>
      <Typography>Searched for:</Typography>
      <Box display="flex" gap={2}>
        {fileSearchResult.queries.map((q) => (
          <Typography variant="body2" key={q}>
            "{q}"
          </Typography>
        ))}
      </Box>

      {isResultsSuccess && results.map((result, idx) => <FileItemComponent key={idx} fileItem={result} />)}
      {isExpired && <Typography color="error">File search results expired</Typography>}
    </Box>
  )
}

export const CitationsBox = ({ messages, fileSearchResult }: { messages: Message[]; fileSearchResult?: FileSearchCompletedData }) => {
  const messageCitations = [...messages.map((m) => m.fileSearchResult).filter(Boolean)] as FileSearchCompletedData[]
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
