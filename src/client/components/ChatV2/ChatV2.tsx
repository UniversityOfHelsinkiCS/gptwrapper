import { Box, Button, Drawer, Paper, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Description, MapsUgc } from '@mui/icons-material'
import { enqueueSnackbar } from '../common/Snackbar'
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, DEFAULT_STREAM_TIMEOUT, isFreeModel, ValidModelNameSchema, getModelConfig } from '../../../config'
import type { AssistantMessageV2 } from '@shared/agentChat'
import type { MessageContent, MessageGenerationInfo, ToolCallResultEvent } from '@shared/chat'
import { getLanguageValue } from '@shared/utils'
import { QUIZ_IDK, type QuizAnswer } from '@shared/quiz'
import type { Quote } from '@shared/quote'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import { useChatScroll } from './useChatScroll'
import useCourse from '../../hooks/useCourse'
import useLocalStorageState, { useLocalStorageStateWithURLDefault } from '../../hooks/useLocalStorageState'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import useUserStatus from '../../hooks/useUserStatus'
import { invalidateUserUsage } from '../../hooks/useUserUsage'
import { useAnalyticsDispatch } from '../../stores/analytics'
import sidebarOpen from '../../assets/sidebar-open.svg'
import { ChatBox, type ChatBoxActions } from './ChatBox'
import { useUsageLimit } from './useUsageLimit'
import { findQuiz, quizAnswerMessage, quizResultAnnouncement, type QuizSelection } from './tools/quizAnswerContext'
import { announceToScreenReader } from '../common/accessibility/SnackbarAnnouncer'
import { OutlineButtonBlack } from './general/Buttons'
import { handleCompletionStreamError } from './error'
import ToolResult from './ToolResult'
import { useChatStream } from './useChatStream'
import { sendConversationEmail, downloadDiscussionAsFile } from './api'
import { HttpChatTransport } from './chatTransport'
import { WebSocketChatTransport } from './chatSocket'
import { applyEvent } from './applyEvent'
import { type ClientChatMessage, messageToolResults, toHistoryMessages } from './messages'
import { useChatMessages } from './useChatMessages'
import { ConversationSplash } from './general/ConversationSplash'
import { PromptStateProvider, usePromptState } from './PromptState'
import z from 'zod/v4'
import useCurrentUser from '../../hooks/useCurrentUser'
import { WarningType } from '@shared/aiApi'
import { ResetConfirmModal } from './ResetConfirmModal'
import SideBar from './SideBar'
import TemplateModal from './TemplateModal'
import PromptModalV2 from './PromptModalV2'
import RagModal from '../Rag/RagModal'
import HYLoadingSpinner from './general/HYLoadingSpinner'
import { CustomIcon } from './general/CustomIcon'
import { parseFileContent } from '../../util/fileParsing'
import { ChatExpiredView } from './ChatExpiredView'
import { canManageCourse } from './util'
import { ApiErrorView } from '../common/ApiErrorView'
import NotificationBanner from '../common/NotificationBanner'
import { PromptEditorState } from '../Prompt/context'
import { usePageTitle } from '../../hooks/usePageTitle'
import { AttachFolders, parseStoredFolders } from '../MyFiles/AttachFolders'
import { useMyFilesStore } from '../MyFiles/MyFilesStoreContext'
import { FileViewerProvider, useFileViewer } from '../FileViewer/FileViewerContext'
import type { AddQuoteOptions, PendingQuote } from '../FileViewer/selectionQuote'
import SplitSeparator, { MIN_CHAT_WIDTH, useSplitRatio } from '../FileViewer/SplitSeparator'
import { baseName } from '../../util/myFiles/paths'
import { executeFileTool } from '../../util/myFiles/agentTools'
import type { ClientTools } from './chatTransport'
import { SHORT_VIEWPORT } from '../../theme'

const QUIZ_ANNOUNCEMENT_DELAY_FROM_CHAT_BOX = 700

/**
 * Conversation rendering needs a lot of assets (mainly Katex) so we lazy load it to improve initial page load performance
 */
const Conversation = lazy(() => import('./Conversation'))
/** The file viewer renders Markdown with the same assets, so it is lazy too. */
const FileViewer = lazy(() => import('../FileViewer/FileViewer'))

// On mobile the floating buttons and the global menu are fixed at top: 10 and are ~40px tall. Starting the
// banner below them lets it use the full width instead of reserving room for the global menu.
const bannerBelowFloatingButtonsSx = { pt: '64px', pr: 2 }

/** Below this width the file viewer does not fit next to the chat: it covers the chat instead. */
const NARROW_VIEWER_QUERY = '(max-width:1099.95px)'

