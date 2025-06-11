import { Box, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'
import { Message } from '../../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileSearchResult } from '../../../shared/types'
import { ConversationSplash } from './generics/ConversationSplash'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, materialDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

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
    }}
  >
    <Box
      sx={{
        padding: '0 1.5rem',
        borderRadius: '5px',
        width: '100%',
        borderLeft: hasAnnotations ? '5px solid #3f51b5' : 'none',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props
            const match = /language-(\w+)/.exec(className || '')
            const language = match?.[1] || 'plaintext' // safe fallback
            return match ? (
              <Box sx={{ borderRadius: '0.5rem', overflow: 'hidden' }}>
                <Typography sx={{ opacity: 1, fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: '#efefef' }}>{language}</Typography>
                {/* @ts-ignore */}
                <SyntaxHighlighter
                  {...rest}
                  PreTag="div"
                  children={String(children).replace(/\n$/, '')}
                  language={language}
                  style={materialDark}
                  customStyle={{ padding: '1rem', margin: 0 }}
                />

              </Box>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
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
