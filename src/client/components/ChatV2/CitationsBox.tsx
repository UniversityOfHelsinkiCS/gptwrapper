import { Box, Paper, Typography } from '@mui/material'
import { CourseAssistant, FileCitation } from '../../../shared/types'
import { Message } from '../../types'
import { useQuery } from '@tanstack/react-query'
import { useCourseAssistant } from '../../hooks/useCourseAssistant'
import { useParams } from 'react-router-dom'

const useFileCitationText = (citation: FileCitation, vectorStoreId: string) => {
  const { data, ...rest } = useQuery({
    queryKey: ['file-citation-content', vectorStoreId, citation.file_id],
    queryFn: async () => {
      const response = await fetch(`/api/files/${vectorStoreId}/${citation.file_id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch file text')
      }
      return response.text()
    },
    retry: false,
  })

  return {
    text: data,
    ...rest,
  }
}

const Citation = ({ citation, courseAssistant }: { citation: FileCitation, courseAssistant: CourseAssistant }) => {
  const { text, isLoading, error } = useFileCitationText(citation, courseAssistant.vector_store_id)

  return (
    <Box>
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
        <Typography variant="body2">{text}</Typography>
      )}
    </Box>
  )
}

const MessageCitations = ({ citations, courseAssistant }: { citations: FileCitation[]; courseAssistant: CourseAssistant }) => {
  return (
    <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'gray' }}>
      Citations:
      {citations.map((citation, index) => (
        <Citation key={index} citation={citation} courseAssistant={courseAssistant} />
      ))}
    </Box>
  )
}

export const CitationsBox = ({ messages, citations }: { messages: Message[]; citations: FileCitation[] }) => {
  const { courseId } = useParams()
  const { courseAssistant, isLoading } = useCourseAssistant(courseId)

  const messageCitations = [...messages.map((message) => (Array.isArray(message.citations) ? message.citations : [])), citations]

  console.log('CitationsBox messageCitations', messageCitations)

  return (
    <Paper>
      <Box sx={{ width: 300, padding: 2 }}>
        {courseAssistant ? (
          messageCitations.map((c, index) => <MessageCitations key={index} citations={c} courseAssistant={courseAssistant} />)
        ) : isLoading ? (
          <Typography variant="body2" color="textSecondary">
            Loading course assistant...
          </Typography>
        ) : (
          <Typography variant="body2" color="error">
            No course assistant found for this course.
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
