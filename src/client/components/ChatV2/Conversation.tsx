import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Paper, Typography } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import { PrismAsync as SyntaxHighlighter } from 'react-syntax-highlighter'
import { accessibleOneDark } from './codeTheme'
import { darkModeLinkColors } from '../../theme'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { LoadingMessage } from './general/LoadingMessage'
import { preprocessMath } from './util'
import 'katex/dist/katex.min.css'
import 'katex/dist/contrib/mhchem'
import ArrowRight from '@mui/icons-material/ArrowRight'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { t } from 'i18next'
import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@mui/material'
import {
  readMessageContent,
  readMessageImages,
  hasFileResults,
  type MessageGenerationInfo,
  type ToolCallResultEvent,
  type UserMessage,
} from '../../../shared/chat'
import type { AssistantMessageV2, AssistantPart } from '../../../shared/agentChat'
import { type ClientChatMessage, messageToolResults, messageToText } from './messages'
import { ToolPartView } from './tools/registry'
import { QuizAnswerProvider } from './tools/quizAnswerContext'
import type { QuizAnswer } from '../../../shared/quiz'
import { ThinkingBlock } from './ThinkingBlock'
import { SubagentCard } from './SubagentCard'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import CopyToClipboardButton from './CopyToClipboardButton'
import { StreamStatusAnnouncer } from '../common/accessibility/StatusAnnouncer'
import { ScrollableRegion } from '../common/accessibility/ScrollableRegion'
import { BlueButton, OutlineButtonBlack } from './general/Buttons'
import { focusIndicatorStyle } from 'src/client/util/accessibility'
import { visuallyHidden } from '@mui/utils'

const UserMessageItem = ({ message }: { message: UserMessage }) => (
  <Box
    sx={{
      backgroundColor: 'action.hover',
      padding: '1rem 1.5rem',
      marginLeft: 10, //applies only in mobile
      borderRadius: '1rem 0.0rem 1rem 1rem',
      boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.2)',
      whiteSpace: 'pre-wrap',
      maxWidth: { xs: '90vw', sm: '60vw', md: '50vw' },
      // minWidth: { xs: '70vw', sm: 0 },
      wordBreak: 'break-word',
      width: 'fit-content',
    }}
  >
    {readMessageContent(message)}

    {readMessageImages(message).map((url, idx) => (
      <Box
        key={idx}
        component="img"
        src={url}
        alt={message.attachments ?? ''}
        sx={{ display: 'block', maxWidth: '12rem', maxHeight: '12rem', borderRadius: '0.5rem', marginTop: '1rem', objectFit: 'contain' }}
      />
    ))}

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

const ToolResultsButton = ({
  toolResults,
  setActiveToolResults,
  isMobile,
  headingId,
}: {
  toolResults: ToolCallResultEvent[]
  setActiveToolResults?: (toolResults: ToolCallResultEvent[]) => void
  isMobile: boolean
  headingId: string
}) => {
  const { t } = useTranslation()
  const hasResults = hasFileResults(toolResults)
  const onOpen = hasResults ? setActiveToolResults : undefined
  const isClickable = !!onOpen
  const describedBy = isClickable && !isMobile ? `${headingId} right-sidebar-toggle` : headingId
  return (
    <Box
      component={isClickable ? 'button' : 'div'}
      {...(onOpen && {
        type: 'button',
        onClick: () => {
          onOpen(toolResults)
        },
      })}
      data-testid="file-search-sources"
      aria-describedby={describedBy}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        font: 'inherit',
        color: 'inherit',
        textAlign: 'left',
        border: isClickable ? '1px solid' : 'none',
        borderColor: 'divider',
        background: 'none',
        fontStyle: isClickable ? 'normal' : 'italic',
        width: 'fit-content',
        maxWidth: '100%',
        opacity: '0.85',
        mt: 3,
        cursor: isClickable ? 'pointer' : 'default',
        padding: '0.4rem 0.8rem',
        borderRadius: '0.6rem',
        '&:hover': isClickable ? { backgroundColor: 'action.hover' } : undefined,
      }}
    >
      <FormatQuoteIcon sx={{ fontSize: '1.5rem', flexShrink: 0 }} />
      <Typography component="span" variant="body2">
        {hasResults ? t('chat:foundFromMaterial') : t('chat:notFoundFromMaterial')}
      </Typography>
    </Box>
  )
}

