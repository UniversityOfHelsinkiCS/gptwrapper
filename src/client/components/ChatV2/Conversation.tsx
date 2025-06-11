import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github-dark.css' // pick your favorite theme
import { FileSearchResult } from '../../../shared/types'
import { ConversationSplash } from './generics/ConversationSplash'
import AttachFileIcon from '@mui/icons-material/AttachFile'

import { LoadingMessage } from './generics/LoadingMessage'

const UserMessage = ({
  content,
  attachements,
  isLastAssistantNode,
  expandedNodeHeight,
}: {
  content: string
  attachements: string
  isLastAssistantNode: boolean
  expandedNodeHeight: number
}) => (
  <Box
    className={`message-role-user`}
    sx={{
      minHeight: isLastAssistantNode ? expandedNodeHeight : 'auto',
      alignSelf: 'flex-end',
    }}
  >
    <Box
      sx={{
        backgroundColor: '#efefef',
        padding: '1.5rem 2rem',
        marginLeft: 20,
        borderRadius: '0.6rem',
        boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.2)',
        whiteSpace: 'pre-wrap', // 🧠 This preserves formatting
        wordBreak: 'break-word',
      }}
    >
      {content}

      {attachements && (
        <Typography variant="body2" sx={{ display: 'flex', gap: 0.5, alignItems: 'center', opacity: 0.7, marginTop: '1rem' }}>
          <AttachFileIcon fontSize="small" />
          {attachements}
        </Typography>
      )}
    </Box>
  </Box>
)

const AssistantMessage = ({
  content,
  hasRagIndex,
  hasAnnotations,
  isLastAssistantNode,
  expandedNodeHeight,
}: {
  content: string
  hasRagIndex: boolean
  hasAnnotations: boolean
  isLastAssistantNode: boolean
  expandedNodeHeight: number
}) => (
  <Box
    className={`message-role-assistant`}
    sx={{
      minHeight: isLastAssistantNode ? expandedNodeHeight : 'auto',
      alignSelf: 'flex-start',
    }}
  >
    <Box
      sx={{
        padding: '0 1.5rem',
        borderRadius: '5px',
        borderLeft: hasAnnotations ? '5px solid #3f51b5' : 'none',
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  </Box>
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

  if (message.role === 'assistant') {
    return (
      <AssistantMessage
        content={message.content}
        hasAnnotations={hasAnnotations_Leikisti}
        hasRagIndex={hasRagIndex}
        isLastAssistantNode={isLastAssistantNode}
        expandedNodeHeight={expandedNodeHeight}
      />
    )
  } else {
    return <UserMessage content={message.content} attachements={message.attachements} isLastAssistantNode={isLastAssistantNode} expandedNodeHeight={expandedNodeHeight} />
  }
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
