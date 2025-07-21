import DeleteIcon from '@mui/icons-material/Delete'
import EmailIcon from '@mui/icons-material/Email'
import HelpIcon from '@mui/icons-material/Help'
import SettingsIcon from '@mui/icons-material/Settings'
import { Alert, Box, Tooltip, Typography } from '@mui/material'
import { useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { DEFAULT_ASSISTANT_INSTRUCTIONS, DEFAULT_MODEL, DEFAULT_MODEL_TEMPERATURE, FREE_MODEL, validModels } from '../../../config'
import type { FileSearchCompletedData } from '../../../shared/types'
import { getLanguageValue } from '../../../shared/utils'
import useCourse from '../../hooks/useCourse'
import useInfoTexts from '../../hooks/useInfoTexts'
import useLocalStorageState from '../../hooks/useLocalStorageState'
import { useRagIndices } from '../../hooks/useRagIndices'
import useRetryTimeout from '../../hooks/useRetryTimeout'
import useUserStatus from '../../hooks/useUserStatus'
import type { Message } from '../../types'
import { AppContext } from '../../util/AppContext'
import { ChatBox } from './ChatBox'
import { Conversation } from './Conversation'
import { DisclaimerModal } from './Disclaimer'
import { handleCompletionStreamError } from './error'
import { ChatInfo } from './generics/ChatInfo'
import RagSelector from './RagSelector'
import { SettingsModal } from './SettingsModal'
import { getCompletionStream } from './util'
import { OutlineButtonBlack } from './generics/Buttons'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useChatStream } from './useChatStream'
import Annotations from './Annotations'

