import { ArrowDownward, ChevronLeft, MenuBookTwoTone, Tune, WidthFull } from '@mui/icons-material'
import HelpIcon from '@mui/icons-material/Help'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import { Alert, Box, Drawer, Fab, FormControlLabel, Paper, Switch, Typography, useMediaQuery, useTheme } from '@mui/material'
import type { TFunction } from 'i18next'
import { enqueueSnackbar } from 'notistack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, FREE_MODEL, inProduction, validModels } from '../../../config'
import type { ToolCallResultEvent } from '../../../shared/chat'
import type { RagIndexAttributes } from '../../../shared/types'
import { getLanguageValue } from '../../../shared/utils'
import { useIsEmbedded } from '../../contexts/EmbeddedContext'
import { useChatScroll } from '../../hooks/useChatScroll'
import useCourse from '../../hooks/useCourse'
import useCurrentUser from '../../hooks/useCurrentUser'
import useInfoTexts from '../../hooks/useInfoTexts'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { useCourseRagIndices } from '../../hooks/useRagIndices'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import useUserStatus from '../../hooks/useUserStatus'
import { useAnalyticsDispatch } from '../../stores/analytics'
import type { Course, Message, Prompt } from '../../types'
import Footer from '../Footer'
import { ChatBox } from './ChatBox'
import { Conversation } from './Conversation'
import { DisclaimerModal } from './Disclaimer'
import EmailButton from './EmailButton'
import { handleCompletionStreamError } from './error'
import ToolResult from './ToolResult'
import { OutlineButtonBlack } from './general/Buttons'
import { ChatInfo } from './general/ChatInfo'
import RagSelector from './RagSelector'
import { SettingsModal, useUrlPromptId } from './SettingsModal'
import { useChatStream } from './useChatStream'
import { getCompletionStreamV3 } from './util'
import PromptSelector from './PromptSelector'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import apiClient from '../../util/apiClient'
import ModelSelector from './ModelSelector'

function useLocalStorageStateWithURLDefault(key: string, defaultValue: string, urlKey: string) {
  const [value, setValue] = useLocalStorageState(key, defaultValue)
  const [searchParams, setSearchParams] = useSearchParams()
  const urlValue = searchParams.get(urlKey)

  // If urlValue is defined, it overrides the localStorage setting.
  // However if user changes the setting, the urlValue is removed.
  const modifiedSetValue = (newValue: string) => {
    if (newValue !== urlValue) {
      setValue(newValue)
      searchParams.delete(urlKey)
      setSearchParams(searchParams)
    }
  }

  return [urlValue ?? value, modifiedSetValue] as const
}

