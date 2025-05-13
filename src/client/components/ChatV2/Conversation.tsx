import { Box } from '@mui/material'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MessageItem = ({ message }: { message: Message }) => (
  <Box>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
  </Box>
)

export const Conversation = ({ messages }: { messages: Message[] }) => (
  <Box>
    {messages.map((message, idx) => (
      <MessageItem key={idx} message={message} />
    ))}
  </Box>
)
