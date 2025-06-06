import { Box, Typography } from '@mui/material'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileSearchResult } from '../../../shared/types'
import { ConversationSplash } from './generics/ConversationSplash'

const dotStyle = (delay: number) => ({
  width: 4,
  height: 4,
  margin: '0 4px',
  borderRadius: '50%',
  backgroundColor: '#666',
  animation: 'bounceWave 1.2s infinite',
  animationDelay: `${delay}s`,
})

export const MessageLoading = ({ lastNodeHeight }: { lastNodeHeight: number }) => (
  <div
    className="message-role-assistant"
    style={{
      height: lastNodeHeight,
      display: 'flex',
      padding: '2rem',
    }}
  >
    <style>
      {`
        @keyframes bounceWave {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }
      `}
    </style>
    <div style={dotStyle(0)} />
    <div style={dotStyle(0.15)} />
    <div style={dotStyle(0.3)} />
  </div>
)

const MessageItem = ({ message, isLastAssistantNode, lastNodeHeight }: { message: Message; isLastAssistantNode: boolean; lastNodeHeight: number }) => (
  <Box
    className={`message-role-${message.role}`}
    sx={{
      alignSelf: message.role === 'assistant' ? 'flex-start' : 'flex-end',
      backgroundColor: message.role === 'assistant' ? 'transparent' : '#efefef',
      padding: '0 1.5rem',
      borderRadius: '0.6rem',
      height: isLastAssistantNode ? lastNodeHeight : 'auto',
    }}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
  </Box>
)

export const Conversation = ({
  conversationRef,
  lastNodeHeight,
  messages,
  completion,
  isCompletionDone,
  fileSearchResult,
}: {
  conversationRef: React.RefObject<HTMLElement>
  lastNodeHeight: number
  messages: Message[]
  completion: string
  isCompletionDone: boolean
  fileSearchResult: FileSearchResult
}) => (
  <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2.5rem' }} ref={conversationRef}>
    {messages.length === 0 && <ConversationSplash />}
    {messages.map((message, idx) => {
      const isLastAssistantNode = idx === messages.length - 1 && message.role === 'assistant'

      return <MessageItem key={idx} message={message} isLastAssistantNode={isLastAssistantNode} lastNodeHeight={lastNodeHeight} />
    })}
    {!isCompletionDone &&
      messages.length > 0 &&
      (completion.length > 0 ? (
        <MessageItem message={{ role: 'assistant', content: completion, fileSearchResult }} isLastAssistantNode={true} lastNodeHeight={lastNodeHeight} />
      ) : (
        <MessageLoading lastNodeHeight={lastNodeHeight} />
      ))}
  </Box>
)
