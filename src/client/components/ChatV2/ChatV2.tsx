import { Alert, Box, Button, Divider, Drawer, FormControlLabel, IconButton, Link, Paper, Switch, Typography, useMediaQuery, useTheme } from '@mui/material'
import ChevronLeft from '@mui/icons-material/ChevronLeft'
import Tune from '@mui/icons-material/Tune'
import HelpIcon from '@mui/icons-material/Help'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SettingsIcon from '@mui/icons-material/Settings'
import { enqueueSnackbar } from 'notistack'
import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, FREE_MODEL, type ValidModelName, ValidModelNameSchema } from '../../../config'
import type { ChatMessage, MessageGenerationInfo, ToolCallResultEvent } from '@shared/chat'
import { getLanguageValue } from '@shared/utils'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import { useChatScroll } from './useChatScroll'
import useCourse from '../../hooks/useCourse'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import useUserStatus from '../../hooks/useUserStatus'
import { useAnalyticsDispatch } from '../../stores/analytics'
import type { Course } from '../../types'
import Footer from '../Footer'
import { ChatBox } from './ChatBox'
import { DisclaimerModal } from './Disclaimer'
import EmailButton from './EmailButton'
import { handleCompletionStreamError } from './error'
import ToolResult from './ToolResult'
import { OutlineButtonBlack, TextButton, GrayButton } from './general/Buttons'
import { ChatInfo } from './general/ChatInfo'
import { SettingsModal } from './SettingsModal'
import { StreamAbortReason, TypedAbortController, useChatStream } from './useChatStream'
import { postCompletionStreamV3, sendConversationEmail } from './api'
import PromptSelector from './PromptSelector'
import ModelSelector from './ModelSelector'
import { ConversationSplash } from './general/ConversationSplash'
import { PromptStateProvider, usePromptState } from './PromptState'
import z from 'zod/v4'
import useCurrentUser from '../../hooks/useCurrentUser'
import { InfoTexts } from '../../locales/infoTexts'
import { WarningType } from '@shared/aiApi'
import { ResetConfirmModal } from './ResetConfirmModal'
import TuneIcon from '@mui/icons-material/Tune'

import SideBar from './SideBar'
import ChatMenu from './ChatMenu'

