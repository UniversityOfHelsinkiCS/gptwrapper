import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import { useParams } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { FileSearchCompletedData } from '../../../shared/types'
import type { ActivityPeriod, Message } from '../../types'
import { ConversationSplash } from './generics/ConversationSplash'
import { LoadingMessage } from './generics/LoadingMessage'
import { preprocessMath } from './util'
import 'katex/dist/katex.min.css'
import 'katex/dist/contrib/mhchem'

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
        <Typography
          variant="body2"
          sx={{
            display: 'flex',
            gap: 0.5,
            alignItems: 'center',
            opacity: 0.7,
            marginTop: '1rem',
          }}
        >
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
}) => {
  const processedContent = preprocessMath(content)
  const katexOptions = {
    macros: {
      '\\abs': '\\left|#1\\right|',
      '\\norm': '\\left\\|#1\\right\\|',
      '\\R': '\\mathbb{R}',
      '\\C': '\\mathbb{C}',
      '\\N': '\\mathbb{N}',
      '\\Z': '\\mathbb{Z}',
      '\\vec': '\\mathbf{#1}',
      '\\deriv': '\\frac{d#1}{d#2}',
      '\\pdv': '\\frac{\\partial#1}{\\partial#2}',
      '\\set': '\\left\\{#1\\right\\}',
      '\\lr': '\\left(#1\\right)',
      '\\T': '^{\\mathsf{T}}',
      '\\defeq': '\\coloneqq',
    },
    extensions: ['mhchem.js'],
    output: 'htmlAndMathml',
    throwOnError: false, // If math is badly formatted, display it in red instead of throwing errors
    errorColor: '#cc0000',
  }

  return (
    <Box className={`message-role-assistant`} sx={{ minHeight: isLastAssistantNode ? expandedNodeHeight : 'auto' }}>
      <Box
        sx={{
          padding: '0 1.5rem',
          borderRadius: '5px',
          overflowX: 'auto',
          borderLeft: hasAnnotations ? '5px solid #3f51b5' : 'none',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
          rehypePlugins={[[rehypeKatex, katexOptions]]}
          components={{
            code(props) {
              const { children, className, node, ...rest } = props
              const match = /language-(\w+)/.exec(className || '')
              const language = match?.[1] || 'plaintext' // safe fallback
              return match ? (
                <Box
                  sx={{
                    borderRadius: '0.5rem',
                    overflowX: 'auto',
                    maxWidth: '100%',
                  }}
                >
                  <Typography
                    sx={{
                      opacity: 1,
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.8rem',
                      backgroundColor: '#efefef',
                    }}
                  >
                    {language}
                  </Typography>
                  {/* @ts-ignore */}
                  <SyntaxHighlighter
                    {...rest}
                    PreTag="div"
                    children={String(children)}
                    language={language}
                    customStyle={{
                      padding: '1rem',
                      margin: 0,
                      fontSize: '16px',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap' /* preserve line breaks but allow wrapping */,
                    }}
                    style={oneDark}
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
          {processedContent}
        </ReactMarkdown>
      </Box>
    </Box>
  )
}

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
    return (
      <UserMessage
        content={message.content}
        attachements={message.attachements}
        isLastAssistantNode={isLastAssistantNode}
        expandedNodeHeight={expandedNodeHeight}
      />
    )
  }
}

export const Conversation = ({
  courseName,
  courseDate,
  conversationRef,
  expandedNodeHeight,
  messages,
  completion,
  isCompletionDone,
  fileSearchResult,
  hasRagIndex,
}: {
  courseName?: string
  courseDate?: ActivityPeriod
  conversationRef: React.RefObject<HTMLElement>
  expandedNodeHeight: number
  messages: Message[]
  completion: string
  isCompletionDone: boolean
  fileSearchResult: FileSearchCompletedData
  hasRagIndex: boolean
}) => (
  <Box
    style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '2.5rem',
      padding: '1rem 0',
      flex: 1,
    }}
    ref={conversationRef}
  >
    {messages.length === 0 && <ConversationSplash courseName={courseName} courseDate={courseDate} />}
    {messages.map((message, idx) => {
      const isLastAssistantNode = idx === messages.length - 1 && message.role === 'assistant'

      return (
        <MessageItem key={idx} message={message} isLastAssistantNode={isLastAssistantNode} expandedNodeHeight={expandedNodeHeight} hasRagIndex={hasRagIndex} />
      )
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
