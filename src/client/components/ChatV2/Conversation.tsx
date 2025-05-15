import { Box, Paper } from '@mui/material'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MessageItem = ({ message }: { message: Message }) => (
  <Paper
    elevation={3}
    sx={{
      my: '1rem',
      ml: message.role === 'assistant' ? '0' : '2rem',
      mr: message.role === 'assistant' ? '2rem' : '0',
      p: '1rem',
      backgroundColor: message.role === 'user' ? '#ffffff' : '#e0f7fa',
      borderRadius:
        message.role === 'assistant' ? '0 1rem 1rem 1rem' : '1rem 0 1rem 1rem',
    }}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
  </Paper>
)

export const Conversation = ({
  messages,
  completion,
}: {
  messages: Message[]
  completion: string
}) => (
  <Box>
    {messages.map((message, idx) => (
      <MessageItem key={idx} message={message} />
    ))}
    {completion && (
      <MessageItem message={{ role: 'assistant', content: completion }} />
    )}
  </Box>
)