import hyLogo from '../../assets/hy_logo.svg'


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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const { data: course } = useCourse(courseId)
  const { user } = useCurrentUser()

  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  // local storage states
  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'

  const [activeModel, setActiveModel] = useLocalStorageStateWithURLDefault('model-v2', DEFAULT_MODEL, 'model', ValidModelNameSchema)
  const [disclaimerStatus, setDisclaimerStatus] = useLocalStorageState<boolean>('disclaimer-status', true)
  const [modelTemperature, setModelTemperature] = useLocalStorageStateWithURLDefault(
    `${localStoragePrefix}-chat-model-temperature`,
    String(DEFAULT_MODEL_TEMPERATURE),
    'temperature',
    z.coerce.number(),
  )

  const [messages, setMessages] = useLocalStorageState(`${localStoragePrefix}-chat-messages`, [] as ChatMessage[])
  const [saveConsent, setSaveConsent] = useLocalStorageState<boolean>('save-consent', false)

  // App States
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [messageWarning, setMessageWarning] = useState<{ [key in WarningType]?: { message: string, ignored: boolean } }>({})
  const [chatLeftSidePanelOpen, setChatLeftSidePanelOpen] = useState<boolean>(false)
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
  const inputFieldRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const [resetConfirmModalOpen, setResetConfirmModalOpen] = useState<boolean>(false)

  const chatScroll = useChatScroll()

  const { t, i18n } = useTranslation()

  const { promptInfo } = usePromptState()

  const disclaimerInfo = InfoTexts.disclaimer[i18n.language]

  const { processStream, completion, isStreaming, setIsStreaming, toolCalls, streamControllerRef, generationInfo } = useChatStream({
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

    const newMessages = resendPrevious ? messages : messages.concat({
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
        streamControllerRef.current.abort("timeout_error")
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
          courseId,
        },
        streamControllerRef.current,
      )

      if ("error" in res) {
        console.error('API error:', res.error)
        handleCancel()
        enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
        return
      }

      const newWarnings = { ...messageWarning }

      if ("warnings" in res) {
        res.warnings.forEach(warning => {
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

    streamControllerRef.current?.abort("conversation_cleared")
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
  }, [userStatus, course])

  const rightMenuOpen = !!activeToolResult
  const rightMenuWidth = rightMenuOpen ? '300px' : '0px'

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

  // For new sidebar revamp dev
  const isAdmin = user?.isAdmin
  const [newSideBar, setNewSidebar] = useState(false)

  if (course && course.usageLimit === 0) {
    return (
      <Box>
        <ChatInfo course={course} />
        <Alert severity="warning" style={{ marginTop: 20 }}>
          <Typography variant="h6">{t('course:curreNotOpen')}</Typography>
        </Alert>
      </Box>
    )
  }

  if (course?.activityPeriod) {
    const isResponsible = user?.isAdmin || course.responsibilities?.some((r) => r.user.id === user?.id)

    const { startDate, endDate } = course.activityPeriod
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()

    if (now < start && !isResponsible) {
      return (
        <Box>
          <ChatInfo course={course} />
          <Alert severity="warning" style={{ marginTop: 20 }}>
            <Typography variant="h6">{t('course:curreNotStarted')}</Typography>
          </Alert>
        </Box>
      )
    }

    if (now > end && !isResponsible) {
      return (
        <Box>
          <ChatInfo course={course} />
          <Alert severity="warning" style={{ marginTop: 20 }}>
            <Typography variant="h6">{t('course:curreExpired')}</Typography>
          </Alert>
        </Box>
      )
    }
  }

  if (statusLoading) return null


  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
      }}
    >

      <Box sx={{ position: 'fixed', top: 64, right: 20, zIndex: 999 }}>
        <ChatMenu newSideBar={newSideBar} />
        {!isMobile && <OutlineButtonBlack onClick={() => setNewSidebar(prev => !prev)} sx={{ position: 'absolute', left: -500, top: 0 }} variant='contained'>Admins: toggle old sidebar</OutlineButtonBlack>}
      </Box>


      {/* Chat side panel column -------------------------------------------------------------------------------------------*/}
      {!isEmbeddedMode &&
        (isMobile ? (
          <Drawer
            open={chatLeftSidePanelOpen}
            onClose={() => {
              setChatLeftSidePanelOpen(!chatLeftSidePanelOpen)
            }}
          >
            <LeftMenu
              handleReset={() => setResetConfirmModalOpen(true)}
              onClose={() => {
                setChatLeftSidePanelOpen(false)
              }}
              course={course}
              setSettingsModalOpen={setSettingsModalOpen}
              setDisclaimerStatus={setDisclaimerStatus}
              messages={messages}
              currentModel={activeModel}
              setModel={setActiveModel}
            />
          </Drawer>
        ) : isAdmin && newSideBar ?
          (
            <SideBar
              isAdmin={isAdmin}
              course={course}
              handleReset={() => setResetConfirmModalOpen(true)}
              setSettingsModalOpen={setSettingsModalOpen}
              setDisclaimerStatus={setDisclaimerStatus}
              messages={messages}
              currentModel={activeModel}
              setModel={setActiveModel}
            />
          )
          :
          (
            <LeftMenu
              sx={{
                display: { sm: 'none', md: 'flex' },
                position: 'sticky',
                top: 0,
              }}
              course={course}
              handleReset={() => setResetConfirmModalOpen(true)}
              setSettingsModalOpen={setSettingsModalOpen}
              setDisclaimerStatus={setDisclaimerStatus}
              messages={messages}
              currentModel={activeModel}
              setModel={setActiveModel}
            />
          ))}

      {/* Chat view column ------------------------------------------------------------------------------------------------ */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isMobile && (<GrayButton
          sx={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translate(-50%) rotate(-90deg)',
          }}
          onClick={() => setChatLeftSidePanelOpen(true)}
          data-testid="left-panel-open"
        >
          <SettingsIcon />
        </GrayButton>)}
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
          {course?.saveDiscussions && (
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
                  {course?.notOptoutSaving ? t('course:isSavedNotOptOut') : t('course:isSavedOptOut')}
                </Typography>
              </Box>

              {!course.notOptoutSaving && course.saveDiscussions && (
                <FormControlLabel
                  control={<Switch onChange={() => setSaveConsent(!saveConsent)} checked={saveConsent} />}
                  label={saveConsent ? t('chat:allowSave') : t('chat:denySave')}
                />
              )}
            </Paper>
          )}

          <Conversation
            initial={<ConversationSplash courseName={course && getLanguageValue(course.name, i18n.language)} courseDate={course?.activityPeriod} />}
            messages={messages}
            completion={completion}
            generationInfo={generationInfo}
            isStreaming={isStreaming}
            toolCalls={toolCalls}
            setActiveToolResult={setActiveToolResult}
            isMobile={isMobile}
          />
        </Box>
        <Box
          ref={inputFieldRef}
          sx={{
            backgroundColor: 'white',
            width: '100%',
            paddingBottom: '2rem',            // margin: '0 auto',
            padding: isMobile ? '0rem 1rem 1rem 1rem' : '0rem 2rem 2rem 2rem',
            position: 'sticky',
            bottom: 0,
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
            handleReset={() => setResetConfirmModalOpen(true)}
            handleStop={() => streamControllerRef.current?.abort("user_aborted")}
            isMobile={isMobile}
          />
        </Box>
      </Box>

      {/* FileSearchResults columns ----------------------------------------------------------------------------------------------------- */}

      {
        isMobile ? (
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
                width: rightMenuWidth,
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
        )
      }

      {/* Modals --------------------------------------*/}
      <SettingsModal
        open={settingsModalOpen}
        setOpen={setSettingsModalOpen}
        modelTemperature={modelTemperature}
        setModelTemperature={(updatedTemperature) => setModelTemperature(updatedTemperature)}
      />

      <DisclaimerModal disclaimer={disclaimerInfo} disclaimerStatus={disclaimerStatus} setDisclaimerStatus={setDisclaimerStatus} />

      <ResetConfirmModal open={resetConfirmModalOpen} setOpen={setResetConfirmModalOpen} onConfirm={handleReset} />
    </Box >
  )
}

