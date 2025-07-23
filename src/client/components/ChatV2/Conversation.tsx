import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
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
import CopyToClipboardButton from '../Chat/CopyToClipboardButton'
import { t } from 'i18next'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { useState } from 'react'
import { PriorityHigh } from '@mui/icons-material'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { OutlineButtonBlack } from './generics/Buttons'

const UserMessage = ({ content, attachements }: { content: string; attachements?: string }) => (
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
)

const AssistantMessage = ({
  content,
  error,
  fileSearchResult,
  setActiveFileSearchResult,
  setShowAnnotations,
}: {
  content: string
  error?: string
  fileSearchResult?: FileSearchCompletedData
  setActiveFileSearchResult: (data: FileSearchCompletedData) => void
  setShowAnnotations: (show: boolean) => void
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
      '\\epsilon_0': '\\text{\\ensuremath{\\epsilon_0}}',
      '\\mu_0': '\\text{\\ensuremath{\\mu_0}}',
      '\\div': '\\operatorname{div}',
      '\\curl': '\\operatorname{curl}',
      '\\grad': '\\operatorname{grad}',
      '\\laplacian': '\\nabla^2',
      '\\dd': '\\mathrm{d}#1',
      '\\pd': '\\partial #1',
      '\\vb': '\\mathbf{#1}',
      '\\vu': '\\hat{\\mathbf{#1}}',
      '\\aprx': '\\approx',
      '\\bra': '\\left\\langle#1\\right|',
      '\\ket': '\\left|#1\\right\\rangle',
      '\\braket': '\\left\\langle#1\\mid#2\\right\\rangle',
      '\\oprod': '\\left|#1\\right\\rangle\\left\\langle#2\\right|',
      '\\slashed': '\\text{{#1\\mkern-10mu/}}',
    },
    extensions: ['mhchem.js'],
    output: 'htmlAndMathml',
    errorColor: '#cc0000',
    throwOnError: false,
    strict: false, // disables logging katex warnings/errors – if debugging, turn these two on
  }
  let codeCount = 0
  const [isHovering, setIsHovering] = useState<boolean>(false)

  const handleAnnotations = (fileSearchResult: FileSearchCompletedData) => {
    setActiveFileSearchResult(fileSearchResult)
    setShowAnnotations(true)
  }

  return (
    <Box
      sx={{
        overflowX: 'auto',
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

            if (match) {
              const codeBlockId = `codeBlock-${++codeCount}`

              return (
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
                  <Box sx={{ position: 'relative' }}>
                    {/* @ts-ignore */}
                    <SyntaxHighlighter
                      {...rest}
                      PreTag="div"
                      children={String(children)}
                      language={language}
                      customStyle={{
                        padding: '1rem',
                        margin: 0,
                        fontSize: '15px',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                      style={oneDark}
                      id={codeBlockId}
                    />
                    <CopyToClipboardButton
                      id={codeBlockId}
                      copied={String(children)}
                      iconColor="#FFF"
                      buttonStyle={{ position: 'absolute', top: '8px', right: '8px' }}
                    />
                  </Box>
                </Box>
              )
            } else {
              return (
                <code {...rest} className={className}>
                  {children}
                </code>
              )
            }
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
      {error && (
        <Box>
          <Typography variant="body1" fontStyle="italic" color="#cc0000">{`\n\n ${error}`}</Typography>
        </Box>
      )}
      {fileSearchResult?.status === 'completed' && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontStyle: 'italic',
              opacity: '0.85',
              mt: 3,
              width: 'fit-content',
              backgroundColor: isHovering ? '#efefef' : 'transparent',
              transition: 'background-color 0.1s ease-in-out',
              cursor: 'pointer',
              padding: '0.6rem',
              borderRadius: '0.6rem',
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => {
              handleAnnotations(fileSearchResult)
            }}
          >
            <FormatQuoteIcon sx={{ fontSize: '2rem' }} />
            <Typography variant="body2" sx={{ whiteSpace: 'pre', mr: 3 }}>
              {`${t('chat:displaySources')}: `}
              <em>{fileSearchResult?.searchedFiles?.join('\r\n')}</em>
            </Typography>
          </Box>
        </>
      )}
    </Box>
  )
}

const MessageItem = ({
  message,
  isLastAssistantNode,
  expandedNodeHeight,
  setActiveFileSearchResult,
  setShowAnnotations,
}: {
  message: Message
  isLastAssistantNode: boolean
  expandedNodeHeight: number
  setActiveFileSearchResult: (data: FileSearchCompletedData) => void
  setShowAnnotations: (show: boolean) => void
}) => {
  if (message.role === 'assistant') {
    return (
      <Box
        className={`message-role-assistant`}
        data-testid="assistant-message"
        sx={{
          minHeight: isLastAssistantNode ? expandedNodeHeight : 'auto',
        }}
      >
        <AssistantMessage
          content={message.content}
          error={message.error}
          fileSearchResult={message.fileSearchResult}
          setActiveFileSearchResult={setActiveFileSearchResult}
          setShowAnnotations={setShowAnnotations}
        />
      </Box>
    )
  } else {
    return (
      <Box className="message-role-user" data-testid="user-message" sx={{ alignSelf: 'flex-end' }}>
        <UserMessage content={message.content} attachements={message.attachements ?? ''} />
      </Box>
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
  isFileSearching,
  isStreaming,
  setActiveFileSearchResult,
  setShowAnnotations,
}: {
  courseName?: string
  courseDate?: ActivityPeriod
  conversationRef: React.RefObject<HTMLElement>
  expandedNodeHeight: number
  messages: Message[]
  completion: string
  isFileSearching: boolean
  isStreaming: boolean
  setActiveFileSearchResult: (data: FileSearchCompletedData) => void
  setShowAnnotations: (show: boolean) => void
}) => {
  const [reminderSeen, setReminderSeen] = useLocalStorageState<boolean>('reminderSeen', false)

  return (
    <>
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
            <MessageItem
              key={idx}
              message={message}
              isLastAssistantNode={isLastAssistantNode}
              expandedNodeHeight={expandedNodeHeight}
              setActiveFileSearchResult={setActiveFileSearchResult}
              setShowAnnotations={setShowAnnotations}
            />
          )
        })}
        {isStreaming &&
          messages.length > 0 &&
          (completion.length > 0 ? (
            <MessageItem
              message={{ role: 'assistant', content: completion }}
              isLastAssistantNode={true}
              expandedNodeHeight={expandedNodeHeight}
              setActiveFileSearchResult={setActiveFileSearchResult}
              setShowAnnotations={setShowAnnotations}
            />
          ) : (
            <LoadingMessage expandedNodeHeight={expandedNodeHeight} isFileSearching={isFileSearching} />
          ))}
      </Box>
      {!reminderSeen && !isStreaming && messages.length > 10 && (
        <Box sx={{ display: 'flex', gap: 2, justifyItems: 'center', fontStyle: 'italic' }}>
          <PriorityHigh sx={{ mt: 1 }} />
          <Typography>{t('chat:emptyReminder')}</Typography>
          <OutlineButtonBlack onClick={() => setReminderSeen(true)}>OK</OutlineButtonBlack>
        </Box>
      )}
    </>
  )
}
