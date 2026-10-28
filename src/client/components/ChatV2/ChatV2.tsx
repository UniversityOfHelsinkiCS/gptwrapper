import { Box, Drawer, Paper, Typography, useMediaQuery, useTheme } from '@mui/material'
import { MapsUgc } from '@mui/icons-material'
import { enqueueSnackbar } from '../common/Snackbar'
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import { DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, DEFAULT_STREAM_TIMEOUT, FREE_MODEL, ValidModelNameSchema, getModelConfig } from '../../../config'
import type { ChatMessage, MessageContent, MessageGenerationInfo, ToolCallResultEvent } from '@shared/chat'
import { getLanguageValue } from '@shared/utils'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import { useChatScroll } from './useChatScroll'
import useCourse from '../../hooks/useCourse'
import useLocalStorageState, { useLocalStorageStateWithURLDefault } from '../../hooks/useLocalStorageState'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import useUserStatus from '../../hooks/useUserStatus'
import { invalidateUserUsage } from '../../hooks/useUserUsage'
import { useAnalyticsDispatch } from '../../stores/analytics'
import sidebarOpen from '../../assets/sidebar-open.svg'
import { ChatBox } from './ChatBox'
import { OutlineButtonBlack } from './general/Buttons'
import { handleCompletionStreamError } from './error'
import ToolResult from './ToolResult'
import { StreamAbortReason, TypedAbortController, useChatStream } from './useChatStream'
import { postCompletionStreamV3, sendConversationEmail, downloadDiscussionAsFile } from './api'
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
import { PromptEditorState } from '../Prompt/context'
import { usePageTitle } from '../../hooks/usePageTitle'

/**
 * Conversation rendering needs a lot of assets (mainly Katex) so we lazy load it to improve initial page load performance
 */
const Conversation = lazy(() => import('./Conversation'))

