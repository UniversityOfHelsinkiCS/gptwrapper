import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Paper, Typography } from '@mui/material'
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
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { BlueButton } from './generics/Buttons'

const UserMessage = ({ content, attachements }: { content: string; attachements?: string }) => (
  <Box
    sx={{
      backgroundColor: '#efefef',
      padding: '1rem 1.5rem',
      marginLeft: 20,
      borderRadius: '1rem 0.0rem 1rem 1rem',
      boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.2)',
      whiteSpace: 'pre-wrap', // 🧠 This preserves formatting
      wordBreak: 'break-word',
      minWidth: { xs: 300, md: 'fit-content' },
      maxWidth: { xs: 400, md: 'fit-content' },
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

  const handleAnnotations = (fileSearchResult: FileSearchCompletedData) => {
    setActiveFileSearchResult(fileSearchResult)
    setShowAnnotations(true)
  }

  return (
    <Box
      id="assistant-message"
      sx={{
        overflowX: 'auto',
        position: 'relative',
        '&:hover .copy-message-button': {
          opacity: 0.8,
        },
      }}
    >
      <Box
        className="copy-message-button"
        sx={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          opacity: { xs: 0.5, sm: 0 },
          transition: 'opacity 0.2s ease-in-out',
          background: '#fcfcfcff',
          borderRadius: 4,
        }}
      >
        <CopyToClipboardButton id={`assistant-message`} copied={content} />
      </Box>
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
            data-testId="file-search-sources"
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              fontStyle: 'italic',
              maxWidth: 'fit-content',
              opacity: '0.85',
              mt: 3,
              cursor: 'pointer',
              padding: '0.6rem',
              borderRadius: '0.6rem',
            }}
            onClick={() => {
              handleAnnotations(fileSearchResult)
            }}
          >
            <FormatQuoteIcon sx={{ fontSize: '2rem' }} />
            <Box sx={{ minWidth: 0, mt: { xs: 0.5, md: 0 } }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    mr: 2,
                    wordBreak: 'break-all',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {`${t('chat:displaySources')}: `}

                  <em>{fileSearchResult?.searchedFiles?.join('\r\n')}</em>
                </Typography>
              </Box>
            </Box>
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
        data-testid="assistant-message"
        data-sentry-mask
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
      <Box data-sentry-mask data-testid="user-message" sx={{ alignSelf: 'flex-end' }}>
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
          height: 'auto',
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
      {!reminderSeen && !isStreaming && messages.length > 15 && (
        <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'row', gap: 2, fontStyle: 'italic', alignItems: 'center', padding: 2 }}>
          <Typography>{t('chat:emptyReminder')}</Typography>
          <BlueButton sx={{ marginLeft: 'auto' }} onClick={() => setReminderSeen(true)}>
            OK
          </BlueButton>
        </Paper>
      )}
    </>
  )
}