export const ChatV2 = () => {
  const { courseId } = useParams()

  const { data: course } = useCourse(courseId)

  const { ragIndices } = useRagIndices(courseId)
  const { infoTexts } = useInfoTexts()

  const { userStatus, isLoading: statusLoading, refetch: refetchStatus } = useUserStatus(courseId)

  const { user } = useCurrentUser()

  // local storage states
  const localStoragePrefix = courseId ? `course-${courseId}` : 'general'
  const [activeModel, setActiveModel] = useLocalStorageState<{ name: string }>('model-v2', {
    name: DEFAULT_MODEL,
  })
  const [disclaimerStatus, setDisclaimerStatus] = useLocalStorageState<{
    open: boolean
  }>('disclaimer-status', { open: true })
  const [assistantInstructions, setAssistantInstructions] = useLocalStorageState<{ content: string }>(`${localStoragePrefix}-chat-instructions`, {
    content: DEFAULT_ASSISTANT_INSTRUCTIONS,
  })
  const [modelTemperature, setModelTemperature] = useLocalStorageState<{
    value: number
  }>(`${localStoragePrefix}-chat-model-temperature`, {
    value: DEFAULT_MODEL_TEMPERATURE,
  })

  const [messages, setMessages] = useLocalStorageState(`${localStoragePrefix}-chat-messages`, [] as Message[])
  const [prevResponse, setPrevResponse] = useLocalStorageState(`${localStoragePrefix}-prev-response`, { id: '' })

  // App States
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')
  const [tokenUsageWarning, setTokenUsageWarning] = useState<string>('')
  const [tokenUsageAlertOpen, setTokenUsageAlertOpen] = useState<boolean>(false)
  const [allowedModels, setAllowedModels] = useState<string[]>([])
  const [saveConsent, setSaveConsent] = useState<boolean>(false)
  const [showAnnotations, setShowAnnotations] = useState<boolean>(false)

  // RAG states
  const [ragIndexId, setRagIndexId] = useState<number | undefined>()
  const [activeFileSearchResult, setActiveFileSearchResult] = useState<FileSearchCompletedData | undefined>()
  const ragIndex = ragIndices?.find((index) => index.id === ragIndexId)

  // Refs
  const appContainerRef = useContext(AppContext)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const conversationRef = useRef<HTMLElement | null>(null)
  const inputFieldRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [setRetryTimeout, clearRetryTimeout] = useRetryTimeout()

  const { t, i18n } = useTranslation()

  const disclaimerInfo = infoTexts?.find((infoText) => infoText.name === 'disclaimer')?.text[i18n.language] ?? null

  const { processStream, completion, isStreaming, setIsStreaming, isFileSearching, streamController } = useChatStream({
    onComplete: ({ message, previousResponseId }) => {
      if (previousResponseId) {
        setPrevResponse({ id: previousResponseId })
      }
      if (message.content.length > 0) {
        setMessages((prev: Message[]) => prev.concat(message))
        refetchStatus()
      }
    },
    onError: (error) => {
      handleCompletionStreamError(error, fileName)
    },
    onFileSearchComplete: (fileSearch) => {
      setActiveFileSearchResult(fileSearch)
      setShowAnnotations(true)
    },
  })

  const handleSubmit = async (message: string, ignoreTokenUsageWarning: boolean) => {
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
    setPrevResponse({ id: '' })
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

    try {
      const { tokenUsageAnalysis, stream } = await getCompletionStream({
        assistantInstructions: assistantInstructions.content,
        messages: newMessages,
        ragIndexId,
        model: activeModel.name,
        formData,
        modelTemperature: modelTemperature.value,
        courseId,
        abortController: streamController,
        saveConsent,
        prevResponseId: prevResponse.id,
      })

      if (!stream) {
        console.error('Stream is undefined')
        handleCancel()
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
    if (window.confirm('Are you sure you want to empty this conversation?')) {
      setMessages([])
      setShowAnnotations(false)
      setPrevResponse({ id: '' })
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
    }
  }

  const handleCancel = () => {
    setTokenUsageWarning('')
    setTokenUsageAlertOpen(false)
    setIsStreaming(false)
    clearRetryTimeout()
  }

  useEffect(() => {
    // Scrolls to bottom on initial load only
    if (!appContainerRef?.current || !conversationRef.current || messages.length === 0) return
    if (!isStreaming) {
      const container = appContainerRef?.current
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'instant',
        })
      }
    }
  }, [])

  useEffect(() => {
    // Scrolls to last assistant message on text generation
    if (!appContainerRef?.current || !conversationRef.current || messages.length === 0) return

    const lastNode = conversationRef.current.lastElementChild as HTMLElement

    if (lastNode.classList.contains('message-role-assistant') && isStreaming) {
      const container = appContainerRef.current

      const containerRect = container.getBoundingClientRect()
      const lastNodeRect = lastNode.getBoundingClientRect()

      const scrollTopPadding = 200
      const scrollOffset = lastNodeRect.top - containerRect.top + container.scrollTop - scrollTopPadding

      container.scrollTo({
        top: scrollOffset,
        behavior: 'smooth',
      })
    }
  }, [isStreaming])

  useEffect(() => {
    if (!userStatus) return

    const { usage, limit, model: defaultCourseModel, models: courseModels } = userStatus

    if (course && courseModels) {
      setAllowedModels(courseModels)

      if (courseModels.includes(activeModel.name)) {
        setActiveModel({ name: activeModel.name })
      } else {
        setActiveModel({ name: defaultCourseModel ?? courseModels[0] })
      }
    } else {
      const allowedModels = validModels.map((m) => m.name) // [gpt-4.1, gpt-4o, gpt-4o-mini] 25.6.2025
      setAllowedModels(allowedModels)
    }

    const tokenUseExceeded = usage >= limit

    if (tokenUseExceeded) {
      setActiveModel({ name: FREE_MODEL })
      return
    }
  }, [userStatus, course])

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

  const showRagSelector = (ragIndices?.length ?? 0) > 0

  if (statusLoading) return null

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >
      {/* Chat side panel column -------------------------------------------------------------------------------------------*/}
      <Box
        sx={{
          flex: 1,
          minWidth: 300,
          position: 'relative',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        }}
      >
        <Box sx={{ position: 'sticky', top: 70, padding: '2rem 1.5rem' }}>
          {course && <ChatInfo course={course} />}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', mb: '2rem' }}>
            <OutlineButtonBlack startIcon={<DeleteIcon />} onClick={handleReset} id="empty-conversation-button">
              {t('chat:emptyConversation')}
            </OutlineButtonBlack>
            <Tooltip
              title={
                <Typography variant="body2" sx={{ p: 0.5 }}>
                  {t('info:email', { email: user?.email })}
                </Typography>
              }
              arrow
              placement="right"
            >
              <OutlineButtonBlack startIcon={<EmailIcon />} onClick={() => alert('Not yet supported')}>
                {t('email:save')}
              </OutlineButtonBlack>
            </Tooltip>
            <OutlineButtonBlack startIcon={<SettingsIcon />} onClick={() => setSettingsModalOpen(true)} id="settings-button">
              {t('chat:settings')}
            </OutlineButtonBlack>
            <OutlineButtonBlack startIcon={<HelpIcon />} onClick={() => setDisclaimerStatus({ open: true })} id="help-button">
              {t('info:title')}
            </OutlineButtonBlack>
          </Box>
          {course && showRagSelector && (
            <>
              <Typography variant="h6" mb={'0.5rem'} fontWeight="bold">
                {t('settings:courseMaterials')}
              </Typography>
              <RagSelector currentRagIndex={ragIndex} setRagIndex={setRagIndexId} ragIndices={ragIndices ?? []} />
            </>
          )}
        </Box>
      </Box>

      {/* Chat view column ------------------------------------------------------------------------------------------------ */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 3,
          minWidth: 800,
          width: '100%',
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '80%',
            maxWidth: '80%',
            margin: 'auto',
            paddingTop: '1rem',
            paddingBottom: '8rem',
            overflowY: 'visible',
          }}
        >
          <Alert severity="info">{t('chat:testUseInfo')}</Alert>
          <Conversation
            courseName={course && getLanguageValue(course.name, i18n.language)}
            courseDate={course?.activityPeriod}
            conversationRef={conversationRef}
            expandedNodeHeight={window.innerHeight - (inputFieldRef.current?.clientHeight ?? 0) - 300}
            messages={messages}
            completion={completion}
            isStreaming={isStreaming}
            isFileSearching={isFileSearching}
            setActiveFileSearchResult={setActiveFileSearchResult}
            setShowAnnotations={setShowAnnotations}
          />
        </Box>

        <Box
          ref={inputFieldRef}
          sx={{
            position: 'sticky',
            bottom: 0,
            width: '80%',
            minWidth: 750,
            margin: 'auto',
          }}
        >
          <ChatBox
            disabled={isStreaming}
            currentModel={activeModel.name}
            availableModels={allowedModels}
            fileInputRef={fileInputRef}
            fileName={fileName}
            setFileName={setFileName}
            saveConsent={saveConsent}
            setSaveConsent={setSaveConsent}
            tokenUsageWarning={tokenUsageWarning}
            tokenUsageAlertOpen={tokenUsageAlertOpen}
            saveChat={!!course && course.saveDiscussions}
            notOptoutSaving={!!course && course.notOptoutSaving}
            setModel={(name) => setActiveModel({ name })}
            handleCancel={handleCancel}
            handleContinue={(newMessage) => handleSubmit(newMessage, true)}
            handleSubmit={(newMessage) => handleSubmit(newMessage, false)}
          />
        </Box>
      </Box>

      {/* Annotations columns ----------------------------------------------------------------------------------------------------- */}

      <Box
        sx={{
          flex: 1,
          minWidth: 300,
          position: 'relative',
          transition: 'border 300ms',
          borderLeft: '1px solid',
          borderColor: showAnnotations ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0)',
        }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 65,
            padding: '2rem',
            transition: 'transform 250ms ease-in-out',
            transform: showAnnotations ? 'translateX(0%)' : 'translate(100%)',
          }}
        >
          {activeFileSearchResult && <Annotations fileSearchResult={activeFileSearchResult} setShowAnnotations={setShowAnnotations} />}
        </Box>
      </Box>

      {/* Modals --------------------------------------*/}
      <SettingsModal
        open={settingsModalOpen}
        setOpen={setSettingsModalOpen}
        assistantInstructions={assistantInstructions.content}
        setAssistantInstructions={(updatedInstructions) => setAssistantInstructions({ content: updatedInstructions })}
        modelTemperature={modelTemperature.value}
        setModelTemperature={(updatedTemperature) => setModelTemperature({ value: updatedTemperature })}
        model={activeModel.name}
        setModel={(name) => setActiveModel({ name })}
        showRagSelector={showRagSelector}
        setRagIndex={setRagIndexId}
        ragIndices={ragIndices}
        currentRagIndex={ragIndex}
        course={course}
      />

      <DisclaimerModal disclaimer={disclaimerInfo} disclaimerStatus={disclaimerStatus} setDisclaimerStatus={setDisclaimerStatus} />
    </Box>
  )
}