const numberedHeading = (heading: string, number?: number) => (number === undefined ? heading : `${heading} ${number}`)

const AssistantMessageInfo = ({ message, headingId, number }: { message: AssistantMessageV2; headingId: string; number?: number }) => {
  const { t } = useTranslation()
  const heading = (
    <Typography component="h2" id={headingId} sx={visuallyHidden}>
      {numberedHeading(t('accessibility:responseHeading'), number)}
    </Typography>
  )
  if (!message.generationInfo) {
    return heading
  }

  const title =
    message.generationInfo.promptInfo.type === 'saved'
      ? `${message.generationInfo.promptInfo.name} (${message.generationInfo.model})`
      : `${message.generationInfo.model}` + (message.generationInfo.promptInfo.systemMessage.length > 0 ? ` (${t('chat:customPrompt')})` : '')

  return (
    <Box sx={{ display: 'flex', opacity: 0.7, alignItems: 'center' }}>
      {heading}
      <ArrowRight fontSize="small" />
      <Typography aria-label={message.generationInfo.promptInfo.type === 'saved' ? t('common:promptAndModel') : t('status:modelInUse')} fontSize="small">
        {title}
      </Typography>
    </Box>
  )
}

/**
 * The parts of an assistant message in order: text as markdown, reasoning in a thinking block, tool parts by
 * their renderer, and subagent parts as cards that render their own parts with this same component.
 */