const ChatV2Content = () => {
  const { courseId } = useParams()
  const isEmbeddedMode = useIsEmbedded()
  const theme = useTheme()
  const chatScroll = useChatScroll()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { t, i18n } = useTranslation()
  const { promptInfo, isPromptHidden, activePrompt } = usePromptState()
  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()
  const ragHidden = activePrompt?.ragHidden

  const { processStream, completion, isStreaming, setIsStreaming, toolCalls, streamControllerRef, generationInfo, hasPotentialError } = useChatStream({
    onComplete: ({ message }) => {
      if (message.content.length > 0 || message.error) {
        setMessages((prev: ChatMessage[]) => prev.concat(message))
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
    onToolCallComplete: () => {
      dispatchAnalytics({ type: 'INCREMENT_FILE_SEARCHES' })
    },
  })

  // queries
  const { data: chatInstance, isLoading: chatInstanceLoading, error: chatInstanceLoadError } = useCourse(courseId)
  const { user, isLoading: userLoading } = useCurrentUser()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  // local storage states
  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'
  const [activeModel, setActiveModel] = useLocalStorageStateWithURLDefault('model-v2', DEFAULT_MODEL, 'model', ValidModelNameSchema)
  const [messages, setMessages] = useLocalStorageState(`${localStoragePrefix}-chat-messages`, [] as ChatMessage[])
  const [modelTemperature, _setModelTemperature] = useLocalStorageStateWithURLDefault(
    `${localStoragePrefix}-chat-model-temperature`,
    String(DEFAULT_MODEL_TEMPERATURE),
    'temperature',
    z.coerce.number(),
  )

  const tokenLimitExceeded = !!userStatus && userStatus.usage >= userStatus.limit

  // app states
  const [fileName, setFileName] = useState<string>('')
  const [messageWarning, setMessageWarning] = useState<{
    [key in WarningType]?: { message: string; ignored: boolean; tokenCount?: number; contextLimit?: number; tokenUsagePercentage?: number }
  }>({})
  const [activeToolResults, setActiveToolResults0] = useState<ToolCallResultEvent[] | undefined>()
  const [rightMenuExpanded, setRightMenuExpanded0] = useState<boolean>(false)
  const [resetConfirmModalOpen, setResetConfirmModalOpen] = useState<boolean>(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [cacheKey, setCacheKey] = useState('')
  const [endState, setEndState] = useState<'none' | 'canceled' | 'error'>('none')

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

  const handleSendMessage = async (message: string, resendPrevious: boolean, ignoredWarnings: WarningType[], messagesToResend?: ChatMessage[]) => {
    if (!userStatus) return

    const acualModel = activeModel
    if (tokenLimitExceeded && acualModel !== FREE_MODEL) {
      enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
      handleCancel('error')
      return
    }

    streamControllerRef.current = new TypedAbortController<StreamAbortReason>()

    const formData = new FormData()

    const file = fileInputRef.current?.files?.[0]

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
        })

    setMessages(newMessages)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
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

    try {
      const res = await postCompletionStreamV3(
        formData,
        {
          options: {
            generationInfo,
            chatMessages: newMessages,
            ignoredWarnings,
          },
          courseId: courseId !== 'general' ? courseId : undefined,
        },
        streamControllerRef.current,
      )

      logAdminTiming(`headers received after ${Math.round(performance.now() - armedAt)}ms`)

      if ('error' in res) {
        console.error('API error:', res)
        handleCompletionStreamError(res, fileName)
        handleCancel('error')
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

      if ('stream' in res) {
        await processStream(res.stream, generationInfo)
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
        setMessages((prev: ChatMessage[]) => prev.concat({ role: 'assistant', content: '', error: 'timeout_error', toolCalls: {}, generationInfo }))
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
        downloadDiscussionAsFile(messages, t, downloadFormat)
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

  const handleRetry = (messageIndex: number) => {
    const newMessages = messages.slice(0, messageIndex)
    setMessages(newMessages)

    // Pass the sliced history explicitly: setMessages is async, so the closure
    // inside handleSendMessage would otherwise still see the errored message.
    handleSendMessage('', true, [], newMessages)
  }

  useEffect(() => {
    if (tokenLimitExceeded) setActiveModel(FREE_MODEL)
  }, [tokenLimitExceeded])

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
      const toolResults = Object.values(message.toolCalls ?? {})
      if (toolResults.length > 0) return toolResults
    }
    return undefined
  }, [messages])
  const shownToolResults = activeToolResults ?? latestToolResults

  // layout
  const canShowToolResults = canManageCourse(chatInstance) || !(isPromptHidden || ragHidden) || activePrompt?.userId === user?.id
  const hasToolResults = !!shownToolResults && shownToolResults.length > 0 && canShowToolResults
  const toolResultsKey = shownToolResults?.map((toolResult) => toolResult.callId).join(',')
  const defaultCollapsedSidebar = user?.preferences?.collapsedSidebarDefault ?? false
  const leftPanelFloating = isEmbeddedMode || isMobile
  const [sideBarOpen, setSideBarOpen] = useState<boolean>(() => {
    return isMobile || isEmbeddedMode ? false : !defaultCollapsedSidebar
  })
  const leftPanelCollapsed = !sideBarOpen || leftPanelFloating
  const leftPanelContentWidth = leftPanelCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)'
  const rightPanelContentWidth = !hasToolResults || isMobile ? '0px' : rightMenuExpanded ? 'var(--right-menu-width)' : 'var(--sidebar-width-collapsed)'
  const rightPanelCollapsed = !isMobile && hasToolResults && !rightMenuExpanded

  useEffect(() => {
    if (!isEmbeddedMode) return
    // embedded chat has little room, so its always visible collapsed sidebar is narrower than normally
    document.documentElement.style.setProperty('--sidebar-width-collapsed', '36px')
    document.documentElement.style.setProperty('--sidebar-collapsed-button-padding', '6px')
    return () => {
      document.documentElement.style.removeProperty('--sidebar-width-collapsed')
      document.documentElement.style.removeProperty('--sidebar-collapsed-button-padding')
    }
  }, [isEmbeddedMode])

  useEffect(() => {
    if (!rightPanelCollapsed) return
    document.documentElement.style.setProperty('--global-menu-right-offset', 'var(--sidebar-width-collapsed)')
    return () => {
      document.documentElement.style.removeProperty('--global-menu-right-offset')
    }
  }, [rightPanelCollapsed])

  useEffect(() => {
    if (chatInstanceLoadError?.response?.status === 403) {
      enqueueSnackbar(t('error:noCourseAccess'), { variant: 'error' })
    }
  }, [chatInstanceLoadError])

  if (chatInstanceLoadError?.response?.status === 403) {
    return <Navigate to="/general" replace />
  }

  if (chatInstanceLoadError) {
    return <ApiErrorView error={chatInstanceLoadError} />
  }

  if (statusLoading || userLoading || chatInstanceLoading) return <HYLoadingSpinner />

  if (chatInstance?.accessLevel === 'STUDENT_CLOSED' && chatInstance.status !== 'ACTIVATED') {
    return <ChatExpiredView status={chatInstance.status} chatInstance={chatInstance} />
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
      <Box
        ref={chatContainerRef}
        data-skip-target
        tabIndex={-1}
        sx={{
          '&:focus-visible': { outline: 'none' },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          // magical -11px prevents horizontal overflow when vertical scrollbar appears
          width: `calc(100vw - 11px - ${leftPanelContentWidth} - ${rightPanelContentWidth})`,
          maxWidth: '1080px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {isMobile && !isEmbeddedMode && (
          <Box
            sx={{
              position: 'fixed',
              left: 15,
              top: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              zIndex: 999,
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
                <Typography variant="body1" fontWeight={600}>
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
            completion={hasPotentialError ? `${completion} ⚠️` : completion}
            generationInfo={generationInfo}
            isStreaming={isStreaming}
            endState={endState}
            toolCalls={toolCalls}
            setActiveToolResults={canShowToolResults ? openToolResults : undefined}
            isMobile={isMobile}
            onRetry={handleRetry}
            latestResponseIndex={latestResponseIndex}
            latestResponseRef={latestResponseRef}
          />
        </Box>
        <Box
          sx={{
            width: '100%',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <Box
            sx={{
              padding: isMobile ? '0rem 1rem 1rem 1rem' : '0rem 2rem 2rem 2rem',
            }}
          >
            <ChatBox
              disabled={isStreaming}
              isTokenLimitExceeded={tokenLimitExceeded}
              fileInputRef={fileInputRef}
              fileName={fileName}
              setFileName={setFileName}
              messageWarning={messageWarning}
              handleCancel={handleCancel}
              handleContinue={(_, ignoredWarnings) => {
                handleSendMessage('', true, ignoredWarnings)
                document.getElementById('chat-input')?.focus()
              }}
              handleSubmit={(newMessage) => {
                handleSendMessage(newMessage, false, [])
              }}
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
            />
          </Box>
        </Box>
      </Box>
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
        hasToolResults && (
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

export const ChatV2 = () => (
  <PromptStateProvider>
    <ChatV2Content />
  </PromptStateProvider>
)
