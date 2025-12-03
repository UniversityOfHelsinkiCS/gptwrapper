import { Alert, Box, Drawer, FormControlLabel, Paper, Switch, Typography, useMediaQuery, useTheme } from '@mui/material'
import { MapsUgc } from '@mui/icons-material'
import { enqueueSnackbar } from 'notistack'
import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, FREE_MODEL, ValidModelNameSchema } from '../../../config'
import type { ChatMessage, MessageGenerationInfo, ToolCallResultEvent } from '@shared/chat'
import { getLanguageValue } from '@shared/utils'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import { useChatScroll } from './useChatScroll'
import useCourse from '../../hooks/useCourse'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import useUserStatus from '../../hooks/useUserStatus'
import { useAnalyticsDispatch } from '../../stores/analytics'
import sidebarOpen from '../../assets/sidebar-open.svg'
import { ChatBox } from './ChatBox'
import { OutlineButtonBlack, TextButton } from './general/Buttons'
import { CourseSettingsModal } from './CourseSettingsModal'
import { handleCompletionStreamError } from './error'
import ToolResult from './ToolResult'
import { ChatInfo } from './general/ChatInfo'
import { StreamAbortReason, TypedAbortController, useChatStream } from './useChatStream'
import { postCompletionStreamV3, sendConversationEmail } from './api'
import { ConversationSplash } from './general/ConversationSplash'
import { PromptStateProvider, usePromptState } from './PromptState'
import z from 'zod/v4'
import useCurrentUser from '../../hooks/useCurrentUser'
import { WarningType } from '@shared/aiApi'
import { ResetConfirmModal } from './ResetConfirmModal'

import SideBar from './SideBar'

import { PromptEditor } from '../Prompt/PromptEditor'

import TemplateModal from './TemplateModal'
import PromptModal from './PromptModal'
import CoursesModal from './CoursesModal'
import HYLoadingSpinner from './general/HYLoadingSpinner'
import { CustomIcon } from './general/CustomIcon'
import { PromptInfoModal } from './PromptInfoModal'

/**
 * Conversation rendering needs a lot of assets (mainly Katex) so we lazy load it to improve initial page load performance
 */
const Conversation = lazy(() => import('./Conversation'))

function useLocalStorageStateWithURLDefault<T>(key: string, defaultValue: string, urlKey: string, schema: z.ZodType<T>) {
  const [value, setValue] = useLocalStorageState(key, defaultValue)
  const [searchParams, setSearchParams] = useSearchParams()
  const urlValue = searchParams.get(urlKey)

  // If urlValue is defined, it overrides the localStorage setting.
  // However if user changes the setting, the urlValue is removed.
  const modifiedSetValue = (newValue: T) => {
    if (newValue !== urlValue) {
      if (typeof newValue === 'string') {
        setValue(newValue)
      } else {
        setValue(String(newValue))
      }
      searchParams.delete(urlKey)
      setSearchParams(searchParams)
    }
  }

  const parsedValue = schema.safeParse(urlValue ?? value)

  if (parsedValue.success) {
    return [parsedValue.data, modifiedSetValue] as const
  }

  // if the value in localStorage is invalid then revert back to default
  setValue(defaultValue)
  return [defaultValue as T, modifiedSetValue] as const
}

