import { Box, Paper, Typography } from '@mui/material'
import { FileCitation, RagFileAttributes, RagIndexAttributes } from '../../../shared/types'
import { Message } from '../../types'
import { useQuery } from '@tanstack/react-query'
import Markdown from 'react-markdown'

const useFileCitationText = (citation: FileCitation, ragIndex: RagIndexAttributes) => {
  const ragFileId = ragIndex?.ragFiles?.find((file) => file.filename === citation.filename)?.id

  const { data, ...rest } = useQuery<RagFileAttributes & { fileContent: string }>({
    queryKey: ['file-citation-content', ragIndex.id, citation.filename],
    queryFn: async () => {
      const response = await fetch(`/api/rag/indices/${ragIndex.id}/files/${ragFileId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch file text')
      }
      return response.json()
    },
    retry: false,
    enabled: !!ragFileId,
  })

  return {
    ragFile: data,
    ...rest,
  }
}

const Citation = ({ citation, ragIndex }: { citation: FileCitation; ragIndex: RagIndexAttributes }) => {
  const { ragFile, isLoading, error } = useFileCitationText(citation, ragIndex)

  const contentAtIdx = ragFile?.fileContent?.substring(citation.index, citation.index + 800) || ''

  return (
    <Box sx={{ mb: 2, pl: 1, borderLeft: '2px solid #ccc' }}>
      <Typography variant="body2" color="textSecondary">
        {citation.filename} (Index: {citation.index})
      </Typography>
      {isLoading ? (
        <Typography variant="body2" color="textSecondary">
          Loading citation text...
        </Typography>
      ) : error ? (
        <Typography variant="body2" color="error">
          Error loading citation text: {error.message}
        </Typography>
      ) : (
        ragFile && <Markdown>{contentAtIdx}</Markdown>
      )}
    </Box>
  )
}

const MessageCitations = ({ citations, ragIndex }: { citations: FileCitation[]; ragIndex: RagIndexAttributes }) => {
  return (
    <Box sx={{ mt: 1 }}>
      {citations.map((citation, index) => (
        <Citation key={index} citation={citation} ragIndex={ragIndex} />
      ))}
    </Box>
  )
}

export const CitationsBox = ({ messages, citations, ragIndex }: { messages: Message[]; citations: FileCitation[]; ragIndex: RagIndexAttributes }) => {
  const messageCitations = [...messages.map((message) => (Array.isArray(message.citations) ? message.citations : [])), citations]

  return (
    <Paper>
      <Box sx={{ width: 400, padding: 2 }}>
        {messageCitations.map((c, index) => (
          <MessageCitations key={index} citations={c} ragIndex={ragIndex} />
        ))}
      </Box>
    </Paper>
  )
}
