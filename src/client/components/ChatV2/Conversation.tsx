import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Paper, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import { PrismAsync as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { LoadingMessage } from './general/LoadingMessage'
import { preprocessMath } from './util'
import 'katex/dist/katex.min.css'
import 'katex/dist/contrib/mhchem'
import { ArrowRight } from '@mui/icons-material'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { t } from 'i18next'
import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssistantMessage, ChatMessage, MessageGenerationInfo, ToolCallResultEvent, ToolCallStatusEvent, UserMessage } from '../../../shared/chat'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import CopyToClipboardButton from './CopyToClipboardButton'
import { BlueButton } from './general/Buttons'

const UserMessageItem = ({ message }: { message: UserMessage }) => (
  <Box
    sx={{
      backgroundColor: '#efefef',
      padding: '1rem 1.5rem',
      marginLeft: 20,
      borderRadius: '1rem 0.0rem 1rem 1rem',
      boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.2)',
      whiteSpace: 'pre-wrap',
      maxWidth: { xs: '90vw', sm: '60vw', md: '50vw' },
      // minWidth: { xs: '70vw', sm: 0 },
      wordBreak: 'break-word',
      width: 'fit-content',
    }}
  >
    {message.content}

    {message.attachments && (
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
        {message.attachments}
      </Typography>
    )}
  </Box>
)

const ToolResult = ({ toolResult, handleToolResult }: { toolResult: ToolCallResultEvent; handleToolResult: (toolResult: ToolCallResultEvent) => void }) => {
  const sources = useMemo(() => Array.from(new Set<string>(toolResult.result.files.map((file) => file.fileName)).values()).join(', '), [])
  return (
    <Box
      data-testid="file-search-sources"
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
        handleToolResult(toolResult)
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
            {`${t('chat:displaySources', { query: toolResult.input.query })}: `}

            <em>{sources}</em>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

const AssistantMessageInfo = ({ message }: { message: AssistantMessage }) => {
  const { t } = useTranslation()
  if (!message.generationInfo) return null

  const title =
    message.generationInfo.promptInfo.type === 'saved'
      ? `${message.generationInfo.promptInfo.name} (${message.generationInfo.model})`
      : `${message.generationInfo.model}` + (message.generationInfo.promptInfo.systemMessage.length > 0 ? ` (${t('chat:customPrompt')})` : '')

  return (
    <Box sx={{ display: 'flex', opacity: 0.7, alignItems: 'center' }}>
      <ArrowRight fontSize="small" />
      <Typography fontSize="small">{title}</Typography>
    </Box>
  )
}

const AssistantMessageItem = ({ message, setActiveToolResult }: { message: AssistantMessage; setActiveToolResult: (data: ToolCallResultEvent) => void }) => {
  const processedContent = preprocessMath(message.content)
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

  const handleToolResult = (toolResult: ToolCallResultEvent) => {
    setActiveToolResult(toolResult)
  }

  const msgId = useId()

  return (
    <Box
      data-testid="assistant-message"
      id={msgId}
      sx={{
        position: 'relative',
        pr: 4,
        wordBreak: 'break-word',
        '&:hover .copy-message-button': {
          opacity: 0.7,
        },
      }}
    >
      <Box
        className="copy-message-button"
        sx={{
          position: 'absolute',
          right: 10,
          bottom: -15,
          opacity: { xs: 0.7, md: 0 },
          transition: 'opacity 0.2s ease-in-out',
          background: '#fcfcfcff',
          borderRadius: 4,
        }}
      >
        <CopyToClipboardButton id={msgId} copied={message.content} />
      </Box>
      <AssistantMessageInfo message={message} />
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
                      buttonStyle={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                      }}
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
      {message.error && (
        <Box>
          <Typography variant="body1" fontStyle="italic" color="#cc0000">{`\n\n ${message.error}`}</Typography>
        </Box>
      )}
      {Object.values(message.toolCalls ?? {}).map((toolResult) => (
        <ToolResult key={toolResult.callId} toolResult={toolResult} handleToolResult={handleToolResult} />
      ))}
    </Box>
  )
}

export const MessageItem = ({ message, setActiveToolResult }: { message: ChatMessage; setActiveToolResult: (data: ToolCallResultEvent) => void }) => {
  if (message.role === 'assistant') {
    return (
      <Box
        data-sentry-mask
        sx={{
          height: 'auto',
        }}
      >
        <AssistantMessageItem message={message} setActiveToolResult={setActiveToolResult} />
      </Box>
    )
  } else {
    return (
      <Box data-sentry-mask data-testid="user-message" sx={{ alignSelf: 'flex-end' }}>
        <UserMessageItem message={message} />
      </Box>
    )
  }
}

export const Conversation = ({
  messages,
  completion,
  generationInfo,
  toolCalls,
  isStreaming,
  setActiveToolResult,
  initial,
}: {
  messages: ChatMessage[]
  completion: string
  generationInfo?: MessageGenerationInfo
  toolCalls: { [callId: string]: ToolCallStatusEvent }
  isStreaming: boolean
  setActiveToolResult: (data: ToolCallResultEvent) => void
  initial?: React.ReactElement
}) => {
  const [reminderSeen, setReminderSeen] = useLocalStorageState<boolean>('reminderSeen', false)

  return (
    <>
      <Box
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
          padding: '1rem 0',
          justifyContent: messages.length === 0 ? 'center' : 'flex-start',
        }}
      >
        {messages.length === 0 && initial}
        {messages.map((message, idx) => {
          return <MessageItem key={idx} message={message} setActiveToolResult={setActiveToolResult} />
        })}

        {isStreaming &&
          messages.length > 0 &&
          (completion.length > 0 ? (
            <MessageItem
              message={{
                role: 'assistant',
                content: completion,
                generationInfo,
              }}
              setActiveToolResult={setActiveToolResult}
            />
          ) : (
            <LoadingMessage toolCalls={toolCalls} />
          ))}
      </Box>
      {!reminderSeen && !isStreaming && messages.length > 15 && (
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            fontStyle: 'italic',
            alignItems: 'center',
            padding: 2,
          }}
        >
          <Typography>{t('chat:emptyReminder')}</Typography>
          <BlueButton sx={{ marginLeft: 'auto' }} onClick={() => setReminderSeen(true)}>
            OK
          </BlueButton>
        </Paper>
      )}

      {/* Buffer element */}
      <Box height="2rem" />
    </>
  )
}