const ChatV2Content = () => {
  const { courseId } = useParams()
  const isEmbeddedMode = useIsEmbedded()
  const theme = useTheme()
  const chatScroll = useChatScroll()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { t, i18n } = useTranslation()

  const { data: chatInstance, isLoading: instanceLoading } = useCourse(courseId)
  const { user, isLoading: userLoading } = useCurrentUser()
  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  // local storage states
  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'

  const [activeModel, setActiveModel] = useLocalStorageStateWithURLDefault('model-v2', DEFAULT_MODEL, 'model', ValidModelNameSchema)
  const [modelTemperature, setModelTemperature] = useLocalStorageStateWithURLDefault(
    `${localStoragePrefix}-chat-model-temperature`,
    String(DEFAULT_MODEL_TEMPERATURE),
    'temperature',
    z.coerce.number(),
  )

  const [messages, setMessages] = useLocalStorageState(`${localStoragePrefix}-chat-messages`, [] as ChatMessage[])
  const [saveConsent, setSaveConsent] = useLocalStorageState<boolean>('save-consent', false)

  const [fileName, setFileName] = useState<string>('')
  const [messageWarning, setMessageWarning] = useState<{ [key in WarningType]?: { message: string; ignored: boolean } }>({})

  const defaultCollapsedSidebar = user?.preferences?.collapsedSidebarDefault ?? false
  const [sideBarOpen, setSideBarOpen] = useState<boolean>(() => {
    return isMobile ? false : !defaultCollapsedSidebar
  })

  const leftPanelFloating = isEmbeddedMode || isMobile

  const [activeToolResult, setActiveToolResult0] = useState<ToolCallResultEvent | undefined>()

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
  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const [resetConfirmModalOpen, setResetConfirmModalOpen] = useState<boolean>(false)

  const { promptInfo } = usePromptState()

  const { processStream, completion, isStreaming, setIsStreaming, toolCalls, streamControllerRef, generationInfo, hasPotentialError } = useChatStream({
    onComplete: ({ message }) => {
      if (message.content.length > 0) {
        setMessages((prev: ChatMessage[]) => prev.concat(message))
        refetchStatus()
      }
      chatScroll.autoScroll()
    },
    onText: () => {
      chatScroll.autoScroll()
    },
    onError: (error) => {
      handleCompletionStreamError(error, fileName)
      enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
    },
    onToolCallComplete: (toolResult) => {
      if (!isMobile) {
        setActiveToolResult(toolResult)
      }
      dispatchAnalytics({ type: 'INCREMENT_FILE_SEARCHES' })
    },
  })

  const handleSendMessage = async (message: string, resendPrevious: boolean, ignoredWarnings: WarningType[]) => {
    if (!userStatus) return
    const { usage, limit } = userStatus
    const tokenUsageExceeded = usage >= limit

    const acualModel = (promptInfo.type === 'saved' ? promptInfo.model : null) ?? activeModel

    if (tokenUsageExceeded && acualModel !== FREE_MODEL) {
      enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
      handleCancel()
      return
    }

    streamControllerRef.current = new TypedAbortController<StreamAbortReason>()

    const formData = new FormData()

    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('file', file)
    }

    const newMessages = resendPrevious
      ? messages
      : messages.concat({
        role: 'user',
        content: message,
        attachments: file && fileName ? fileName : undefined,
      })

    setMessages(newMessages)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
    setRetryTimeout(() => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort('timeout_error')
      }
    }, 5000)

    setIsStreaming(true)
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
            saveConsent,
            ignoredWarnings,
          },
          courseId: (courseId !== 'general') ? courseId : undefined,
        },
        streamControllerRef.current,
      )

      if ('error' in res) {
        console.error('API error:', res.error)
        handleCancel()
        enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
        return
      }

      const newWarnings = { ...messageWarning }

      if ('warnings' in res) {
        res.warnings.forEach((warning) => {
          newWarnings[warning.warningType] = { message: warning.warning, ignored: false }
        })
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

      clearRetryTimeout()

      if ('stream' in res) {
        await processStream(res.stream, generationInfo)
      } else {
        console.error('API error: No stream in response')
        handleCancel()
        enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
      }
    } catch (err: any) {
      console.error(err)
      handleCancel()
    }
  }

  const handleResetRequest = () => {
    if (user?.preferences?.skipNewConversationConfirm) {
      handleReset({ sendEmail: false })
    } else {
      setResetConfirmModalOpen(true)
    }
  }

  const handleReset = async ({ sendEmail }: { sendEmail: boolean }) => {
    if (sendEmail && user?.email) {
      try {
        await sendConversationEmail(user.email, messages, t)
        enqueueSnackbar(t('email:success'), { variant: 'success' })
      } catch (error) {
        console.error('Failed to send conversation email:', error)
        enqueueSnackbar(t('email:failure'), { variant: 'error' })
      }
    }

    setResetConfirmModalOpen(false)

    streamControllerRef.current?.abort('conversation_cleared')
    setMessages([])
    setActiveToolResult(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
    setMessageWarning({})
    clearRetryTimeout()
    dispatchAnalytics({ type: 'RESET_CHAT' })
  }

  const handleCancel = () => {
    setMessageWarning({})
    setIsStreaming(false)
    clearRetryTimeout()
  }

  useEffect(() => {
    if (!userStatus) return

    const { usage, limit } = userStatus

    const tokenUseExceeded = usage >= limit

    if (tokenUseExceeded) {
      setActiveModel(FREE_MODEL)
      return
    }
  }, [userStatus, chatInstance])

  const rightMenuOpen = !!activeToolResult

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
  const setActiveToolResult = useCallback(
    (toolResult: ToolCallResultEvent | undefined) => {
      handleLayoutShift()
      setActiveToolResult0(toolResult)
    },
    [handleLayoutShift],
  )

  if (statusLoading || userLoading || instanceLoading) return <HYLoadingSpinner />


  if (chatInstance?.activityPeriod) {
    const isResponsible = user?.isAdmin || chatInstance.responsibilities?.some((r) => r.user.id === user?.id)

    const { startDate, endDate } = chatInstance.activityPeriod
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()

    if (now < start && !isResponsible) {
      return (
        <Box>
          <ChatInfo course={chatInstance} />
          <Alert severity="warning" style={{ marginTop: 20 }}>
            <Typography variant="h6">{t('course:curreNotStarted')}</Typography>
          </Alert>
        </Box>
      )
    }

    if (now > end && !isResponsible) {
      return (
        <Box>
          <ChatInfo course={chatInstance} />
          <Alert severity="warning" style={{ marginTop: 20 }}>
            <Typography variant="h6">{t('course:curreExpired')}</Typography>
          </Alert>
        </Box>
      )
    }
  }

  const leftPanelCollapsed = !sideBarOpen || leftPanelFloating
  const leftPanelContentWidth = leftPanelCollapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)'
  const rightPanelContentWidth = rightMenuOpen ? 'var(--right-menu-width)' : '0px'

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
      }}
    >
      {/* Chat side panel column -------------------------------------------------------------------------------------------*/}
      {(isEmbeddedMode || isMobile) ? (
        <Drawer
          open={sideBarOpen}
          onClose={() => {
            setSideBarOpen(!sideBarOpen)
          }}
        >
          <SideBar
            open={true} // always open in drawer
            setOpen={setSideBarOpen}
            course={chatInstance}
            handleReset={handleResetRequest}
            messages={messages}
            currentModel={activeModel}
            setModel={setActiveModel}
          />
        </Drawer>
      ) : (
        <SideBar
          open={sideBarOpen}
          setOpen={setSideBarOpen}
          course={chatInstance}
          handleReset={handleResetRequest}
          messages={messages}
          currentModel={activeModel}
          setModel={setActiveModel}
        />
      )}
      {/* Chat view column ------------------------------------------------------------------------------------------------ */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          // magical -11px prevents horizontal overflow when vertical scrollbar appears
          width: `calc(100vw - 11px - ${leftPanelContentWidth} - ${rightPanelContentWidth})`,
        }}
      >
        {(isEmbeddedMode || isMobile) && (
          <Box sx={{
            position: 'fixed',
            left: 15,
            top: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            zIndex: 999
          }}>
            <OutlineButtonBlack
              onClick={() => setSideBarOpen(true)}
              data-testid="left-panel-open"
            >
              <CustomIcon src={sidebarOpen} />
            </OutlineButtonBlack>
            <OutlineButtonBlack onClick={handleResetRequest} data-testid="new-conversation-button">
              <MapsUgc fontSize='small' />
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
                  {chatInstance?.notOptoutSaving ? t('course:isSavedNotOptOut') : t('course:isSavedOptOut')}
                </Typography>
              </Box>

              {!chatInstance.notOptoutSaving && chatInstance.saveDiscussions && (
                <FormControlLabel
                  control={<Switch onChange={() => setSaveConsent(!saveConsent)} checked={saveConsent} />}
                  label={saveConsent ? t('chat:allowSave') : t('chat:denySave')}
                />
              )}
            </Paper>
          )}

          <Conversation
            initial={
              <ConversationSplash courseName={chatInstance && getLanguageValue(chatInstance.name, i18n.language)} courseDate={chatInstance?.activityPeriod} />
            }
            messages={messages}
            completion={hasPotentialError ? `${completion} ⚠️` : completion}
            generationInfo={generationInfo}
            isStreaming={isStreaming}
            toolCalls={toolCalls}
            setActiveToolResult={setActiveToolResult}
            isMobile={isMobile}
          />
        </Box>
        <Box
          sx={{
            backgroundColor: 'white',
            width: '100%',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <Box
            sx={{
              paddingBottom: '2rem',
              padding: isMobile ? '0rem 1rem 1rem 1rem' : '0rem 2rem 2rem 2rem',
            }}
          >
            <ChatBox
              disabled={isStreaming}
              fileInputRef={fileInputRef}
              fileName={fileName}
              setFileName={setFileName}
              messageWarning={messageWarning}
              handleCancel={handleCancel}
              handleContinue={(_, ignoredWarnings) => handleSendMessage('', true, ignoredWarnings)}
              handleSubmit={(newMessage) => {
                handleSendMessage(newMessage, false, [])
              }}
              handleReset={handleResetRequest}
              handleStop={() => streamControllerRef.current?.abort('user_aborted')}
              isMobile={isMobile}
            />
          </Box>
        </Box>
      </Box>
      {/* FileSearchResults columns ----------------------------------------------------------------------------------------------- */}
      {isMobile ? (
        <Drawer
          anchor="right"
          open={!!activeToolResult}
          onClose={() => setActiveToolResult(undefined)}
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
            {activeToolResult && <ToolResult toolResult={activeToolResult} setActiveToolResult={setActiveToolResult} />}
          </Box>
        </Drawer>
      ) : (
        !!activeToolResult && (
          <Box
            sx={{
              width: rightPanelContentWidth,
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'sticky',
              top: 0,
              borderLeft: '1px solid rgba(0,0,0,0.12)',
              paddingTop: !isEmbeddedMode ? '4rem' : 0,
            }}
          >
            <ToolResult toolResult={activeToolResult} setActiveToolResult={setActiveToolResult} />
          </Box>
        )
      )}

      {/* Modals routes ------------------------------------------------------------------------------------------------------------ */}
      <Routes>
        <Route element={
          <TemplateModal root={`/${courseId}`} open >
            <Outlet />
          </TemplateModal>
        }>
          <Route path={`course/*`} element={<CourseSettingsModal />} />
          <Route path={`courses`} element={<CoursesModal />} />
          <Route path={`prompts`} element={<PromptModal />} />
          <Route path={`prompt/:promptId`} element={<PromptEditor back={`/${courseId}`} />} />
          <Route path={`show/:promptId`} element={<PromptInfoModal back={`/${courseId}`} />} />
        </Route>
      </Routes>
      <ResetConfirmModal open={resetConfirmModalOpen} setOpen={setResetConfirmModalOpen} onConfirm={handleReset} />
    </Box>
  )
}

export const ChatV2 = () => (
  <PromptStateProvider>
    <ChatV2Content />
  </PromptStateProvider>
)