export const ChatV2 = () => {
  const { courseId } = useParams()
  const isEmbeddedMode = useIsEmbedded()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const { data: course } = useCourse(courseId)
  const { ragIndices } = useCourseRagIndices(course?.id)
  const { infoTexts } = useInfoTexts()

  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  const { user } = useCurrentUser()

  // local storage states
  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'
  const [activeModel, setActiveModel] = useLocalStorageStateWithURLDefault('model-v2', DEFAULT_MODEL, 'model')
  const [disclaimerStatus, setDisclaimerStatus] = useLocalStorageState<boolean>('disclaimer-status', true)
  const [customSystemMessage, setCustomSystemMessage] = useLocalStorageState<string>(`${localStoragePrefix}-chat-instructions`, DEFAULT_ASSISTANT_INSTRUCTIONS)
  const [activePrompt, setActivePrompt] = useLocalStorageState<Prompt | undefined>(`${localStoragePrefix}-active-prompt`, undefined)
  const [modelTemperature, setModelTemperature] = useLocalStorageStateWithURLDefault(
    `${localStoragePrefix}-chat-model-temperature`,
    String(DEFAULT_MODEL_TEMPERATURE),
    'temperature',
  )

  const [messages, setMessages] = useLocalStorageState(`${localStoragePrefix}-chat-messages`, [] as Message[])
  const [saveConsent, setSaveConsent] = useLocalStorageState<boolean>('save-consent', false)

  // App States
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState<string>('')
  const [tokenUsageAlertOpen, setTokenUsageAlertOpen] = useState<boolean>(false)
  const [allowedModels, setAllowedModels] = useState<string[]>([])
  const [chatLeftSidePanelOpen, setChatLeftSidePanelOpen] = useState<boolean>(false)
  // RAG states
  const [ragIndexId, setRagIndexId] = useState<number | undefined>()
  const [activeToolResult, setActiveToolResult0] = useState<ToolCallResultEvent | undefined>()
  const ragIndex = ragIndices?.find((index) => index.id === ragIndexId)

  // Analytics
  const dispatchAnalytics = useAnalyticsDispatch()
  useEffect(() => {
    dispatchAnalytics({
      type: 'SET_ANALYTICS_DATA',
      payload: {
        model: activeModel,
        courseId,
        nMessages: messages.length,
        ragIndexId,
        ragIndexName: ragIndex?.metadata.name,
      },
    })
  }, [messages, courseId, ragIndexId, activeModel, dispatchAnalytics])

  // Refs
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const conversationRef = useRef<HTMLElement | null>(null)
  const inputFieldRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const chatScroll = useChatScroll()

  const { t, i18n } = useTranslation()

  const disclaimerInfo = infoTexts?.find((infoText) => infoText.name === 'disclaimer')?.text[i18n.language] ?? null

  const { processStream, completion, isStreaming, setIsStreaming, toolCalls, streamController } = useChatStream({
    onComplete: ({ message }) => {
      if (message.content.length > 0) {
        setMessages((prev: Message[]) => prev.concat(message))
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

  const handleSubmit = async (message: string, ignoreTokenUsageWarning: boolean) => {
    if (!userStatus) return
    const { usage, limit } = userStatus
    const tokenUsageExceeded = usage >= limit

    if (tokenUsageExceeded && activeModel !== FREE_MODEL) {
      enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
      handleCancel()
      return
    }

    const formData = new FormData()

    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('file', file)
    }

    const newMessages = messages.concat({
      role: 'user',
      content: message,
      attachements: file && fileName ? fileName : undefined,
    })

    setMessages(newMessages)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFileName('')
    setRetryTimeout(() => {
      if (streamController) {
        streamController.abort()
      }
    }, 5000)

    setIsStreaming(true)
    chatScroll.beginAutoscroll()

    try {
      const { tokenUsageAnalysis, stream } = await getCompletionStreamV3({
        systemMessage: activePrompt?.systemMessage || customSystemMessage,
        messages: newMessages,
        ragIndexId,
        model: activeModel,
        formData,
        modelTemperature: parseFloat(modelTemperature),
        courseId,
        abortController: streamController,
        saveConsent,
      })

      if (!stream && !tokenUsageAnalysis) {
        console.error('getCompletionStream did not return a stream or token usage analysis')
        handleCancel()
        enqueueSnackbar(t('chat:errorInstructions'), { variant: 'error' })
        return
      }

      if (ignoreTokenUsageWarning) {
        setTokenUsageWarning('')
        setTokenUsageAlertOpen(false)
      } else if (tokenUsageAnalysis?.tokenUsageWarning) {
        setTokenUsageWarning(tokenUsageAnalysis.message)
        setTokenUsageAlertOpen(true)
        return
      }

      clearRetryTimeout()
      if (stream) {
        await processStream(stream)
      }
    } catch (err: any) {
      console.error(err)
      handleCancel()
    }
  }

  const handleReset = () => {
    if (window.confirm(t('chat:emptyConfirm'))) {
      setMessages([])
      setActiveToolResult(undefined)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileName('')
      setTokenUsageWarning('')
      setTokenUsageAlertOpen(false)
      setRetryTimeout(() => {
        if (streamController) {
          streamController.abort()
        }
      }, 5000)
      clearRetryTimeout()
      dispatchAnalytics({ type: 'RESET_CHAT' })
    }
  }

  const handleCancel = () => {
    setTokenUsageWarning('')
    setTokenUsageAlertOpen(false)
    setIsStreaming(false)
    clearRetryTimeout()
  }

  useEffect(() => {
    if (!userStatus) return

    const { usage, limit, model: defaultCourseModel, models: courseModels } = userStatus

    let allowedModels: string[] = []

    if (course && courseModels) {
      allowedModels = courseModels

      if (courseModels.includes(activeModel)) {
        setActiveModel(activeModel)
      } else {
        setActiveModel(defaultCourseModel ?? courseModels[0])
      }
    } else {
      allowedModels = validModels.map((m) => m.name) // [gpt-5, gpt-4o, gpt-4o-mini, mock] 23.7.2025
    }

    // Mock model is only visible to admins in production
    if (!user?.isAdmin && inProduction) {
      allowedModels = allowedModels.filter((model) => model !== 'mock')
    }
    setAllowedModels(allowedModels)

    const tokenUseExceeded = usage >= limit

    if (tokenUseExceeded) {
      setActiveModel(FREE_MODEL)
      return
    }
  }, [userStatus, course])

  const showRagSelector = (ragIndices?.length ?? 0) > 0
  const rightMenuOpen = !!activeToolResult
  const rightMenuWidth = rightMenuOpen ? '300px' : '0px'
  const leftMenuWidth = !isEmbeddedMode ? { md: '250px', lg: '300px' } : { md: '0px', lg: '0px' }

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
    const { startDate, endDate } = course.activityPeriod
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()

    if (now < start) {
      return (
        <Box>
          <ChatInfo course={course} />
          <Alert severity="warning" style={{ marginTop: 20 }}>
            <Typography variant="h6">{t('course:curreNotStarted')}</Typography>
          </Alert>
        </Box>
      )
    }

    if (now > end) {
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
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >
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
              course={course}
              handleReset={handleReset}
              onClose={() => {
                setChatLeftSidePanelOpen(false)
              }}
              t={t}
              setSettingsModalOpen={setSettingsModalOpen}
              setDisclaimerStatus={setDisclaimerStatus}
              showRagSelector={showRagSelector}
              ragIndex={ragIndex}
              setRagIndexId={setRagIndexId}
              ragIndices={ragIndices}
              messages={messages}
              activePrompt={activePrompt}
              setActivePrompt={setActivePrompt}
              currentModel={activeModel}
              setModel={setActiveModel}
              availableModels={allowedModels}
            />
          </Drawer>
        ) : (
          <LeftMenu
            sx={{
              display: { sm: 'none', md: 'flex' },
              position: 'fixed',
              top: 0,
            }}
            course={course}
            handleReset={handleReset}
            t={t}
            setSettingsModalOpen={setSettingsModalOpen}
            setDisclaimerStatus={setDisclaimerStatus}
            showRagSelector={showRagSelector}
            ragIndex={ragIndex}
            setRagIndexId={setRagIndexId}
            ragIndices={ragIndices}
            messages={messages}
            activePrompt={activePrompt}
            setActivePrompt={setActivePrompt}
            currentModel={activeModel}
            setModel={setActiveModel}
            availableModels={allowedModels}
          />
        ))}

      {/* Chat view column ------------------------------------------------------------------------------------------------ */}
      <Box
        ref={chatContainerRef}
        sx={{
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          overflowY: 'visible',
          // Padding for left menu
          marginLeft: leftMenuWidth,
        }}
      >
        <Box
          sx={{
            margin: 'auto',
            overflow: 'hidden',
            overflowY: 'auto',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '1rem',
            width: {
              sm: '100vw',
              md: `calc(100vw - ${leftMenuWidth.md} - ${rightMenuWidth})`,
              lg: `calc(100vw - ${leftMenuWidth.lg} - ${rightMenuWidth})`,
            },
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
            courseName={course && getLanguageValue(course.name, i18n.language)}
            courseDate={course?.activityPeriod}
            conversationRef={conversationRef}
            messages={messages}
            completion={completion}
            isStreaming={isStreaming}
            toolCalls={toolCalls}
            setActiveToolResult={setActiveToolResult}
          />
        </Box>

        <Box
          ref={inputFieldRef}
          sx={{
            width: '100%',
            padding: '1rem 1rem 0rem 1rem',
            position: 'sticky',
            bottom: 0,
            margin: 'auto',
          }}
        >
          <ChatBox
            disabled={isStreaming}
            fileInputRef={fileInputRef}
            fileName={fileName}
            setFileName={setFileName}
            saveConsent={saveConsent}
            setSaveConsent={setSaveConsent}
            setChatLeftSidePanelOpen={setChatLeftSidePanelOpen}
            chatLeftSidePanelOpen={chatLeftSidePanelOpen}
            tokenUsageWarning={tokenUsageWarning}
            tokenUsageAlertOpen={tokenUsageAlertOpen}
            saveChat={!!course && course.saveDiscussions}
            notOptoutSaving={!!course && course.notOptoutSaving}
            handleCancel={handleCancel}
            handleContinue={(newMessage) => handleSubmit(newMessage, true)}
            handleSubmit={(newMessage) => {
              handleSubmit(newMessage, false)
            }}
            handleReset={handleReset}
            isMobile={isMobile}
          />
        </Box>
      </Box>

      {!chatScroll.isAutoScrolling && (
        <Fab sx={{ position: 'fixed', right: 32, bottom: '12rem' }} onClick={() => chatScroll.beginAutoscroll()}>
          <ArrowDownward />
        </Fab>
      )}

      {/* FileSearchResults columns ----------------------------------------------------------------------------------------------------- */}

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
      )}

      {/* Modals --------------------------------------*/}
      <SettingsModal
        open={settingsModalOpen}
        setOpen={setSettingsModalOpen}
        customSystemMessage={customSystemMessage}
        setCustomSystemMessage={setCustomSystemMessage}
        activePrompt={activePrompt}
        setActivePrompt={setActivePrompt}
        modelTemperature={parseFloat(modelTemperature)}
        setModelTemperature={(updatedTemperature) => setModelTemperature(String(updatedTemperature))}
        course={course}
      />

      <DisclaimerModal disclaimer={disclaimerInfo} disclaimerStatus={disclaimerStatus} setDisclaimerStatus={setDisclaimerStatus} />
    </Box>
  )
}

