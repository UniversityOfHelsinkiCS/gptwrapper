import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileSearchResult } from '../../../shared/types'
import { ConversationSplash } from './generics/ConversationSplash'
import AttachFileIcon from '@mui/icons-material/AttachFile'

const dotStyle = (delay: number) => ({
  width: 4,
  height: 4,
  margin: '0 4px',
  borderRadius: '50%',
  backgroundColor: '#666',
  animation: 'bounceWave 1.2s infinite',
  animationDelay: `${delay}s`,
})

export const LoadingMessage = ({ expandedNodeHeight }: { expandedNodeHeight: number }) => (
  <div
    className="message-role-assistant"
    style={{
      height: expandedNodeHeight,
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

const MessageItem = ({
  message,
  isLastAssistantNode,
  expandedNodeHeight,
  hasRagIndex,
}: {
  message: Message
  isLastAssistantNode: boolean
  expandedNodeHeight: number
  hasRagIndex: boolean
}) => {
  const { courseId } = useParams()
  // TÄMÄ on kaikki hämäystä demonstroidakseen lähdeviittaukset kurssichatissa
  const hasAnnotations_Leikisti = isLastAssistantNode && courseId && hasRagIndex

  return (
    <Box
      className={`message-role-${message.role}`}
      sx={{
        minHeight: isLastAssistantNode ? expandedNodeHeight : 'auto',
        alignSelf: message.role === 'assistant' ? 'flex-start' : 'flex-end',
      }}
    >
      <Box
        sx={{
          backgroundColor: message.role === 'assistant' ? 'transparent' : '#efefef',
          padding: message.role === 'assistant' ? '0 1.5rem' : '0.175rem 1.5rem',
          marginLeft: message.role === 'assistant' ? 0 : 20,
          borderRadius: message.role === 'assistant' ? '5px' : '0.6rem',
          boxShadow: message.role === 'assistant' ? 'none' : '0px 2px 2px rgba(0, 0, 0, 0.2)',
          borderLeft: hasAnnotations_Leikisti ? '5px solid #3f51b5' : 'none',
          whiteSpace: message.role === 'assistant' ? 'normal' : 'pre-wrap', // 🧠 This preserves formatting
          wordBreak: 'break-word',
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>

        {message.attachements && (
          <Typography variant="body2" sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: 0.7, pb: 2 }}>
            <AttachFileIcon fontSize="small" />
            {message.attachements}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export const Conversation = ({
  conversationRef,
  expandedNodeHeight,
  messages,
  completion,
  isCompletionDone,
  fileSearchResult,
  hasRagIndex,
}: {
  conversationRef: React.RefObject<HTMLElement>
  expandedNodeHeight: number
  messages: Message[]
  completion: string
  isCompletionDone: boolean
  fileSearchResult: FileSearchResult
  hasRagIndex: boolean
}) => (
  <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2.5rem' }} ref={conversationRef}>
    {messages.length === 0 && <ConversationSplash />}
    {messages.map((message, idx) => {
      const isLastAssistantNode = idx === messages.length - 1 && message.role === 'assistant'

      return <MessageItem key={idx} message={message} isLastAssistantNode={isLastAssistantNode} expandedNodeHeight={expandedNodeHeight} hasRagIndex={hasRagIndex} />
    })}
    {!isCompletionDone &&
      messages.length > 0 &&
      (completion.length > 0 ? (
        <MessageItem
          message={{ role: 'assistant', content: completion, fileSearchResult }}
          isLastAssistantNode={true}
          expandedNodeHeight={expandedNodeHeight}
          hasRagIndex={hasRagIndex}
        />
      ) : (
        <LoadingMessage expandedNodeHeight={expandedNodeHeight} />
      ))}
  </Box>
)
