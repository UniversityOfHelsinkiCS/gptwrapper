import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Paper, Typography } from '@mui/material'
import { darkModeLinkColors } from '../../theme'
import { LoadingMessage } from './general/LoadingMessage'
import { MarkdownContent } from './MarkdownContent'
import ArrowRight from '@mui/icons-material/ArrowRight'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import { t } from 'i18next'
import React, { useId } from 'react'
import { useTranslation } from 'react-i18next'
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
import { isActivityPart, ToolPartView } from './tools/registry'
import { ActivityGroup } from './ActivityGroup'
import { groupParts } from './groupParts'
import { OutputFiles, outputFilesOf } from './tools/OutputFiles'
import { QuizAnswerProvider, type QuizSelection } from './tools/quizAnswerContext'
import { ThinkingBlock } from './ThinkingBlock'
import { SubagentCard } from './SubagentCard'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import CopyToClipboardButton from './CopyToClipboardButton'
import { StreamStatusAnnouncer } from '../common/accessibility/StatusAnnouncer'
import { BlueButton, OutlineButtonBlack } from './general/Buttons'
import { focusIndicatorStyle } from 'src/client/util/accessibility'
import { visuallyHidden } from '@mui/utils'
import { QuoteCard } from './QuoteCard'
import { QuickActionMessage } from './QuickActionMessage'

const UserMessageItem = ({ message }: { message: UserMessage }) => (
  <Box
    sx={{
      backgroundColor: 'action.hover',
      padding: '1rem 1.5rem',
      marginLeft: { xs: 4, sm: 10 },
      borderRadius: '1rem 0.0rem 1rem 1rem',
      boxShadow: '0px 2px 2px rgba(0, 0, 0, 0.2)',
      whiteSpace: 'pre-wrap',
      // on mobile relative to the chat column, not the viewport, so the bubble cannot overflow it
      maxWidth: { xs: '100%', sm: '60vw', md: '50vw' },
      // minWidth: { xs: '70vw', sm: 0 },
      wordBreak: 'break-word',
      width: 'fit-content',
    }}
  >
    {message.quickAction && message.quotes?.length ? (
      <QuickActionMessage message={message} action={message.quickAction} />
    ) : (
      <>
        {message.quotes?.map((quote, idx) => <QuoteCard key={idx} quote={quote} />)}
        {readMessageContent(message)}
      </>
    )}

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
 * Consecutive activity parts (tools, subagents, reasoning) are folded into one activity group.
 */
const AssistantParts = ({ parts, outputPaths }: { parts: AssistantPart[]; outputPaths: string[] }) => {
  const renderPart = (part: AssistantPart, partIdx: number) =>
    part.type === 'tool' ? (
      <ToolPartView key={`tool-${part.callId}`} part={part} />
    ) : part.type === 'subagent' ? (
      <SubagentCard key={`subagent-${part.callId}`} part={part}>
        <AssistantParts parts={part.parts} outputPaths={outputPaths} />
      </SubagentCard>
    ) : part.type === 'reasoning' ? (
      <ThinkingBlock key={`reasoning-${partIdx}`} part={part} />
    ) : (
      <MarkdownContent key={`text-${partIdx}`} text={part.text} outputPaths={outputPaths} />
    )

  return (
    <>
      {groupParts(parts, isActivityPart).map((item) =>
        item.type === 'activity' ? (
          <ActivityGroup key={`activity-${item.index}`} parts={item.parts} index={item.index} renderPart={renderPart} />
        ) : (
          renderPart(item.part, item.index)
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
  const outputPathsKey = outputFilesOf(message.parts).join('\n')
  const outputPaths = React.useMemo(() => (outputPathsKey ? outputPathsKey.split('\n') : []), [outputPathsKey])

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
      <AssistantParts parts={message.parts} outputPaths={outputPaths} />
      <OutputFiles paths={outputPaths} />
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
      <Box data-sentry-mask data-testid="user-message" sx={{ alignSelf: 'flex-end', maxWidth: '100%', minWidth: 0 }}>
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
  quizSelection,
  onQuizSelect,
  onQuizSubmit,
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
  /** The options picked in the quiz of the latest message. */
  quizSelection?: QuizSelection | null
  /** Picks options in a quiz of the latest message. */
  onQuizSelect?: (selection: QuizSelection) => void
  /** Sends the picked options, with the text in the chat box, as the answer. */
  onQuizSubmit?: () => void
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
              selection={isLast && !isStreaming ? quizSelection : undefined}
              onSelect={isLast && !isStreaming ? onQuizSelect : undefined}
              onSubmit={isLast && !isStreaming ? onQuizSubmit : undefined}
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