const LeftMenu = ({
  sx = {},
  course,
  handleReset,
  onClose,
  setSettingsModalOpen,
  setDisclaimerStatus,
  messages,
  currentModel,
  setModel,
}: {
  sx?: object
  course: Course | undefined
  handleReset: () => void
  onClose?: () => void
  setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDisclaimerStatus: React.Dispatch<React.SetStateAction<boolean>>
  messages: ChatMessage[]
  currentModel: ValidModelName
  setModel: (model: ValidModelName) => void
}) => {
  const { t } = useTranslation()
  const { courseId } = useParams()
  const { userStatus, isLoading: statusLoading } = useUserStatus(courseId)
  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)

  useEffect(() => {
    if (!userStatus) return
    setIsTokenLimitExceeded(userStatus.usage > userStatus.limit)
  }, [statusLoading, userStatus])

  return (
    <Box
      sx={[
        {
          width: { md: 250, lg: 300 },
          position: 'relative',
          height: '100vh',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          paddingTop: '4rem',
          display: 'flex',
          flexDirection: 'column',
        },
        sx,
      ]}
    >

      <Box p="1rem">
        {course && <ChatInfo course={course} />}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <OutlineButtonBlack startIcon={<RestartAltIcon />} onClick={handleReset} data-testid="empty-conversation-button">
            {t('chat:emptyConversation')}
          </OutlineButtonBlack>
          <ModelSelector currentModel={currentModel} setModel={setModel} isTokenLimitExceeded={isTokenLimitExceeded} />
          <PromptSelector />
          <EmailButton messages={messages} disabled={!messages?.length} />
          <OutlineButtonBlack startIcon={<TuneIcon />} onClick={() => setSettingsModalOpen(true)} data-testid="settings-button">
            {t('chat:settings')}
          </OutlineButtonBlack>
          <OutlineButtonBlack startIcon={<HelpIcon />} onClick={() => setDisclaimerStatus(true)} data-testid="help-button">
            {t('info:title')}
          </OutlineButtonBlack>
        </Box>
      </Box>
      {onClose && (
        <OutlineButtonBlack sx={{ m: '1rem', mt: 'auto' }} onClick={onClose} startIcon={<ChevronLeft />}>
          {t('common:close')}
        </OutlineButtonBlack>
      )}
      <Footer />
    </Box>
  )
}

export const ChatV2 = () => (
  <PromptStateProvider>
    <ChatV2Content />
  </PromptStateProvider>
)