const ChatV2Content = () => {
  const { courseId } = useParams()
  const isEmbeddedMode = useIsEmbedded()
  const theme = useTheme()
  const chatScroll = useChatScroll()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isNarrow = useMediaQuery(NARROW_VIEWER_QUERY)
  const isCoarsePointer = useMediaQuery('(pointer: coarse)')
  const { t, i18n } = useTranslation()
  const { promptInfo, isPromptHidden, activePrompt, isUrlPromptUnavailable } = usePromptState()
  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()
  const ragHidden = activePrompt?.ragHidden

  const { processStream, streamingParts, isStreaming, setIsStreaming, streamControllerRef, generationInfo, hasPotentialError } = useChatStream({
    onComplete: ({ message }) => {
      // Counts file searches (finished document_search parts) once they are in the message.
      messageToolResults(message).forEach(() => dispatchAnalytics({ type: 'INCREMENT_FILE_SEARCHES' }))
      if (message.parts.length > 0 || message.error) {
        setMessages((prev: ClientChatMessage[]) => prev.concat(message))
        refetchStatus()
      }
      if (message.error) {
        setEndState('error')
      }
      chatScroll.autoScroll()
    },
    onText: () => {
      if (performance.now() - lastRearmRef.current > 1000) {
        armStreamTimeoutRef.current?.()
      }
      chatScroll.autoScroll()
    },
    onError: (error) => {
      handleCompletionStreamError(error, fileName)
      enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
      handleCancel('error')
    },
  })

  // queries
  const { data: chatInstance, isLoading: chatInstanceLoading, error: chatInstanceLoadError } = useCourse(courseId)
  const { user, isLoading: userLoading } = useCurrentUser()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  // local storage states
  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'
  const [activeModel, setActiveModel] = useLocalStorageStateWithURLDefault('model-v2', DEFAULT_MODEL, 'model', ValidModelNameSchema)
  const [messages, setMessages] = useChatMessages(`${localStoragePrefix}-chat-messages`)
  const [modelTemperature, _setModelTemperature] = useLocalStorageStateWithURLDefault(
    `${localStoragePrefix}-chat-model-temperature`,
    String(DEFAULT_MODEL_TEMPERATURE),
    'temperature',
    z.coerce.number(),
  )

  // My files folders attached to this chat, for the agent's file tools. Experimental: over the WebSocket, not embedded.
  const myFilesStore = useMyFilesStore()
  const canAttachFolders = !isEmbeddedMode && !!myFilesStore
  const fileViewer = useFileViewer()
  const viewerTarget = myFilesStore ? fileViewer?.target ?? null : null
  const [storedAttachedFolders, setAttachedFolders] = useLocalStorageState<unknown>(`${localStoragePrefix}-attached-folders`, [])
  const attachedFolders = useMemo(() => parseStoredFolders(storedAttachedFolders), [storedAttachedFolders])

  const { tokenLimitExceeded, budgetResetsAt } = useUsageLimit(userStatus, setActiveModel)

  // app states
  const [fileName, setFileName] = useState<string>('')
  const [messageWarning, setMessageWarning] = useState<{
    [key in WarningType]?: { message: string; ignored: boolean; tokenCount?: number; contextLimit?: number; tokenUsagePercentage?: number }
  }>({})
  const [activeToolResults, setActiveToolResults0] = useState<ToolCallResultEvent[] | undefined>()
  const [rightMenuExpanded, setRightMenuExpanded0] = useState<boolean>(false)
  // On narrow screens the open file covers the chat ('viewer') or waits behind it ('chat').
  const [narrowView, setNarrowView] = useState<'viewer' | 'chat'>('viewer')
  const [splitRatio, setSplitRatio] = useSplitRatio()
  const [resetConfirmModalOpen, setResetConfirmModalOpen] = useState<boolean>(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [cacheKey, setCacheKey] = useState('')
  const [endState, setEndState] = useState<'none' | 'canceled' | 'error'>('none')
  // Options picked in the quiz of the latest message. The card and the chat box both use them: sending from either
  // answers the quiz with the chat box text as the explanation. Only valid while that message is still the latest.
  const [quizSelection, setQuizSelection] = useState<(QuizSelection & { messageIndex: number }) | null>(null)

  // Analytics
  const dispatchAnalytics = useAnalyticsDispatch()
  useEffect(() => {
    dispatchAnalytics({
      type: 'SET_ANALYTICS_DATA',
      payload: {
        model: activeModel,
        courseId,
        nMessages: messages.length,
      },
    })
  }, [messages, courseId, activeModel, dispatchAnalytics])

  // Refs
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const chatBoxRef = useRef<ChatBoxActions>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sendSeq = useRef(0) // increments per send attempt, for admin timing logs
  const armStreamTimeoutRef = useRef<(() => void) | null>(null)

  // The index of the most recent finished assistant turn, or null while none has arrived yet or while the response is still streaming.
  const latestResponseRef = useRef<HTMLDivElement | null>(null)
  const latestResponseIndex = !isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' ? messages.length - 1 : null
  const [visitedResponseIndex, setVisitedResponseIndex] = useState<number | null>(null)
  const isNewResponseAvailable = latestResponseIndex !== null && latestResponseIndex !== visitedResponseIndex
  const courseName = chatInstance && getLanguageValue(chatInstance.name, i18n.language)
  usePageTitle(courseId === 'general' ? t('chat:generalChat') : courseName)

  const handleGoToLatestResponse = () => {
    // focus the latest response so screen readers can read it out loud
    latestResponseRef.current?.focus()
    setVisitedResponseIndex(latestResponseIndex)
  }
  const lastRearmRef = useRef(0)

  const handleSendMessage = async (
    message: string,
    resendPrevious: boolean,
    ignoredWarnings: WarningType[],
    messagesToResend?: ClientChatMessage[],
    quizAnswer?: QuizAnswer,
    /** A failed answer whose run the server can continue (it has a `resumeId`). */
    failedAnswer?: AssistantMessageV2,
    quotes?: Quote[],
  ) => {
    if (!userStatus) return

    // The chat box shows why sending is blocked.
    if (budgetResetsAt) return

    const acualModel = activeModel
    if (tokenLimitExceeded && !isFreeModel(acualModel)) {
      enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
      handleCancel('error')
      return
    }

    // The full app chats over the WebSocket (needed for the My files tools), embedded mode over HTTP.
    const transport = !isEmbeddedMode ? new WebSocketChatTransport() : new HttpChatTransport()
    streamControllerRef.current = transport

    const formData = new FormData()

    // A file waiting in the chat box stays for the next message, it is not sent with a quiz answer.
    const file = quizAnswer ? undefined : fileInputRef.current?.files?.[0]

    // Parse file content on client side and keep it separate from the message
    let messageContent: MessageContent[] | string = message
    let parsedFileContent: string | undefined = undefined
    if (file && !resendPrevious) {
      try {
        const fileContent = await parseFileContent(file)

        if (typeof fileContent === 'string') {
          // For text/PDF files, keep content separate and don't append to message
          parsedFileContent = fileContent
        } else {
          // For images, send the prompt text and the image together as multimodal content
          messageContent = message.trim() ? [{ type: 'text', text: message }, ...fileContent] : fileContent
        }

        // Still send file to server for validation purposes
        formData.append('file', file)
      } catch (error) {
        setEndState('none')
        setIsStreaming(true)
        console.error('Error parsing file:', error)
        // Show file parsing errors as warnings in the chat box
        setMessageWarning({
          ...messageWarning,
          fileParsingError: {
            message: error instanceof Error ? error.message : 'Error parsing file',
            ignored: false,
          },
        })
        return
      }
    }

    // On retry, `messages` in this closure is stale (the slice from handleRetry
    // hasn't been applied yet), so the caller passes the intended history explicitly.
    const baseMessages = messagesToResend ?? messages
    const newMessages = resendPrevious
      ? baseMessages
      : baseMessages.concat({
          role: 'user',
          content: messageContent,
          attachments: file && fileName ? fileName : undefined,
          fileContent: parsedFileContent, // Store file content separately
          quizAnswer,
          ...(quotes?.length ? { quotes } : {}),
        })

    setMessages(newMessages)

    if (!quizAnswer) {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileName('')
    }
    const streamCreationTimeout = getModelConfig(acualModel)?.timeoutOverride ?? DEFAULT_STREAM_TIMEOUT

    // Admin-only timing instrumentation: confirms whether timeouts really fire
    // before the configured budget and which clock ran out. Safe in production
    // since devs are admins. See investigation of fast "timeout_error" reports.
    const attemptId = ++sendSeq.current
    const armedAt = performance.now()
    const logAdminTiming = (msg: string) => {
      if (user?.isAdmin) {
        console.log(`[chat-timing] #${attemptId} ${msg}`)
      }
    }

    const armStreamTimeout = () => {
      setRetryTimeout(() => {
        logAdminTiming(
          `timeout after ${Math.round(performance.now() - lastRearmRef.current)}ms of silence (budget ${streamCreationTimeout}ms, model=${acualModel})`,
        )
        streamControllerRef.current?.abort('timeout_error')
      }, streamCreationTimeout)
      lastRearmRef.current = performance.now()
    }

    armStreamTimeoutRef.current = armStreamTimeout
    armStreamTimeout()

    setIsStreaming(true)
    setEndState('none')
    // Scroll immediately to show loading dots for better UX feedback
    // Small delay ensures React has rendered the loading message
    setTimeout(() => {
      chatScroll.beginAutoscroll()
    }, 10)

    const generationInfo: MessageGenerationInfo = {
      model: acualModel,
      temperature: modelTemperature,
      promptInfo,
    }

    // The browser runs the file tools itself and checks every path the agent asks for (`agentTools.ts`). They are on
    // without attached folders too: `Outputs/` and `Agent notes/` are in every chat.
    const folders = attachedFolders
    const clientTools: ClientTools | undefined = canAttachFolders
      ? { attachedFolders: folders, execute: (name, toolInput) => executeFileTool(myFilesStore, folders, name, toolInput) }
      : undefined

    try {
      const res = await transport.start({
        clientTools,
        formData,
        input: {
          options: {
            generationInfo,
            chatMessages: toHistoryMessages(newMessages),
            ignoredWarnings,
            resumeRunId: failedAnswer?.resumeId,
          },
          courseId: courseId !== 'general' ? courseId : undefined,
        },
      })

      logAdminTiming(`headers received after ${Math.round(performance.now() - armedAt)}ms`)

      if ('error' in res) {
        console.error('API error:', res)
        handleCompletionStreamError(res, fileName)
        handleCancel('error')
        // A 403 'Usage limit reached' means the status is stale: refetch it to show the blocked state.
        refetchStatus()
        return
      }

      const newWarnings = { ...messageWarning }

      if ('warnings' in res) {
        res.warnings.forEach((warning) => {
          newWarnings[warning.warningType] = {
            message: warning.warning,
            ignored: false,
            tokenCount: 'tokenCount' in warning ? warning.tokenCount : undefined,
            contextLimit: 'contextLimit' in warning ? warning.contextLimit : undefined,
            tokenUsagePercentage: 'tokenUsagePercentage' in warning ? warning.tokenUsagePercentage : undefined,
          }
        })
        clearRetryTimeout()
      }

      ignoredWarnings.forEach((type) => {
        if (newWarnings[type]) {
          delete newWarnings[type]
        }
      })
      setMessageWarning(newWarnings)

      if (Object.keys(newWarnings).length > 0) {
        return
      }

      if ('events' in res) {
        await processStream(res.events, generationInfo, failedAnswer?.parts)
        clearRetryTimeout()
        invalidateUserUsage()
      } else {
        console.error('API error: No stream in response')
        handleCancel('error')
        enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
      }
    } catch (err: any) {
      const abortReason = streamControllerRef.current?.signal.reason
      const wasTimeout = abortReason === 'timeout_error'
      if (wasTimeout) {
        setMessages((prev: ClientChatMessage[]) => prev.concat({ role: 'assistant', parts: [], error: 'timeout_error', generationInfo }))
      } else {
        console.error(err)
      }
      handleCancel(abortReason === 'user_aborted' ? 'canceled' : 'error')
      invalidateUserUsage()
    }
  }

  const handleResetRequest = () => {
    if (user?.preferences?.skipNewConversationConfirm) {
      handleReset({ sendEmail: false, downloadFile: false, downloadFormat: 'md' })
    } else {
      setResetConfirmModalOpen(true)
    }
  }

  const handleReset = async ({
    sendEmail,
    downloadFile,
    downloadFormat,
  }: {
    sendEmail: boolean
    downloadFile: boolean
    downloadFormat: 'md' | 'docx' | 'pdf' | 'txt'
  }) => {
    if (sendEmail && user?.email) {
      try {
        await sendConversationEmail(messages, t)
        enqueueSnackbar(t('email:success'), { variant: 'success' })
      } catch (error) {
        console.error('Failed to send conversation email:', error)
        enqueueSnackbar(t('email:failure'), { variant: 'error' })
      }
    }

    if (downloadFile) {
      try {
        await downloadDiscussionAsFile(messages, t, downloadFormat, i18n.language)
        enqueueSnackbar(t('download:success'), { variant: 'success' })
      } catch (error) {
        console.error('Failed to download conversation:', error)
        enqueueSnackbar(t('download:failure'), { variant: 'error' })
      }
    }

    setResetConfirmModalOpen(false)

    streamControllerRef.current?.abort('conversation_cleared')
    setMessages([])
    setActiveToolResults0(undefined)
    setRightMenuExpanded0(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
    setMessageWarning({})
    setEndState('none')
    setQuizSelection(null)
    chatBoxRef.current?.clearQuote()
    clearRetryTimeout()
    dispatchAnalytics({ type: 'RESET_CHAT' })
  }

  const handleCancel = (reason: 'canceled' | 'error' = 'canceled') => {
    setMessageWarning({})
    setIsStreaming(false)
    clearRetryTimeout()
    setEndState(reason)
    document.getElementById('chat-input')?.focus()
  }

  const lastMessage = messages.at(-1)
  const openQuizSelection =
    quizSelection &&
    quizSelection.selected.length > 0 &&
    !isStreaming &&
    quizSelection.messageIndex === messages.length - 1 &&
    lastMessage?.role === 'assistant'
      ? quizSelection
      : null
  const openQuiz = openQuizSelection && lastMessage?.role === 'assistant' ? findQuiz(lastMessage.parts, openQuizSelection.callId) : null
  const quizPrompt = openQuiz && openQuizSelection ? (openQuizSelection.selected.includes(QUIZ_IDK) ? 'unclear' : 'reasoning') : null

  const handleQuizSelect = useCallback((selection: QuizSelection) => setQuizSelection({ ...selection, messageIndex: messages.length - 1 }), [messages.length])
  const handleQuizSubmit = useCallback(() => chatBoxRef.current?.submit(), [])

  /**
   * A quote from the file viewer goes to the chat box (the composer), as a chip or sent right away (a quick action).
   * On narrow screens the viewer covers the chat, so the view switches to the chat first (the chat box focuses its input).
   */
  const addQuote = useCallback(
    (pending: PendingQuote, options?: AddQuoteOptions) => {
      if (isNarrow) flushSync(() => setNarrowView('chat'))
      chatBoxRef.current?.addQuote(pending, options)
    },
    [isNarrow],
  )

  /**
   * Sends the chat box text: as the explanation of the quiz answer while an option is picked, otherwise as a message
   * (with its quotes). A message with quotes is never a quiz answer (a quick action can be sent while an option is picked).
   */
  const handleChatBoxSubmit = (message: string, quotes?: Quote[]) => {
    if (quotes || !openQuizSelection || !openQuiz) {
      handleSendMessage(message, false, [], undefined, undefined, undefined, quotes)
      return
    }
    const explanation = message.trim().slice(0, 10_000)
    const answer: QuizAnswer = { callId: openQuizSelection.callId, selected: openQuizSelection.selected, ...(explanation ? { explanation } : {}) }
    setQuizSelection(null)

    // Sent from the chat box, the screen reader first reacts to Enter and the field being emptied, which cuts
    // off an announcement made right away, so it waits for that.
    const announcement = lastMessage?.role === 'assistant' ? quizResultAnnouncement(lastMessage.parts, answer, t) : ''
    if (announcement) {
      const fromChatBox = document.activeElement?.id === 'chat-input'
      setTimeout(() => announceToScreenReader(announcement), fromChatBox ? QUIZ_ANNOUNCEMENT_DELAY_FROM_CHAT_BOX : 0)
    }
    handleSendMessage(quizAnswerMessage(openQuiz, answer, t), false, [], undefined, answer)
  }

  const handleRetry = (messageIndex: number) => {
    const newMessages = messages.slice(0, messageIndex)
    setMessages(newMessages)

    // A failed run the server still has continues from the step that failed (finished tool calls are not run
    // again) and the answer keeps its parts; otherwise the server starts over.
    const failed = messages[messageIndex]
    const failedAnswer = failed?.role === 'assistant' && failed.resumeId ? failed : undefined

    // Pass the sliced history explicitly: setMessages is async, so the closure
    // inside handleSendMessage would otherwise still see the errored message.
    handleSendMessage('', true, [], newMessages, undefined, failedAnswer)
  }

  // Handle layout shift when right menu opens (tool result becomes visible)
  const prevScrollYProportional = useRef(0)
  const handleLayoutShift = useCallback(() => {
    // Save the current proportional scroll position
    prevScrollYProportional.current = window.scrollY / document.body.scrollHeight

    // Set timeout to restore after layout change
    setTimeout(() => {
      const scrollY = prevScrollYProportional.current * document.body.scrollHeight
      window.scrollTo(0, scrollY)
    }, 0)
  }, [])

  const openToolResults = useCallback(
    (toolResults: ToolCallResultEvent[]) => {
      handleLayoutShift()
      setActiveToolResults0(toolResults)
      setRightMenuExpanded0(true)
    },
    [handleLayoutShift],
  )

  const setRightMenuExpanded = useCallback(
    (expanded: boolean) => {
      handleLayoutShift()
      setRightMenuExpanded0(expanded)
    },
    [handleLayoutShift],
  )

  const latestToolResults = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if (message.role !== 'assistant') continue
      const toolResults = messageToolResults(message)
      if (toolResults.length > 0) return toolResults
    }
    return undefined
  }, [messages])
  const shownToolResults = activeToolResults ?? latestToolResults

  // Marks the response that may have failed while waiting to see whether the stream recovers
  const shownStreamingParts = useMemo(
    () => (hasPotentialError ? applyEvent(streamingParts, { type: 'text.delta', path: [], text: ' ⚠️' }) : streamingParts),
    [hasPotentialError, streamingParts],
  )

  // layout
  const canShowToolResults = canManageCourse(chatInstance) || !(isPromptHidden || ragHidden) || activePrompt?.userId === user?.id
  const hasToolResults = !!shownToolResults && shownToolResults.length > 0 && canShowToolResults
  // Wide screens show an open file next to the chat (`splitView`), narrow ones over it (`narrowViewerShown`).
  const splitView = !!viewerTarget && !isNarrow
  const narrowViewerShown = !!viewerTarget && isNarrow && narrowView === 'viewer'
  // The file viewer and the sources panel share the right slot: opening the sources swaps the slot to them, closing
  // them brings the viewer back. The collapsed sources toggle stays in the rail next to the viewer.
  const sourcesInSlot = splitView && hasToolResults && rightMenuExpanded
  const toolResultsKey = shownToolResults?.map((toolResult) => toolResult.callId).join(',')
  const defaultCollapsedSidebar = user?.preferences?.collapsedSidebarDefault ?? false
  const showFloatingButtons = isMobile && !isEmbeddedMode
  const [sideBarOpen, setSideBarOpen] = useState<boolean>(() => {
    return isMobile || isEmbeddedMode ? false : !defaultCollapsedSidebar
  })
  const rightPanelContentWidth = !hasToolResults || isMobile ? '0px' : rightMenuExpanded ? 'var(--right-menu-width)' : 'var(--sidebar-width-collapsed)'
  const rightPanelCollapsed = !isMobile && hasToolResults && !rightMenuExpanded

  useEffect(() => {
    if (!isEmbeddedMode) return
    // embedded chat has little room, so its always visible collapsed sidebar is narrower than normally
    document.documentElement.style.setProperty('--sidebar-width-collapsed', '44px')
    document.documentElement.style.setProperty('--sidebar-collapsed-button-padding', '6px')
    return () => {
      document.documentElement.style.removeProperty('--sidebar-width-collapsed')
      document.documentElement.style.removeProperty('--sidebar-collapsed-button-padding')
    }
  }, [isEmbeddedMode])

  // Opening a file collapses the sidebar to its rail (it is not restored on close), shows the file on narrow screens
  // and takes the right slot back from the sources panel.
  useEffect(() => {
    if (!viewerTarget) return
    setSideBarOpen(false)
    setNarrowView('viewer')
    setRightMenuExpanded0(false)
  }, [viewerTarget])

  // The chat's scroll position, kept while a narrow-screen file covers the chat and restored when the chat comes back.
  const chatScrollY = useRef(0)
  const chatHidden = useRef(false)
  chatHidden.current = narrowViewerShown
  useEffect(() => {
    if (!viewerTarget || !isNarrow) return
    const onScroll = () => {
      if (!chatHidden.current) chatScrollY.current = window.scrollY
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [viewerTarget, isNarrow])
  const wasChatHidden = useRef(false)
  useLayoutEffect(() => {
    if (wasChatHidden.current && !narrowViewerShown) window.scrollTo(0, chatScrollY.current)
    wasChatHidden.current = narrowViewerShown
  }, [narrowViewerShown])

  // The global menu floats at the top right; keep it clear of the collapsed sources panel and of the file viewer.
  const [slotWidth, setSlotWidth] = useState<number | null>(null)
  const globalMenuOffset =
    splitView && slotWidth !== null
      ? rightPanelCollapsed
        ? `calc(${slotWidth}px + var(--sidebar-width-collapsed))`
        : `${slotWidth}px`
      : rightPanelCollapsed
        ? 'var(--sidebar-width-collapsed)'
        : null
  useEffect(() => {
    if (!globalMenuOffset) return
    document.documentElement.style.setProperty('--global-menu-right-offset', globalMenuOffset)
    return () => {
      document.documentElement.style.removeProperty('--global-menu-right-offset')
    }
  }, [globalMenuOffset])

  // Browsers scroll a focused element clear of these, see scroll-padding in GlobalStyles.tsx (WCAG 2.4.11)
  useEffect(() => {
    if (!showFloatingButtons) return
    document.documentElement.style.setProperty('--floating-top', bannerBelowFloatingButtonsSx.pt)
    return () => {
      document.documentElement.style.removeProperty('--floating-top')
    }
  }, [showFloatingButtons])

  const chatColumnRef = useRef<HTMLDivElement | null>(null)
  const slotRef = useRef<HTMLDivElement | null>(null)
  const viewerBoxRef = useRef<HTMLDivElement | null>(null)
  const measureSlot = useCallback((node: HTMLDivElement | null) => {
    slotRef.current = node
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setSlotWidth(node.offsetWidth))
    observer.observe(node)
    return () => {
      observer.disconnect()
      slotRef.current = null
      setSlotWidth(null)
    }
  }, [])
  // The separator splits the space from the start of the chat column to the end of the right slot.
  const getSplitRange = useCallback(() => {
    const chat = chatColumnRef.current?.getBoundingClientRect()
    const slot = slotRef.current?.getBoundingClientRect()
    return chat && slot ? { start: chat.left, end: slot.right } : null
  }, [])

  const focusViewer = () => viewerBoxRef.current?.querySelector<HTMLElement>('[data-testid="file-viewer"]')?.focus()

  const closeViewer = useCallback(() => {
    fileViewer?.close()
    document.getElementById('chat-input')?.focus()
  }, [fileViewer])

  const showNarrowChat = useCallback(() => {
    flushSync(() => setNarrowView('chat'))
    document.getElementById('chat-input')?.focus()
  }, [])

  const showNarrowViewer = () => {
    flushSync(() => setNarrowView('viewer'))
    focusViewer()
  }

  const closeSourcesInSlot = () => {
    flushSync(() => setRightMenuExpanded(false))
    focusViewer()
  }

  const measureChatBoxHeight = useCallback((node: HTMLDivElement | null) => {
    if (!node || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const observer = new ResizeObserver(() => root.style.setProperty('--chatbox-height', `${node.offsetHeight}px`))
    observer.observe(node)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--chatbox-height')
    }
  }, [])

  const noAccess = chatInstanceLoadError?.response?.status === 403 || isUrlPromptUnavailable

  useEffect(() => {
    if (noAccess) {
      enqueueSnackbar(t('error:noCourseAccess'), { variant: 'error' })
    }
  }, [noAccess])

  if (noAccess) {
    return <Navigate to="/general" replace />
  }

  if (chatInstanceLoadError) {
    return (
      <>
        <NotificationBanner />
        <ApiErrorView error={chatInstanceLoadError} />
      </>
    )
  }

  // No banner while loading, it would jump next to the side panel once the chat renders
  if (statusLoading || userLoading || chatInstanceLoading) return <HYLoadingSpinner />

  if (chatInstance?.accessLevel === 'STUDENT_CLOSED' && chatInstance.status !== 'ACTIVATED') {
    return (
      <>
        <NotificationBanner />
        <ChatExpiredView status={chatInstance.status} chatInstance={chatInstance} />
      </>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
      }}
    >
      {/* Chat side panel column -------------------------------------------------------------------------------------------*/}
      {/* Embedded chat keeps the collapsed sidebar visible so that no floating buttons cover the conversation */}
      {isEmbeddedMode && <SideBar open={false} setOpen={setSideBarOpen} user={user} handleReset={handleResetRequest} messages={messages} />}
      {isEmbeddedMode || isMobile ? (
        <Drawer
          open={sideBarOpen}
          onClose={() => {
            setSideBarOpen(!sideBarOpen)
          }}
          sx={{ '& .MuiDrawer-paper': { maxWidth: '100vw' } }}
        >
          <SideBar
            open={true} // always open in drawer
            autoFocus
            setOpen={setSideBarOpen}
            user={user}
            handleReset={handleResetRequest}
            messages={messages}
          />
        </Drawer>
      ) : (
        <SideBar open={sideBarOpen} setOpen={setSideBarOpen} user={user} handleReset={handleResetRequest} messages={messages} />
      )}
      {/* Chat view column ------------------------------------------------------------------------------------------------ */}
      {/* The banner spans the whole space between the side panels, the chat below it stays narrower */}
      {/* With a file open, the chat and the right slot split the space by the separator's ratio (40/60 by default). */}
      <Box
        ref={chatColumnRef}
        id="chat-column"
        sx={{
          ...(splitView ? { flex: `${splitRatio} 1 0px`, minWidth: `${MIN_CHAT_WIDTH}px` } : { flex: 1, minWidth: 0 }),
          display: narrowViewerShown ? 'none' : 'flex',
          flexDirection: 'column',
        }}
      >
        <NotificationBanner sx={showFloatingButtons ? bannerBelowFloatingButtonsSx : undefined} />
        <Box
          ref={chatContainerRef}
          data-skip-target
          tabIndex={-1}
          sx={{
            '&:focus-visible': { outline: 'none' },
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            // the parent flex column already gets the space left over by the side panels
            width: '100%',
            maxWidth: '1080px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {showFloatingButtons && (
            <Box
              sx={{
                position: 'fixed',
                left: 15,
                top: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                zIndex: 999,
                [SHORT_VIEWPORT]: { position: 'absolute' },
              }}
            >
              <OutlineButtonBlack onClick={() => setSideBarOpen(true)} data-testid="left-panel-open">
                <CustomIcon src={sidebarOpen} alt={t('sidebar:open')} />
              </OutlineButtonBlack>
              <OutlineButtonBlack onClick={handleResetRequest} aria-label={t('sidebar:chatNew')} data-testid="new-conversation-button">
                <MapsUgc fontSize="small" />
              </OutlineButtonBlack>
            </Box>
          )}
          <Box
            sx={{
              height: '100%',
              width: '100%',
              margin: '0 auto',
              overflow: 'hidden',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              paddingTop: '1rem',
              maxWidth: '1000px',
            }}
            ref={scrollRef}
          >
            {chatInstance?.saveDiscussions && (
              <Paper
                variant="outlined"
                sx={{
                  padding: 2,
                  mt: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography component="h2" variant="body1" fontWeight={600}>
                    {t('course:isSavedNotOptOut')}
                  </Typography>
                </Box>
              </Paper>
            )}

            <Conversation
              initial={
                <ConversationSplash
                  courseName={courseName}
                  courseDate={chatInstance?.activityPeriod}
                  promptName={promptInfo?.type === 'saved' ? promptInfo.name : undefined}
                />
              }
              messages={messages}
              streamingParts={shownStreamingParts}
              generationInfo={generationInfo}
              isStreaming={isStreaming}
              endState={endState}
              setActiveToolResults={canShowToolResults ? openToolResults : undefined}
              isMobile={isMobile}
              onRetry={handleRetry}
              quizSelection={openQuizSelection}
              onQuizSelect={handleQuizSelect}
              onQuizSubmit={handleQuizSubmit}
              latestResponseIndex={latestResponseIndex}
              latestResponseRef={latestResponseRef}
            />
          </Box>
          <Box
            ref={measureChatBoxHeight}
            sx={{
              width: '100%',
              position: 'sticky',
              bottom: 0,
              [SHORT_VIEWPORT]: { position: 'static' },
            }}
          >
            <Box
              sx={{
                padding: isMobile ? '0rem 1rem 1rem 1rem' : '0rem 2rem 2rem 2rem',
              }}
            >
              {isNarrow && viewerTarget && narrowView === 'chat' && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Description />}
                    onClick={showNarrowViewer}
                    data-testid="file-viewer-show"
                    sx={{ textTransform: 'none' }}
                  >
                    {t('fileViewer:backToFile', { name: baseName(viewerTarget.path), interpolation: { escapeValue: false } })}
                  </Button>
                </Box>
              )}
              <ChatBox
                disabled={isStreaming}
                isTokenLimitExceeded={tokenLimitExceeded}
                budgetResetsAt={budgetResetsAt}
                fileInputRef={fileInputRef}
                fileName={fileName}
                setFileName={setFileName}
                messageWarning={messageWarning}
                handleCancel={handleCancel}
                handleContinue={(_, ignoredWarnings) => {
                  handleSendMessage('', true, ignoredWarnings)
                  document.getElementById('chat-input')?.focus()
                }}
                handleSubmit={handleChatBoxSubmit}
                handleReset={handleResetRequest}
                handleStop={() => {
                  streamControllerRef.current?.abort('user_aborted')
                  setEndState('canceled')
                }}
                isMobile={isMobile}
                currentModel={activeModel}
                setModel={setActiveModel}
                isNewResponseAvailable={isNewResponseAvailable}
                onGoToLatestResponse={handleGoToLatestResponse}
                quizPrompt={quizPrompt}
                actionsRef={chatBoxRef}
                folderControls={
                  canAttachFolders && myFilesStore ? (
                    <AttachFolders store={myFilesStore} attachedFolders={attachedFolders} onChange={setAttachedFolders} />
                  ) : undefined
                }
              />
            </Box>
          </Box>
        </Box>
      </Box>
      {/* File viewer slot ------------------------------------------------------------------------------------------------ */}
      {/* Kept in the same place in every layout, so the viewer keeps its file and position when the layout changes. */}
      {viewerTarget && myFilesStore && (
        <>
          {splitView && <SplitSeparator value={splitRatio} onChange={setSplitRatio} getRange={getSplitRange} controls="chat-column" />}
          <Box
            ref={measureSlot}
            data-testid="file-viewer-slot"
            sx={{
              flex: splitView ? `${1 - splitRatio} 1 0px` : 1,
              minWidth: 0,
              height: '100vh',
              position: 'sticky',
              top: 0,
              display: splitView || narrowViewerShown ? 'flex' : 'none',
              flexDirection: 'column',
            }}
          >
            <Box ref={viewerBoxRef} sx={{ flex: 1, minHeight: 0, display: sourcesInSlot ? 'none' : 'block' }}>
              <Suspense fallback={null}>
                <FileViewer
                  store={myFilesStore}
                  target={viewerTarget}
                  onClose={closeViewer}
                  onAddQuote={addQuote}
                  quickActionsDisabled={isStreaming}
                  floatingToolbar={!isNarrow && !isCoarsePointer}
                  onBackToChat={isNarrow ? showNarrowChat : undefined}
                />
              </Suspense>
            </Box>
            {sourcesInSlot && (
              <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
                <ToolResult key={toolResultsKey} toolResults={shownToolResults} open onToggle={closeSourcesInSlot} />
              </Box>
            )}
          </Box>
        </>
      )}
      {/* FileSearchResults columns ----------------------------------------------------------------------------------------------- */}
      {isMobile ? (
        <Drawer
          anchor="right"
          open={hasToolResults && rightMenuExpanded}
          onClose={() => setRightMenuExpanded(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: '100%',
              maxWidth: '100%',
              padding: 0,
            },
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: '1rem',
              paddingX: '1rem',
              paddingBottom: '1rem',
              overflow: 'auto',
            }}
          >
            {hasToolResults && <ToolResult key={toolResultsKey} toolResults={shownToolResults} open onToggle={() => setRightMenuExpanded(false)} />}
          </Box>
        </Drawer>
      ) : (
        hasToolResults &&
        !sourcesInSlot && (
          <Box
            sx={{
              width: rightPanelContentWidth,
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'sticky',
              top: 0,
              borderLeft: '1px solid',
              borderLeftColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <ToolResult
              key={toolResultsKey}
              toolResults={shownToolResults}
              open={rightMenuExpanded}
              onToggle={() => setRightMenuExpanded(!rightMenuExpanded)}
            />
          </Box>
        )
      )}

      {/* Modals routes ------------------------------------------------------------------------------------------------------------ */}
      <PromptEditorState.Provider
        value={{
          hasChanges,
          setHasChanges,
          cacheKey,
          setCacheKey,
        }}
      >
        <Routes>
          <Route
            element={
              <TemplateModal root={`/${courseId}`} open>
                <Outlet />
              </TemplateModal>
            }
          >
            <Route path={`prompts`} element={<PromptModalV2 />} />
            <Route path={`userrags`} element={<RagModal />} />
          </Route>
        </Routes>
      </PromptEditorState.Provider>
      <ResetConfirmModal open={resetConfirmModalOpen} setOpen={setResetConfirmModalOpen} onConfirm={handleReset} />
    </Box>
  )
}

export const ChatV2 = () => {
  // The viewer follows My files: not in embedded mode and not without OPFS. The open file is per course (or general chat).
  const isEmbeddedMode = useIsEmbedded()
  const myFilesStore = useMyFilesStore()
  const { courseId } = useParams()
  return (
    <PromptStateProvider>
      <FileViewerProvider available={!isEmbeddedMode && !!myFilesStore} chatContext={courseId ?? 'general'}>
        <ChatV2Content />
      </FileViewerProvider>
    </PromptStateProvider>
  )
}
