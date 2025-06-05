import { Box, Typography } from '@mui/material'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileSearchResult } from '../../../shared/types'
import { PöhinäLogo } from './generics/PohinaLogo'

const MessageItem = ({ message }: { message: Message }) => (
  <Box
    sx={{
      alignSelf: message.role === 'assistant' ? 'flex-start' : 'flex-end',
      backgroundColor: message.role === 'assistant' ? 'transparent' : '#efefef',
      padding: '0 1.5rem',
      borderRadius: '0.6rem',
    }}
  >
    <Typography>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
    </Typography>
  </Box>
)

export const Conversation = ({ messages, completion, fileSearchResult }: { messages: Message[]; completion: string; fileSearchResult: FileSearchResult }) => (
  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, width: '70%', minWidth: 600, margin: 'auto', paddingBottom: '5rem' }}>
    {messages.length === 0 && <PöhinäLogo />}
    {messages.map((message, idx) => (
      <MessageItem key={idx} message={message} />
    ))}
    {completion && <MessageItem message={{ role: 'assistant', content: completion, fileSearchResult }} />}
  </Box>
)
