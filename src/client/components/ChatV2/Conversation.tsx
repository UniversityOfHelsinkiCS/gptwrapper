import { Box, Paper } from '@mui/material'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Assistant } from '@mui/icons-material'

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

const PöhinäLogo = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '40rem',
      transition: 'opacity 0.6s, transform 0.6s',
      opacity: 1,
      transform: 'scale(1)',
      animation: 'fadeInScale 0.6s ease',
      '@keyframes fadeInScale': {
        from: { opacity: 0, transform: 'scale(0.8)' },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}
  >
    <Assistant sx={{ fontSize: 160, color: 'toskaPrimary.main' }} />
  </Box>
)

export const Conversation = ({
  messages,
  completion,
}: {
  messages: Message[]
  completion: string
}) => (
  <Box sx={{ flex: 1, overflowY: 'auto' }}>
    {messages.map((message, idx) => (
      <MessageItem key={idx} message={message} />
    ))}
    {completion && (
      <MessageItem message={{ role: 'assistant', content: completion }} />
    )}
    {messages.length === 0 && <PöhinäLogo />}
  </Box>
)