const AssistantParts = ({ parts }: { parts: AssistantPart[] }) => {
  const processedParts = React.useMemo(() => parts.map((part) => (part.type === 'text' ? { ...part, text: preprocessMath(part.text) } : part)), [parts])
  const { t } = useTranslation()
  const theme = useTheme()
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
    errorColor: theme.palette.error.main,
    throwOnError: true,
    strict: 'error', // disables logging katex warnings/errors – if debugging, turn these two on
  }
  // Unique per list of parts: a subagent card's parts are rendered by another AssistantParts in the same message.
  const codeBlockIdPrefix = useId()
  let codeCount = 0

  return (
    <>
      {processedParts.map((part, partIdx) =>
        part.type === 'tool' ? (
          <ToolPartView key={`tool-${part.callId}`} part={part} />
        ) : part.type === 'subagent' ? (
          <SubagentCard key={`subagent-${part.callId}`} part={part}>
            <AssistantParts parts={part.parts} />
          </SubagentCard>
        ) : part.type === 'reasoning' ? (
          <ThinkingBlock key={`reasoning-${partIdx}`} part={part} />
        ) : (
          <ReactMarkdown
            key={`text-${partIdx}`}
            remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
            rehypePlugins={[[rehypeKatex, katexOptions]]}
            components={{
              pre(props) {
                const { children, node, ...rest } = props
                const codeNode = node?.children[0]
                if (codeNode?.type === 'element' && /language-(\w+)/.test(String(codeNode.properties.className ?? ''))) {
                  return <>{children}</>
                }
                return <pre {...rest}>{children}</pre>
              },
              table(props) {
                const { node, ...rest } = props
                return (
                  <ScrollableRegion label={t('accessibility:scrollableTable')} sx={{ '& th, & td': { wordBreak: 'normal', overflowWrap: 'normal' } }}>
                    <table {...rest} />
                  </ScrollableRegion>
                )
              },
              span(props) {
                const { node, ...rest } = props
                if (!rest.className?.includes('katex-display')) {
                  return <span {...rest} />
                }
                return (
                  <ScrollableRegion label={t('accessibility:scrollableFormula')}>
                    <span {...rest} />
                  </ScrollableRegion>
                )
              },
              code(props) {
                const { children, className, node, ...rest } = props
                const match = /language-(\w+)/.exec(className || '')
                const language = match?.[1] || 'plaintext' // safe fallback

                if (match) {
                  const codeBlockId = `${codeBlockIdPrefix}codeBlock-${++codeCount}`

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
                          backgroundColor: 'action.hover',
                        }}
                      >
                        {language}
                      </Typography>
                      <Box sx={{ position: 'relative' }}>
                        {/* @ts-ignore */}
                        <SyntaxHighlighter
                          {...rest}
                          PreTag="pre"
                          children={String(children)}
                          language={language}
                          customStyle={{
                            padding: '1rem 4rem 1rem 1rem', // 4rem keeps the CopyToClipboard button visible
                            margin: 0,
                            fontSize: '15px',
                            wordBreak: 'break-all',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                          style={accessibleOneDark}
                          className="scrollable-code-highlight"
                          id={codeBlockId}
                        />
                        <CopyToClipboardButton
                          id={codeBlockId}
                          copied={String(children)}
                          label={t('chat:codeBlock')}
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
            {part.text}
          </ReactMarkdown>
        ),
      )}
    </>
  )
}

const AssistantMessageItem = ({
  message,
  setActiveToolResults,
  isMobile = false,
  onRetry,
  isStreaming = false,
  isLatestResponse = false,
  latestResponseRef,
  number,
}: {
  message: AssistantMessageV2
  setActiveToolResults?: (toolResults: ToolCallResultEvent[]) => void
  isMobile?: boolean
  onRetry?: () => void
  isStreaming?: boolean
  isLatestResponse?: boolean
  latestResponseRef?: React.Ref<HTMLDivElement>
  number?: number
}) => {
  const { t } = useTranslation()
  const msgId = useId()
  const headingId = useId()
  const toolResults = messageToolResults(message)

  return (
    <Box
      data-testid="assistant-message"
      id={msgId}
      aria-busy={isStreaming}
      ref={isLatestResponse ? latestResponseRef : undefined}
      tabIndex={isLatestResponse ? -1 : undefined}
      aria-label={isLatestResponse ? t('chat:latestResponseLabel') : undefined}
      sx={(theme) => ({
        width: '100%',
        position: 'relative',
        pr: 4,
        wordBreak: 'break-word',
        '&:hover .copy-message-button': {
          opacity: 0.7,
        },
        '&:focus-within .copy-message-button': {
          opacity: 0.7,
        },
        ...theme.applyStyles('dark', darkModeLinkColors),
      })}
    >
      <AssistantMessageInfo message={message} headingId={headingId} number={number} />
      <AssistantParts parts={message.parts} />
      {message.error && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" fontStyle="italic" color="error.main">
            {message.error === 'timeout_error' ? t('chat:timeoutError') : `\n\n ${message.error}`}
          </Typography>
          {onRetry && (
            <Box sx={{ mt: 1 }}>
              <OutlineButtonBlack onClick={onRetry} size="small">
                {t('chat:retryMessage')}
              </OutlineButtonBlack>
            </Box>
          )}
        </Box>
      )}
      {toolResults.length > 0 && (
        <>
          <ToolResultsButton toolResults={toolResults} setActiveToolResults={setActiveToolResults} isMobile={isMobile} headingId={headingId} />
        </>
      )}
      <Box
        className="copy-message-button"
        sx={{
          position: { xs: 'static', md: 'absolute' },
          width: { xs: 'fit-content', md: 'auto' },
          ml: { xs: 'auto', md: 0 },
          mt: { xs: 1, md: 0 },
          right: 10,
          bottom: -15,
          opacity: { xs: 0.7, md: 0 },
          transition: 'opacity 0.2s ease-in-out',
          bgcolor: 'background.paper',
          borderRadius: 4,
          ...focusIndicatorStyle(),
        }}
      >
        <CopyToClipboardButton id={msgId} copied={messageToText(message)} label={numberedHeading(t('accessibility:responseHeading'), number)} />
      </Box>
    </Box>
  )
}

export const MessageItem = ({
  message,
  setActiveToolResults,
  isMobile = false,
  onRetry,
  isStreaming = false,
  isLatestResponse = false,
  latestResponseRef,
  number,
}: {
  message: ClientChatMessage
  setActiveToolResults?: (toolResults: ToolCallResultEvent[]) => void
  isMobile?: boolean
  onRetry?: () => void
  isStreaming?: boolean
  isLatestResponse?: boolean
  latestResponseRef?: React.Ref<HTMLDivElement>
  number?: number
}) => {
  const { t } = useTranslation()
  if (message.role === 'assistant') {
    return (
      <Box
        data-sentry-mask
        sx={{
          height: 'auto',
        }}
      >
        <AssistantMessageItem
          message={message}
          setActiveToolResults={setActiveToolResults}
          isMobile={isMobile}
          onRetry={onRetry}
          isStreaming={isStreaming}
          isLatestResponse={isLatestResponse}
          latestResponseRef={latestResponseRef}
          number={number}
        />
      </Box>
    )
  } else {
    return (
      <Box data-sentry-mask data-testid="user-message" sx={{ alignSelf: 'flex-end' }}>
        <Typography component="h2" sx={visuallyHidden}>
          {numberedHeading(t('accessibility:userMessageHeading'), number)}
        </Typography>
        <UserMessageItem message={message} />
      </Box>
    )
  }
}

const shouldShowRetryButton = (
  message: ClientChatMessage,
  idx: number,
  messages: ClientChatMessage[],
  isStreaming: boolean,
  onRetry?: (index: number) => void,
): boolean => {
  return message.role === 'assistant' && !!message.error && idx === messages.length - 1 && !isStreaming && onRetry != null
}

const Conversation = ({
  messages,
  streamingParts,
  generationInfo,
  isStreaming,
  endState,
  setActiveToolResults,
  initial,
  isMobile,
  onRetry,
  onQuizAnswer,
  latestResponseIndex,
  latestResponseRef,
}: {
  messages: ClientChatMessage[]
  /** Parts of the response that is being streamed */
  streamingParts: AssistantPart[]
  generationInfo?: MessageGenerationInfo
  isStreaming: boolean
  endState: 'none' | 'canceled' | 'error'
  setActiveToolResults?: (toolResults: ToolCallResultEvent[]) => void
  initial?: React.ReactElement
  isMobile: boolean
  onRetry?: (index: number) => void
  /** Sends the answer to a quiz in the latest message as a user message. */
  onQuizAnswer?: (answer: QuizAnswer, text: string) => void
  latestResponseIndex: number | null
  latestResponseRef: React.RefObject<HTMLDivElement | null>
}) => {
  const [reminderSeen, setReminderSeen] = useLocalStorageState<boolean>('reminderSeen', false)

  let turn = 0
  const messageNumbers = messages.map((message) => (message.role === 'user' ? ++turn : turn))

  return (
    <>
      <Box
        style={{
          // maxWidth: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.5rem',
          padding: isMobile ? '4rem 0rem' : '4rem 1rem',
          justifyContent: messages.length === 0 ? 'center' : 'flex-start',
        }}
        role="region"
        aria-label={t('chat:conversation')}
      >
        <StreamStatusAnnouncer isStreaming={isStreaming} hasCompletion={streamingParts.length > 0} endState={endState} />

        {messages.length === 0 && initial}
        {messages.map((message, idx) => {
          const showRetry = shouldShowRetryButton(message, idx, messages, isStreaming, onRetry)
          const isLatestResponse = idx === latestResponseIndex
          const isLast = idx === messages.length - 1
          const next = messages[idx + 1]
          // A quiz answer is already shown on the answered quiz card, so its user message is not shown again.
          if (message.role === 'user' && message.quizAnswer) return null
          return (
            // A quiz is answered by the user message right after it, and can be answered while it is in the latest message.
            <QuizAnswerProvider
              key={idx}
              answer={next?.role === 'user' ? next.quizAnswer : undefined}
              onAnswer={isLast && !isStreaming ? onQuizAnswer : undefined}
              closed={!isLast}
            >
              <MessageItem
                message={message}
                number={messageNumbers[idx]}
                setActiveToolResults={setActiveToolResults}
                isMobile={isMobile}
                onRetry={showRetry ? () => onRetry!(idx) : undefined}
                isLatestResponse={isLatestResponse}
                latestResponseRef={isLatestResponse ? latestResponseRef : undefined}
              />
            </QuizAnswerProvider>
          )
        })}

        {isStreaming &&
          messages.length > 0 &&
          (streamingParts.length > 0 ? (
            <MessageItem
              message={{
                role: 'assistant',
                parts: streamingParts,
                generationInfo,
              }}
              number={turn}
              setActiveToolResults={setActiveToolResults}
              isMobile={isMobile}
              isStreaming
            />
          ) : (
            <LoadingMessage />
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

export default Conversation
