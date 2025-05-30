import { Box, Paper, Typography } from '@mui/material'
import { FileCitation } from '../../../shared/types'
import { Message } from '../../types'

const Citation = ({ citation }: { citation: FileCitation }) => {
  return (
    <Box>
      <Typography variant="body2" color="textSecondary">
        {citation.filename} (Index: {citation.index})
      </Typography>
    </Box>
  )
}

const MessageCitations = ({ citations }: { citations: FileCitation[] }) => {
  return (
    <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'gray' }}>
      Citations:
      {citations.map((citation, index) => (
        <Citation key={index} citation={citation} />
      ))}
    </Box>
  )
}

export const CitationsBox = ({ messages, citations }: { messages: Message[]; citations: FileCitation[] }) => {
  const messageCitations = [...messages.map((message) => (Array.isArray(message.citations) ? message.citations : [])), citations]

  console.log('CitationsBox messageCitations', messageCitations)

  return (
    <Paper>
      <Box sx={{ width: 300, padding: 2 }}>
        {messageCitations.map((c, index) => (
          <MessageCitations key={index} citations={c} />
        ))}
      </Box>
    </Paper>
  )
}