const LeftMenu = ({
  sx = {},
  course,
  handleReset,
  onClose,
  t,
  setSettingsModalOpen,
  setDisclaimerStatus,
  showRagSelector,
  ragIndex,
  setRagIndexId,
  ragIndices,
  messages,
  activePrompt,
  setActivePrompt,
  currentModel,
  setModel,
  availableModels,

}: {
  sx?: object
  course?: Course
  handleReset: () => void
  onClose?: () => void
  t: TFunction
  setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDisclaimerStatus: React.Dispatch<React.SetStateAction<boolean>>
  showRagSelector: boolean
  ragIndex?: RagIndexAttributes
  setRagIndexId: React.Dispatch<React.SetStateAction<number | undefined>>
  ragIndices?: RagIndexAttributes[]
  messages: Message[]
  activePrompt: Prompt | undefined
  setActivePrompt: (prompt: Prompt | undefined) => void

  currentModel: string
  setModel: (model: string) => void
  availableModels: string[]
}) => {
  const { courseId } = useParams()
  const { userStatus, isLoading: statusLoading } = useUserStatus(courseId)
  const [isTokenLimitExceeded, setIsTokenLimitExceeded] = useState<boolean>(false)
  const urlPromptId = useUrlPromptId()
  const { data: myPrompts } = useQuery<Prompt[]>({
    queryKey: ['/prompts/my-prompts'],
    initialData: [],
  })

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
          <ModelSelector
            currentModel={currentModel}
            setModel={setModel}
            availableModels={availableModels}
            isTokenLimitExceeded={isTokenLimitExceeded}
          />
          <PromptSelector
            sx={{ width: '100%' }}
            coursePrompts={course?.prompts ?? []}
            myPrompts={myPrompts}
            activePrompt={activePrompt}
            setActivePrompt={setActivePrompt}
            mandatoryPrompt={course?.prompts.find((p) => p.mandatory)}
            urlPrompt={course?.prompts.find((p) => p.id === urlPromptId)}
          />
          <EmailButton messages={messages} disabled={!messages?.length} />
          <OutlineButtonBlack startIcon={<Tune />} onClick={() => setSettingsModalOpen(true)} data-testid="settings-button">
            {t('chat:settings')}
          </OutlineButtonBlack>
          <OutlineButtonBlack startIcon={<HelpIcon />} onClick={() => setDisclaimerStatus(true)} data-testid="help-button">
            {t('info:title')}
          </OutlineButtonBlack>
          {course && showRagSelector && (
            <>
              <Typography variant="h6" sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }} fontWeight="bold">
                <MenuBookTwoTone />
                {t('chat:sources')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('settings:sourceDescription')}
              </Typography>
              <RagSelector currentRagIndex={ragIndex} setRagIndex={setRagIndexId} ragIndices={ragIndices ?? []} />
            </>
          )}
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
